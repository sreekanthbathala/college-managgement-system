import os
import time
from collections import defaultdict
from datetime import date, datetime
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field

# Ensure Django is initialized before importing models
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "college.settings")
django.setup()

from django.contrib.auth import authenticate, get_user_model
from django.db import IntegrityError
from django.core.mail import send_mail
from django.conf import settings

from rest_framework.authtoken.models import Token
from core.models import (
    SessionYear, Course, Subject, CustomeUser, 
    AdminProfile, StaffProfile, StudentProfile, 
    Attendance, AttendanceReport, Result
)

# API Router
router = APIRouter()

# -------------------------------------------------------------
# PYDANTIC SCHEMAS
# -------------------------------------------------------------

class LoginRequest(BaseModel):
    username: str
    password: str

class SignupRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    user_type: int  # 2 for Staff, 3 for Student
    reg_no: str | None = None
    course: int | None = None
    session_year: int | None = None
    gender: str | None = "Other"

class SessionYearCreateUpdate(BaseModel):
    session_start_year: date
    session_end_year: date

class CourseCreateUpdate(BaseModel):
    course_name: str

class SubjectCreateUpdate(BaseModel):
    subject_name: str
    course: int
    staff: int

class StaffUserSchema(BaseModel):
    username: str
    email: EmailStr
    first_name: str | None = ""
    last_name: str | None = ""
    password: str | None = None

class StaffCreateUpdate(BaseModel):
    user: StaffUserSchema
    additional_info: str | None = None

class StudentUserSchema(BaseModel):
    username: str
    email: EmailStr
    first_name: str | None = ""
    last_name: str | None = ""
    password: str | None = None

class StudentCreateUpdate(BaseModel):
    user: StudentUserSchema
    Registration_number: str
    gender: str
    course: int | None = None
    session_year: int | None = None

class AttendanceSaveRequest(BaseModel):
    subject: int
    session_year: int
    attendance_date: date
    student_status: List[int]  # List of StudentProfile IDs

class MarksSaveRequest(BaseModel):
    subject: int
    session_year: int
    marks_data: Dict[str, str | float | None]  # map of student_profile_id -> marks

# -------------------------------------------------------------
# SERIALIZATION HELPERS
# -------------------------------------------------------------

def serialize_user(user) -> Dict[str, Any] | None:
    if not user:
        return None
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "user_type": user.user_type,
        "user_type_display": user.get_user_type_display()
    }

def serialize_session(session) -> Dict[str, Any] | None:
    if not session:
        return None
    return {
        "id": session.id,
        "session_start_year": session.session_start_year.isoformat() if session.session_start_year else None,
        "session_end_year": session.session_end_year.isoformat() if session.session_end_year else None,
        "display_name": f"{session.session_start_year} to {session.session_end_year}"
    }

def serialize_course(course) -> Dict[str, Any] | None:
    if not course:
        return None
    return {
        "id": course.id,
        "course_name": course.course_name,
        "created_at": course.created_at.isoformat() if course.created_at else None,
        "updated_at": course.updated_at.isoformat() if course.updated_at else None,
    }

def serialize_subject(subject) -> Dict[str, Any] | None:
    if not subject:
        return None
    return {
        "id": subject.id,
        "subject_name": subject.subject_name,
        "course": subject.course_id,
        "course_detail": serialize_course(subject.course),
        "staff": subject.staff_id,
        "staff_detail": serialize_user(subject.staff),
        "created_at": subject.created_at.isoformat() if subject.created_at else None,
        "updated_at": subject.updated_at.isoformat() if subject.updated_at else None,
    }

def serialize_staff(staff_profile) -> Dict[str, Any] | None:
    if not staff_profile:
        return None
    return {
        "id": staff_profile.id,
        "user": serialize_user(staff_profile.user),
        "additional_info": staff_profile.additional_info,
        "created_at": staff_profile.created_at.isoformat() if staff_profile.created_at else None,
        "updated_at": staff_profile.updated_at.isoformat() if staff_profile.updated_at else None,
    }

def serialize_student(student_profile) -> Dict[str, Any] | None:
    if not student_profile:
        return None
    return {
        "id": student_profile.id,
        "user": serialize_user(student_profile.user),
        "Registration_number": student_profile.Registration_number,
        "gender": student_profile.gender,
        "course": student_profile.course_id,
        "course_detail": serialize_course(student_profile.course),
        "session_year": student_profile.session_year_id,
        "session_year_detail": serialize_session(student_profile.session_year),
        "created_at": student_profile.created_at.isoformat() if student_profile.created_at else None,
        "updated_at": student_profile.updated_at.isoformat() if student_profile.updated_at else None,
    }

# -------------------------------------------------------------
# AUTHENTICATION & PERMISSION DEPENDENCIES
# -------------------------------------------------------------

def get_token_key(request: Request) -> str | None:
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None
    parts = auth_header.split()
    if len(parts) == 2 and parts[0].lower() == "token":
        return parts[1]
    return None

def get_current_user(request: Request) -> CustomeUser:
    token_key = get_token_key(request)
    if not token_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided."
        )
    try:
        token = Token.objects.select_related('user').get(key=token_key)
        return token.user
    except Token.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token."
        )

def get_current_admin(current_user: CustomeUser = Depends(get_current_user)) -> CustomeUser:
    if current_user.user_type != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action."
        )
    return current_user

def get_current_staff(current_user: CustomeUser = Depends(get_current_user)) -> CustomeUser:
    if current_user.user_type != 2:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action."
        )
    return current_user

def get_current_student(current_user: CustomeUser = Depends(get_current_user)) -> CustomeUser:
    if current_user.user_type != 3:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action."
        )
    return current_user

# -------------------------------------------------------------
# RATE LIMITER
# -------------------------------------------------------------

login_attempts = defaultdict(list)

def check_login_rate_limit(request: Request):
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    login_attempts[ip] = [t for t in login_attempts[ip] if now - t < 60]
    if len(login_attempts[ip]) >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Request limit exceeded. Try again later."
        )
    login_attempts[ip].append(now)

# -------------------------------------------------------------
# AUTHENTICATION ROUTE HANDLERS
# -------------------------------------------------------------

@router.post("/auth/login/")
def login(data: LoginRequest, request: Request):
    # Apply Rate Limit
    check_login_rate_limit(request)
    
    user = authenticate(username=data.username, password=data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to log in with provided credentials."
        )
    
    token, _ = Token.objects.get_or_create(user=user)
    
    profile_id = None
    if user.user_type == 2:
        profile = StaffProfile.objects.filter(user=user).first()
        if profile:
            profile_id = profile.id
    elif user.user_type == 3:
        profile = StudentProfile.objects.filter(user=user).first()
        if profile:
            profile_id = profile.id

    return {
        "token": token.key,
        "user_id": user.pk,
        "username": user.username,
        "email": user.email,
        "user_type": user.user_type,
        "user_type_display": user.get_user_type_display(),
        "first_name": user.first_name,
        "last_name": user.last_name,
        "profile_id": profile_id
    }

@router.post("/auth/signup/", status_code=status.HTTP_201_CREATED)
def signup(data: SignupRequest):
    if not data.username or not data.email or not data.password or not data.user_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username, email, password, and user_type are required fields."
        )

    if data.user_type not in [2, 3]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user_type. Only Staff (2) or Student (3) accounts can sign up."
        )

    # Student specific checks
    if data.user_type == 3:
        if not data.reg_no:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration number is required for student accounts."
            )
        if StudentProfile.objects.filter(Registration_number=data.reg_no).exists():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration number is already in use."
            )

    if CustomeUser.objects.filter(username=data.username).exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is already taken."
        )
    if CustomeUser.objects.filter(email=data.email).exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    try:
        # Create User
        user = CustomeUser.objects.create_user(
            username=data.username,
            email=data.email,
            password=data.password,
            user_type=data.user_type
        )

        # Profile details
        if data.user_type == 3:
            course = Course.objects.filter(id=data.course).first() if data.course else None
            session_year = SessionYear.objects.filter(id=data.session_year).first() if data.session_year else None
            StudentProfile.objects.create(
                user=user,
                Registration_number=data.reg_no,
                gender=data.gender or "Other",
                course=course,
                session_year=session_year
            )
        elif data.user_type == 2:
            StaffProfile.objects.create(user=user)

        token, _ = Token.objects.get_or_create(user=user)

        # Send welcome email
        try:
            send_mail(
                subject="Welcome to Excel University CMS!",
                message=f"Hello {user.username},\n\nYour profile has been created successfully as a {user.get_user_type_display()}.\n\nBest regards,\nAdministration Office",
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[user.email],
                fail_silently=True
            )
        except Exception as mail_err:
            print(f"Failed to send welcome email: {mail_err}")

        return {
            "message": "Signup successful!",
            "token": token.key,
            "user_type": user.user_type
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )

@router.get("/auth/user/")
def get_user(current_user: CustomeUser = Depends(get_current_user)):
    profile_data = None
    if current_user.user_type == 2:
        profile = StaffProfile.objects.filter(user=current_user).first()
        if profile:
            profile_data = {
                "profile_id": profile.id,
                "additional_info": profile.additional_info
            }
    elif current_user.user_type == 3:
        profile = StudentProfile.objects.filter(user=current_user).first()
        if profile:
            profile_data = {
                "profile_id": profile.id,
                "Registration_number": profile.Registration_number,
                "gender": profile.gender,
                "course_name": profile.course.course_name if profile.course else "Not Enrolled",
                "session_year_name": str(profile.session_year) if profile.session_year else "N/A"
            }

    return {
        "user": serialize_user(current_user),
        "profile": profile_data
    }

# -------------------------------------------------------------
# DASHBOARD STATS ROUTE HANDLER
# -------------------------------------------------------------

@router.get("/dashboard/stats/")
def get_dashboard_stats(current_user: CustomeUser = Depends(get_current_user)):
    if current_user.user_type == 1:
        # Admin
        recent_courses = Course.objects.all().order_by('-created_at')[:5]
        recent_staff = StaffProfile.objects.all().order_by('-created_at')[:5]
        recent_students = StudentProfile.objects.all().order_by('-created_at')[:5]

        return {
            "role": "admin",
            "counts": {
                "courses": Course.objects.count(),
                "staff": StaffProfile.objects.count(),
                "students": StudentProfile.objects.count(),
                "subjects": Subject.objects.count(),
                "sessions": SessionYear.objects.count(),
            },
            "recents": {
                "courses": [serialize_course(c) for c in recent_courses],
                "staff": [serialize_staff(s) for s in recent_staff],
                "students": [serialize_student(s) for s in recent_students],
            }
        }
        
    elif current_user.user_type == 2:
        # Staff
        assigned_subjects = Subject.objects.filter(staff=current_user)
        attendance_count = Attendance.objects.filter(subject__staff=current_user).count()
        results_count = Result.objects.filter(subject__staff=current_user).count()

        return {
            "role": "staff",
            "counts": {
                "subjects": assigned_subjects.count(),
                "attendance": attendance_count,
                "results": results_count
            },
            "subjects": [serialize_subject(s) for s in assigned_subjects]
        }
        
    elif current_user.user_type == 3:
        # Student
        student_profile = StudentProfile.objects.filter(user=current_user).first()
        if not student_profile:
            raise HTTPException(status_code=404, detail="Student profile not found")

        course = student_profile.course
        session_year = student_profile.session_year
        
        subjects_stats = []
        total_held = 0
        total_attended = 0
        
        if course and session_year:
            subjects = Subject.objects.filter(course=course)
            for subject in subjects:
                held = Attendance.objects.filter(subject=subject, session_year=session_year).count()
                attended = AttendanceReport.objects.filter(
                    attendance__subject=subject,
                    attendance__session_year=session_year,
                    student=student_profile,
                    status=True
                ).count()
                
                percentage = (attended / held * 100) if held > 0 else 0.0
                total_held += held
                total_attended += attended
                
                result_obj = Result.objects.filter(
                    student=student_profile,
                    subject=subject,
                    session_year=session_year
                ).first()
                marks = result_obj.marks_obtained if result_obj else None
                
                subjects_stats.append({
                    "subject_id": subject.id,
                    "subject_name": subject.subject_name,
                    "held": held,
                    "attended": attended,
                    "percentage": round(percentage, 1),
                    "marks": marks
                })
                
        overall_percentage = (total_attended / total_held * 100) if total_held > 0 else 100.0
        
        return {
            "role": "student",
            "registration_number": student_profile.Registration_number,
            "gender": student_profile.gender,
            "course_name": course.course_name if course else "N/A",
            "session_year_name": str(session_year) if session_year else "N/A",
            "counts": {
                "total_held": total_held,
                "total_attended": total_attended,
                "overall_percentage": round(overall_percentage, 1),
            },
            "subjects_stats": subjects_stats
        }

    raise HTTPException(status_code=400, detail="Unknown user role")

# -------------------------------------------------------------
# CRUD ROUTER FOR SESSIONS
# -------------------------------------------------------------

@router.get("/sessions/")
def list_sessions(current_user: CustomeUser = Depends(get_current_user)):
    sessions = SessionYear.objects.all().order_by('-session_start_year')
    return [serialize_session(s) for s in sessions]

@router.post("/sessions/", status_code=status.HTTP_201_CREATED)
def create_session(data: SessionYearCreateUpdate, current_user: CustomeUser = Depends(get_current_admin)):
    session = SessionYear.objects.create(
        session_start_year=data.session_start_year,
        session_end_year=data.session_end_year
    )
    return serialize_session(session)

@router.get("/sessions/{id}/")
def get_session(id: int, current_user: CustomeUser = Depends(get_current_user)):
    try:
        session = SessionYear.objects.get(id=id)
        return serialize_session(session)
    except SessionYear.DoesNotExist:
        raise HTTPException(status_code=404, detail="Session not found")

@router.put("/sessions/{id}/")
def update_session(id: int, data: SessionYearCreateUpdate, current_user: CustomeUser = Depends(get_current_admin)):
    try:
        session = SessionYear.objects.get(id=id)
        session.session_start_year = data.session_start_year
        session.session_end_year = data.session_end_year
        session.save()
        return serialize_session(session)
    except SessionYear.DoesNotExist:
        raise HTTPException(status_code=404, detail="Session not found")

@router.delete("/sessions/{id}/", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(id: int, current_user: CustomeUser = Depends(get_current_admin)):
    try:
        session = SessionYear.objects.get(id=id)
        session.delete()
        return None
    except SessionYear.DoesNotExist:
        raise HTTPException(status_code=404, detail="Session not found")

# -------------------------------------------------------------
# CRUD ROUTER FOR COURSES
# -------------------------------------------------------------

@router.get("/courses/")
def list_courses(current_user: CustomeUser = Depends(get_current_user)):
    courses = Course.objects.all().order_by('course_name')
    return [serialize_course(c) for c in courses]

@router.post("/courses/", status_code=status.HTTP_201_CREATED)
def create_course(data: CourseCreateUpdate, current_user: CustomeUser = Depends(get_current_admin)):
    course = Course.objects.create(course_name=data.course_name)
    return serialize_course(course)

@router.get("/courses/{id}/")
def get_course(id: int, current_user: CustomeUser = Depends(get_current_user)):
    try:
        course = Course.objects.get(id=id)
        return serialize_course(course)
    except Course.DoesNotExist:
        raise HTTPException(status_code=404, detail="Course not found")

@router.put("/courses/{id}/")
def update_course(id: int, data: CourseCreateUpdate, current_user: CustomeUser = Depends(get_current_admin)):
    try:
        course = Course.objects.get(id=id)
        course.course_name = data.course_name
        course.save()
        return serialize_course(course)
    except Course.DoesNotExist:
        raise HTTPException(status_code=404, detail="Course not found")

@router.delete("/courses/{id}/", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(id: int, current_user: CustomeUser = Depends(get_current_admin)):
    try:
        course = Course.objects.get(id=id)
        course.delete()
        return None
    except Course.DoesNotExist:
        raise HTTPException(status_code=404, detail="Course not found")

# -------------------------------------------------------------
# CRUD ROUTER FOR SUBJECTS
# -------------------------------------------------------------

@router.get("/subjects/")
def list_subjects(current_user: CustomeUser = Depends(get_current_user)):
    subjects = Subject.objects.all().order_by('subject_name')
    return [serialize_subject(s) for s in subjects]

@router.post("/subjects/", status_code=status.HTTP_201_CREATED)
def create_subject(data: SubjectCreateUpdate, current_user: CustomeUser = Depends(get_current_admin)):
    try:
        course = Course.objects.get(id=data.course)
        staff = CustomeUser.objects.get(id=data.staff, user_type=2)
        subject = Subject.objects.create(
            subject_name=data.subject_name,
            course=course,
            staff=staff
        )
        return serialize_subject(subject)
    except (Course.DoesNotExist, CustomeUser.DoesNotExist):
        raise HTTPException(status_code=400, detail="Invalid course or staff ID.")

@router.get("/subjects/{id}/")
def get_subject(id: int, current_user: CustomeUser = Depends(get_current_user)):
    try:
        subject = Subject.objects.get(id=id)
        return serialize_subject(subject)
    except Subject.DoesNotExist:
        raise HTTPException(status_code=404, detail="Subject not found")

@router.put("/subjects/{id}/")
def update_subject(id: int, data: SubjectCreateUpdate, current_user: CustomeUser = Depends(get_current_admin)):
    try:
        subject = Subject.objects.get(id=id)
        course = Course.objects.get(id=data.course)
        staff = CustomeUser.objects.get(id=data.staff, user_type=2)
        
        subject.subject_name = data.subject_name
        subject.course = course
        subject.staff = staff
        subject.save()
        return serialize_subject(subject)
    except Subject.DoesNotExist:
        raise HTTPException(status_code=404, detail="Subject not found")
    except (Course.DoesNotExist, CustomeUser.DoesNotExist):
        raise HTTPException(status_code=400, detail="Invalid course or staff ID.")

@router.delete("/subjects/{id}/", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(id: int, current_user: CustomeUser = Depends(get_current_admin)):
    try:
        subject = Subject.objects.get(id=id)
        subject.delete()
        return None
    except Subject.DoesNotExist:
        raise HTTPException(status_code=404, detail="Subject not found")

# -------------------------------------------------------------
# CRUD ROUTER FOR STAFF PROFILES
# -------------------------------------------------------------

@router.get("/staff/")
def list_staff(current_user: CustomeUser = Depends(get_current_user)):
    staff = StaffProfile.objects.all().order_by('user__username')
    return [serialize_staff(s) for s in staff]

@router.post("/staff/", status_code=status.HTTP_201_CREATED)
def create_staff(data: StaffCreateUpdate, current_user: CustomeUser = Depends(get_current_admin)):
    # Check uniqueness
    if CustomeUser.objects.filter(username=data.user.username).exists():
        raise HTTPException(status_code=400, detail="Username already exists")
    if CustomeUser.objects.filter(email=data.user.email).exists():
        raise HTTPException(status_code=400, detail="Email already exists")

    try:
        user = CustomeUser.objects.create_user(
            username=data.user.username,
            email=data.user.email,
            password=data.user.password or "temporary_pass123",
            first_name=data.user.first_name or "",
            last_name=data.user.last_name or "",
            user_type=2
        )
        staff = StaffProfile.objects.create(
            user=user,
            additional_info=data.additional_info
        )
        return serialize_staff(staff)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/staff/{id}/")
def get_staff(id: int, current_user: CustomeUser = Depends(get_current_user)):
    try:
        staff = StaffProfile.objects.get(id=id)
        return serialize_staff(staff)
    except StaffProfile.DoesNotExist:
        raise HTTPException(status_code=404, detail="Staff not found")

@router.put("/staff/{id}/")
def update_staff(id: int, data: StaffCreateUpdate, current_user: CustomeUser = Depends(get_current_admin)):
    try:
        staff = StaffProfile.objects.get(id=id)
        user = staff.user
        
        # Update user fields
        user.email = data.user.email
        user.first_name = data.user.first_name or ""
        user.last_name = data.user.last_name or ""
        if data.user.password:
            user.set_password(data.user.password)
        user.save()
        
        staff.additional_info = data.additional_info
        staff.save()
        return serialize_staff(staff)
    except StaffProfile.DoesNotExist:
        raise HTTPException(status_code=404, detail="Staff not found")

@router.delete("/staff/{id}/", status_code=status.HTTP_200_OK)
def delete_staff(id: int, current_user: CustomeUser = Depends(get_current_admin)):
    try:
        staff = StaffProfile.objects.get(id=id)
        user = staff.user
        staff.delete()
        user.delete()
        return {"message": "Staff deleted successfully"}
    except StaffProfile.DoesNotExist:
        raise HTTPException(status_code=404, detail="Staff not found")

# -------------------------------------------------------------
# CRUD ROUTER FOR STUDENT PROFILES
# -------------------------------------------------------------

@router.get("/students/")
def list_students(current_user: CustomeUser = Depends(get_current_user)):
    students = StudentProfile.objects.all().order_by('Registration_number')
    return [serialize_student(s) for s in students]

@router.post("/students/", status_code=status.HTTP_201_CREATED)
def create_student(data: StudentCreateUpdate, current_user: CustomeUser = Depends(get_current_admin)):
    # Check registration number uniqueness
    if StudentProfile.objects.filter(Registration_number=data.Registration_number).exists():
        raise HTTPException(status_code=400, detail="Registration number is already in use.")
        
    if CustomeUser.objects.filter(username=data.user.username).exists():
        raise HTTPException(status_code=400, detail="Username already exists")
    if CustomeUser.objects.filter(email=data.user.email).exists():
        raise HTTPException(status_code=400, detail="Email already exists")

    try:
        user = CustomeUser.objects.create_user(
            username=data.user.username,
            email=data.user.email,
            password=data.user.password or "temporary_pass123",
            first_name=data.user.first_name or "",
            last_name=data.user.last_name or "",
            user_type=3
        )
        course = Course.objects.filter(id=data.course).first() if data.course else None
        session = SessionYear.objects.filter(id=data.session_year).first() if data.session_year else None
        
        student = StudentProfile.objects.create(
            user=user,
            Registration_number=data.Registration_number,
            gender=data.gender,
            course=course,
            session_year=session
        )
        return serialize_student(student)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/students/{id}/")
def get_student(id: int, current_user: CustomeUser = Depends(get_current_user)):
    try:
        student = StudentProfile.objects.get(id=id)
        return serialize_student(student)
    except StudentProfile.DoesNotExist:
        raise HTTPException(status_code=404, detail="Student not found")

@router.put("/students/{id}/")
def update_student(id: int, data: StudentCreateUpdate, current_user: CustomeUser = Depends(get_current_admin)):
    try:
        student = StudentProfile.objects.get(id=id)
        user = student.user
        
        # Check registration number uniqueness if changing
        if StudentProfile.objects.filter(Registration_number=data.Registration_number).exclude(id=id).exists():
            raise HTTPException(status_code=400, detail="Registration number is already in use.")

        user.email = data.user.email
        user.first_name = data.user.first_name or ""
        user.last_name = data.user.last_name or ""
        if data.user.password:
            user.set_password(data.user.password)
        user.save()

        course = Course.objects.filter(id=data.course).first() if data.course else None
        session = SessionYear.objects.filter(id=data.session_year).first() if data.session_year else None
        
        student.Registration_number = data.Registration_number
        student.gender = data.gender
        student.course = course
        student.session_year = session
        student.save()
        return serialize_student(student)
    except StudentProfile.DoesNotExist:
        raise HTTPException(status_code=404, detail="Student not found")

@router.delete("/students/{id}/", status_code=status.HTTP_200_OK)
def delete_student(id: int, current_user: CustomeUser = Depends(get_current_admin)):
    try:
        student = StudentProfile.objects.get(id=id)
        user = student.user
        student.delete()
        user.delete()
        return {"message": "Student deleted successfully"}
    except StudentProfile.DoesNotExist:
        raise HTTPException(status_code=404, detail="Student not found")

# -------------------------------------------------------------
# FACULTY OPERATIONS
# -------------------------------------------------------------

@router.get("/attendance/students/")
def get_attendance_students(
    subject: int, 
    session_year: int, 
    attendance_date: date | None = None, 
    current_user: CustomeUser = Depends(get_current_staff)
):
    try:
        subj = Subject.objects.get(id=subject, staff=current_user)
        session = SessionYear.objects.get(id=session_year)
    except (Subject.DoesNotExist, SessionYear.DoesNotExist):
        raise HTTPException(status_code=404, detail="No matching Subject or Session Year found.")

    students = StudentProfile.objects.filter(
        course=subj.course,
        session_year=session
    ).order_by('user__first_name', 'user__last_name')

    already_logged = False
    present_student_ids = []
    if attendance_date:
        attendance_obj = Attendance.objects.filter(
            subject=subj,
            session_year=session,
            date=attendance_date
        ).first()
        if attendance_obj:
            already_logged = True
            present_student_ids = list(AttendanceReport.objects.filter(
                attendance=attendance_obj,
                status=True
            ).values_list('student_id', flat=True))

    students_serialized = [serialize_student(s) for s in students]
    for s in students_serialized:
        s['is_present'] = s['id'] in present_student_ids

    return {
        "students": students_serialized,
        "already_logged": already_logged,
        "attendance_date": attendance_date.isoformat() if attendance_date else None
    }

@router.post("/attendance/save/", status_code=status.HTTP_201_CREATED)
def save_attendance(data: AttendanceSaveRequest, current_user: CustomeUser = Depends(get_current_staff)):
    try:
        subj = Subject.objects.get(id=data.subject, staff=current_user)
        session = SessionYear.objects.get(id=data.session_year)
        
        attendance_obj, created = Attendance.objects.get_or_create(
            subject=subj,
            session_year=session,
            date=data.attendance_date
        )
        
        if not created:
            AttendanceReport.objects.filter(attendance=attendance_obj).delete()
            
        all_students = StudentProfile.objects.filter(
            course=subj.course,
            session_year=session
        )
        
        present_student_ids = [int(sid) for sid in data.student_status]
        
        for student in all_students:
            is_present = student.id in present_student_ids
            AttendanceReport.objects.create(
                attendance=attendance_obj,
                student=student,
                status=is_present
            )
            
        return {
            "message": f"Attendance logged successfully! Added attendance record ID: {attendance_obj.id}"
        }
    except (Subject.DoesNotExist, SessionYear.DoesNotExist) as e:
        raise HTTPException(status_code=400, detail="Invalid Subject or Session Year.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save attendance: {str(e)}")

@router.get("/marks/students/")
def get_marks_students(subject: int, session_year: int, current_user: CustomeUser = Depends(get_current_staff)):
    try:
        subj = Subject.objects.get(id=subject, staff=current_user)
        session = SessionYear.objects.get(id=session_year)
    except (Subject.DoesNotExist, SessionYear.DoesNotExist):
        raise HTTPException(status_code=404, detail="No matching Subject or Session Year found.")

    students = StudentProfile.objects.filter(
        course=subj.course,
        session_year=session
    ).order_by('user__first_name', 'user__last_name')

    students_data = []
    for student in students:
        result = Result.objects.filter(
            student=student,
            subject=subj,
            session_year=session
        ).first()
        
        students_data.append({
            "student_id": student.id,
            "username": student.user.username,
            "first_name": student.user.first_name,
            "last_name": student.user.last_name,
            "reg_no": student.Registration_number,
            "marks": result.marks_obtained if result else ""
        })

    return {
        "students_data": students_data,
        "subject_name": subj.subject_name,
        "session_name": str(session)
    }

@router.post("/marks/save/")
def save_marks(data: MarksSaveRequest, current_user: CustomeUser = Depends(get_current_staff)):
    try:
        subj = Subject.objects.get(id=data.subject, staff=current_user)
        session = SessionYear.objects.get(id=data.session_year)
        
        for student_id, mark_val in data.marks_data.items():
            if mark_val is not None and mark_val != "":
                student = StudentProfile.objects.get(id=int(student_id))
                Result.objects.update_or_create(
                    student=student,
                    subject=subj,
                    session_year=session,
                    defaults={'marks_obtained': float(mark_val)}
                )
                
                # Send grade notification email
                if student.user.email:
                    try:
                        from college.settings import notify_student_grade
                        notify_student_grade(student.user.email, subj.subject_name)
                    except Exception as mail_err:
                        print(f"Failed to send grade email to {student.user.email}: {mail_err}")
                        
        return {
            "message": "Marks evaluated and graded successfully!"
        }
    except (Subject.DoesNotExist, SessionYear.DoesNotExist) as e:
        raise HTTPException(status_code=400, detail="Invalid Subject or Session Year.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save marks: {str(e)}")
