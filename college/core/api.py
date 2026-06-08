from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.db import IntegrityError
from core.models import (
    SessionYear, Course, Subject, CustomeUser, 
    AdminProfile, StaffProfile, StudentProfile, 
    Attendance, AttendanceReport, Result
)
from core.serializers import (
    CustomeUserSerializer, SessionYearSerializer, CourseSerializer,
    SubjectSerializer, StaffProfileSerializer, StudentProfileSerializer,
    AttendanceSerializer, AttendanceReportSerializer, ResultSerializer
)

# Custom Permissions
class IsAdminUserType(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == 1

class IsStaffUserType(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == 2

class IsStudentUserType(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == 3

from rest_framework.throttling import AnonRateThrottle

class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'

# AUTHENTICATION APIS
class CustomObtainAuthToken(ObtainAuthToken):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        
        # Check profiles
        profile_id = None
        if user.user_type == 2:
            profile = StaffProfile.objects.filter(user=user).first()
            if profile:
                profile_id = profile.id
        elif user.user_type == 3:
            profile = StudentProfile.objects.filter(user=user).first()
            if profile:
                profile_id = profile.id

        return Response({
            'token': token.key,
            'user_id': user.pk,
            'username': user.username,
            'email': user.email,
            'user_type': user.user_type,
            'user_type_display': user.get_user_type_display(),
            'first_name': user.first_name,
            'last_name': user.last_name,
            'profile_id': profile_id
        })

class UserSignupView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        user_type = request.data.get('user_type') # 2 for Staff, 3 for Student

        if not username or not email or not password or not user_type:
            return Response(
                {'error': 'Username, email, password, and user_type are required fields.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user_type not in [2, 3, '2', '3']:
            return Response(
                {'error': 'Invalid user_type. Only Staff (2) or Student (3) accounts can sign up.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Profile-specific validation
        if str(user_type) == '3':
            reg_no = request.data.get('reg_no')
            if not reg_no:
                return Response(
                    {'error': 'Registration number is required for student accounts.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if StudentProfile.objects.filter(Registration_number=reg_no).exists():
                return Response(
                    {'error': 'Registration number is already in use.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if CustomeUser.objects.filter(username=username).exists():
            return Response({'error': 'Username is already taken.'}, status=status.HTTP_400_BAD_REQUEST)
        if CustomeUser.objects.filter(email=email).exists():
            return Response({'error': 'An account with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Create user shell
            user = CustomeUser.objects.create_user(
                username=username,
                email=email,
                password=password,
                user_type=int(user_type)
            )

            # Create associated profile
            if str(user_type) == '3':
                course_id = request.data.get('course')
                session_id = request.data.get('session_year')
                gender = request.data.get('gender', 'Other')

                course = Course.objects.filter(id=course_id).first() if course_id else None
                session_year = SessionYear.objects.filter(id=session_id).first() if session_id else None

                StudentProfile.objects.create(
                    user=user,
                    Registration_number=reg_no,
                    gender=gender,
                    course=course,
                    session_year=session_year
                )
            elif str(user_type) == '2':
                StaffProfile.objects.create(
                    user=user
                )

            token, created = Token.objects.get_or_create(user=user)

            # Send welcome email notification
            try:
                from django.core.mail import send_mail
                from django.conf import settings
                send_mail(
                    subject="Welcome to Excel University CMS!",
                    message=f"Hello {username},\n\nYour profile has been created successfully as a {user.get_user_type_display()}.\n\nBest regards,\nAdministration Office",
                    from_email=settings.EMAIL_HOST_USER,
                    recipient_list=[email],
                    fail_silently=True
                )
            except Exception as mail_err:
                print(f"Failed to send welcome email: {mail_err}")

            return Response({
                'message': 'Signup successful!',
                'token': token.key,
                'user_type': user.user_type
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'error': f'Failed to create user: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CurrentUserView(APIView):
    def get(self, request):
        user = request.user
        serializer = CustomeUserSerializer(user)
        
        profile_data = None
        if user.user_type == 2:
            profile = StaffProfile.objects.filter(user=user).first()
            if profile:
                profile_data = {
                    'profile_id': profile.id,
                    'additional_info': profile.additional_info
                }
        elif user.user_type == 3:
            profile = StudentProfile.objects.filter(user=user).first()
            if profile:
                profile_data = {
                    'profile_id': profile.id,
                    'Registration_number': profile.Registration_number,
                    'gender': profile.gender,
                    'course_name': profile.course.course_name if profile.course else 'Not Enrolled',
                    'session_year_name': str(profile.session_year) if profile.session_year else 'N/A'
                }

        return Response({
            'user': serializer.data,
            'profile': profile_data
        })

# DASHBOARD STATS APIS
class DashboardStatsView(APIView):
    def get(self, request):
        user = request.user
        
        if user.user_type == 1:
            # HOD Admin stats
            recent_courses = Course.objects.all().order_by('-created_at')[:5]
            recent_staff = StaffProfile.objects.all().order_by('-created_at')[:5]
            recent_students = StudentProfile.objects.all().order_by('-created_at')[:5]

            return Response({
                'role': 'admin',
                'counts': {
                    'courses': Course.objects.count(),
                    'staff': StaffProfile.objects.count(),
                    'students': StudentProfile.objects.count(),
                    'subjects': Subject.objects.count(),
                    'sessions': SessionYear.objects.count(),
                },
                'recents': {
                    'courses': CourseSerializer(recent_courses, many=True).data,
                    'staff': StaffProfileSerializer(recent_staff, many=True).data,
                    'students': StudentProfileSerializer(recent_students, many=True).data,
                }
            })

        elif user.user_type == 2:
            # Faculty Staff stats
            assigned_subjects = Subject.objects.filter(staff=user)
            attendance_count = Attendance.objects.filter(subject__staff=user).count()
            results_count = Result.objects.filter(subject__staff=user).count()

            return Response({
                'role': 'staff',
                'counts': {
                    'subjects': assigned_subjects.count(),
                    'attendance': attendance_count,
                    'results': results_count
                },
                'subjects': SubjectSerializer(assigned_subjects, many=True).data
            })

        elif user.user_type == 3:
            # College Student stats
            student_profile = StudentProfile.objects.filter(user=user).first()
            if not student_profile:
                return Response({'error': 'Student profile not found'}, status=status.HTTP_404_NOT_FOUND)

            course = student_profile.course
            session_year = student_profile.session_year
            
            subjects_stats = []
            total_held = 0
            total_attended = 0
            
            if course and session_year:
                subjects = Subject.objects.filter(course=course)
                for subject in subjects:
                    # Calculate attendance rates
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
                    
                    # Fetch student exam result for this subject
                    result_obj = Result.objects.filter(
                        student=student_profile,
                        subject=subject,
                        session_year=session_year
                    ).first()
                    marks = result_obj.marks_obtained if result_obj else None
                    
                    subjects_stats.append({
                        'subject_id': subject.id,
                        'subject_name': subject.subject_name,
                        'held': held,
                        'attended': attended,
                        'percentage': round(percentage, 1),
                        'marks': marks
                    })
                    
            overall_percentage = (total_attended / total_held * 100) if total_held > 0 else 100.0
            
            return Response({
                'role': 'student',
                'registration_number': student_profile.Registration_number,
                'gender': student_profile.gender,
                'course_name': course.course_name if course else 'N/A',
                'session_year_name': str(session_year) if session_year else 'N/A',
                'counts': {
                    'total_held': total_held,
                    'total_attended': total_attended,
                    'overall_percentage': round(overall_percentage, 1),
                },
                'subjects_stats': subjects_stats
            })
        
        return Response({'error': 'Unknown user role'}, status=status.HTTP_400_BAD_REQUEST)

# VIEWSETS FOR ADMIN CRUD
class SessionYearViewSet(viewsets.ModelViewSet):
    queryset = SessionYear.objects.all().order_by('-session_start_year')
    serializer_class = SessionYearSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUserType()]
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all().order_by('course_name')
    serializer_class = CourseSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUserType()]
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all().order_by('subject_name')
    serializer_class = SubjectSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUserType()]
        return [permissions.IsAuthenticated()]

class StaffProfileViewSet(viewsets.ModelViewSet):
    queryset = StaffProfile.objects.all().order_by('user__username')
    serializer_class = StaffProfileSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUserType()]
        return [permissions.IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        profile = self.get_object()
        user = profile.user
        profile.delete()
        user.delete()
        return Response({'message': 'Staff deleted successfully'}, status=status.HTTP_204_NO_CONTENT)

class StudentProfileViewSet(viewsets.ModelViewSet):
    queryset = StudentProfile.objects.all().order_by('Registration_number')
    serializer_class = StudentProfileSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUserType()]
        return [permissions.IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        profile = self.get_object()
        user = profile.user
        profile.delete()
        user.delete()
        return Response({'message': 'Student deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


# FACULTY OPERATIONAL WORKFLOW APIS
class FacultyAttendanceStudentListView(APIView):
    permission_classes = [IsStaffUserType]

    def get(self, request):
        subject_id = request.GET.get('subject')
        session_id = request.GET.get('session_year')
        attendance_date = request.GET.get('attendance_date')

        if not subject_id or not session_id:
            return Response(
                {'error': 'subject and session_year query parameters are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        subject = get_object_or_404_custom(Subject, id=subject_id, staff=request.user)
        session_year = get_object_or_404_custom(SessionYear, id=session_id)
        
        students = StudentProfile.objects.filter(
            course=subject.course,
            session_year=session_year
        ).order_by('user__first_name', 'user__last_name')

        # Check if attendance is already logged for this date
        already_logged = False
        present_student_ids = []
        if attendance_date:
            attendance_obj = Attendance.objects.filter(
                subject=subject,
                session_year=session_year,
                date=attendance_date
            ).first()
            if attendance_obj:
                already_logged = True
                present_student_ids = AttendanceReport.objects.filter(
                    attendance=attendance_obj,
                    status=True
                ).values_list('student_id', flat=True)

        students_serialized = StudentProfileSerializer(students, many=True).data
        for s in students_serialized:
            s['is_present'] = s['id'] in present_student_ids

        return Response({
            'students': students_serialized,
            'already_logged': already_logged,
            'attendance_date': attendance_date
        })

class FacultyAttendanceSaveView(APIView):
    permission_classes = [IsStaffUserType]

    def post(self, request):
        subject_id = request.data.get('subject')
        session_id = request.data.get('session_year')
        attendance_date = request.data.get('attendance_date')
        present_student_ids = request.data.get('student_status', []) # list of student profile IDs

        if not subject_id or not session_id or not attendance_date:
            return Response(
                {'error': 'subject, session_year, and attendance_date are required fields.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            subject = get_object_or_404_custom(Subject, id=subject_id, staff=request.user)
            session_year = get_object_or_404_custom(SessionYear, id=session_id)
            
            attendance_obj, created = Attendance.objects.get_or_create(
                subject=subject,
                session_year=session_year,
                date=attendance_date
            )
            
            # Wipe previous reports for re-logging (standard edit behaviour)
            if not created:
                AttendanceReport.objects.filter(attendance=attendance_obj).delete()
            
            all_students = StudentProfile.objects.filter(
                course=subject.course,
                session_year=session_year
            )
            
            # Convert values to integer for accurate check
            present_student_ids = [int(sid) for sid in present_student_ids]
            
            for student in all_students:
                is_present = student.id in present_student_ids
                AttendanceReport.objects.create(
                    attendance=attendance_obj,
                    student=student,
                    status=is_present
                )

            return Response({
                'message': f"Attendance logged successfully! Added attendance record ID: {attendance_obj.id}"
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': f'Failed to save attendance: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class FacultyMarksStudentListView(APIView):
    permission_classes = [IsStaffUserType]

    def get(self, request):
        subject_id = request.GET.get('subject')
        session_id = request.GET.get('session_year')

        if not subject_id or not session_id:
            return Response(
                {'error': 'subject and session_year query parameters are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        subject = get_object_or_404_custom(Subject, id=subject_id, staff=request.user)
        session_year = get_object_or_404_custom(SessionYear, id=session_id)
        
        students = StudentProfile.objects.filter(
            course=subject.course,
            session_year=session_year
        ).order_by('user__first_name', 'user__last_name')
        
        students_data = []
        for student in students:
            result = Result.objects.filter(
                student=student,
                subject=subject,
                session_year=session_year
            ).first()
            
            students_data.append({
                'student_id': student.id,
                'username': student.user.username,
                'first_name': student.user.first_name,
                'last_name': student.user.last_name,
                'reg_no': student.Registration_number,
                'marks': result.marks_obtained if result else ''
            })

        return Response({
            'students_data': students_data,
            'subject_name': subject.subject_name,
            'session_name': str(session_year)
        })

class FacultyMarksSaveView(APIView):
    permission_classes = [IsStaffUserType]

    def post(self, request):
        subject_id = request.data.get('subject')
        session_id = request.data.get('session_year')
        marks_data = request.data.get('marks_data', {}) # Map of student_id -> mark

        if not subject_id or not session_id:
            return Response(
                {'error': 'subject and session_year are required fields.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            subject = get_object_or_404_custom(Subject, id=subject_id, staff=request.user)
            session_year = get_object_or_404_custom(SessionYear, id=session_id)
            
            for student_id, mark_val in marks_data.items():
                if mark_val is not None and mark_val != '':
                    student = StudentProfile.objects.get(id=int(student_id))
                    Result.objects.update_or_create(
                        student=student,
                        subject=subject,
                        session_year=session_year,
                        defaults={'marks_obtained': float(mark_val)}
                    )
                    # Send grade notification email
                    if student.user.email:
                        try:
                            from college.settings import notify_student_grade
                            notify_student_grade(student.user.email, subject.subject_name)
                        except Exception as mail_err:
                            print(f"Failed to send grade email to {student.user.email}: {mail_err}")

            return Response({
                'message': 'Marks evaluated and graded successfully!'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': f'Failed to save marks: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Helper function
def get_object_or_404_custom(klass, **kwargs):
    from django.http import Http404
    try:
        return klass.objects.get(**kwargs)
    except klass.DoesNotExist:
        raise Http404(f"No {klass.__name__} matches the given query.")

class APIRootView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            'message': 'Welcome to the Excel University College Management System API backend.',
            'frontend_url': 'http://localhost:5173/',
            'admin_portal': 'http://127.0.0.1:8000/admin/',
            'status': 'online'
        })

