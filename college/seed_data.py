import os
import django
import datetime

# Configure django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'college.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.models import Course, Subject, SessionYear, StudentProfile, StaffProfile, Attendance, AttendanceReport, Result

CustomeUser = get_user_model()

def seed():
    print("--- Starting database seeding operation ---")
    
    # 1. Clear old data to prevent duplication
    print("Flushing old data objects...")
    Result.objects.all().delete()
    AttendanceReport.objects.all().delete()
    Attendance.objects.all().delete()
    Subject.objects.all().delete()
    StudentProfile.objects.all().delete()
    StaffProfile.objects.all().delete()
    Course.objects.all().delete()
    SessionYear.objects.all().delete()
    
    # Keep default superusers, but delete our test users
    CustomeUser.objects.filter(username__in=['admin', 'prof_alan', 'prof_grace', 'student_alice', 'student_bob']).delete()

    # 2. Create Superuser / Admin
    print("Creating Administrator account (admin/admin123)...")
    admin_user = CustomeUser.objects.create_superuser(
        username='admin',
        email='admin@excel.edu',
        password='admin123',
        first_name='HOD',
        last_name='Director',
        user_type=1
    )
    # Admin profile is usually created or default, let's make sure it's not needed or create if necessary
    
    # 3. Create Sessions
    print("Creating academic sessions...")
    session_1 = SessionYear.objects.create(
        session_start_year=datetime.date(2024, 6, 1),
        session_end_year=datetime.date(2025, 5, 30)
    )
    session_2 = SessionYear.objects.create(
        session_start_year=datetime.date(2025, 6, 1),
        session_end_year=datetime.date(2026, 5, 30)
    )
    session_3 = SessionYear.objects.create(
        session_start_year=datetime.date(2026, 6, 1),
        session_end_year=datetime.date(2027, 5, 30)
    )
    
    # 4. Create Courses
    print("Creating academic courses...")
    course_cse = Course.objects.create(course_name="Computer Science Engineering")
    course_ds = Course.objects.create(course_name="Data Science & Artificial Intelligence")
    course_ee = Course.objects.create(course_name="Electrical Engineering")
    
    # 5. Create Faculty/Staff users
    print("Creating faculty users (prof_alan, prof_grace)...")
    staff_user_1 = CustomeUser.objects.create_user(
        username='prof_alan',
        email='alan@excel.edu',
        password='staff123',
        user_type=2,
        first_name='Alan',
        last_name='Turing'
    )
    StaffProfile.objects.create(
        user=staff_user_1,
        additional_info="Senior Professor in Theory of Computation & Machine Intelligence"
    )
    
    staff_user_2 = CustomeUser.objects.create_user(
        username='prof_grace',
        email='grace@excel.edu',
        password='staff123',
        user_type=2,
        first_name='Grace',
        last_name='Hopper'
    )
    StaffProfile.objects.create(
        user=staff_user_2,
        additional_info="Department Head in Compiler Architectures & Software Engineering"
    )
    
    # 6. Create Subjects and Assign Instructors
    print("Creating academic subjects...")
    sub_automata = Subject.objects.create(
        subject_name="Theory of Automata",
        course=course_cse,
        staff=staff_user_1
    )
    sub_compiler = Subject.objects.create(
        subject_name="Compiler Construction",
        course=course_cse,
        staff=staff_user_2
    )
    sub_ai = Subject.objects.create(
        subject_name="Artificial Intelligence",
        course=course_ds,
        staff=staff_user_1
    )
    sub_ml = Subject.objects.create(
        subject_name="Applied Machine Learning",
        course=course_ds,
        staff=staff_user_2
    )
    
    # 7. Create Students
    print("Creating student profiles (student_alice, student_bob)...")
    student_user_1 = CustomeUser.objects.create_user(
        username='student_alice',
        email='alice@excel.edu',
        password='student123',
        user_type=3,
        first_name='Alice',
        last_name='Smith'
    )
    profile_alice = StudentProfile.objects.create(
        user=student_user_1,
        Registration_number="EXCEL-2024-001",
        gender="Female",
        course=course_cse,
        session_year=session_1
    )
    
    student_user_2 = CustomeUser.objects.create_user(
        username='student_bob',
        email='bob@excel.edu',
        password='student123',
        user_type=3,
        first_name='Bob',
        last_name='Johnson'
    )
    profile_bob = StudentProfile.objects.create(
        user=student_user_2,
        Registration_number="EXCEL-2025-001",
        gender="Male",
        course=course_ds,
        session_year=session_2
    )
    
    # 8. Seed Attendance Logs for Alice (Theory of Automata - Taught by Alan Turing)
    print("Seeding attendance logs for Alice...")
    dates = [
        datetime.date(2025, 1, 10),
        datetime.date(2025, 1, 15),
        datetime.date(2025, 1, 20),
        datetime.date(2025, 1, 25),
        datetime.date(2025, 2, 2)
    ]
    status_array = [True, True, False, True, True] # 4 Present, 1 Absent (80% rate)
    
    for dt, stat in zip(dates, status_array):
        att = Attendance.objects.create(
            subject=sub_automata,
            session_year=session_1,
            date=dt
        )
        AttendanceReport.objects.create(
            attendance=att,
            student=profile_alice,
            status=stat
        )
        
    # Seed Attendance Logs for Alice (Compiler Construction - Taught by Grace Hopper)
    dates_compiler = [
        datetime.date(2025, 1, 12),
        datetime.date(2025, 1, 18),
        datetime.date(2025, 1, 24)
    ]
    status_compiler = [True, False, False] # 1 Present, 2 Absent (33.3% rate -> under 75% warning!)
    
    for dt, stat in zip(dates_compiler, status_compiler):
        att = Attendance.objects.create(
            subject=sub_compiler,
            session_year=session_1,
            date=dt
        )
        AttendanceReport.objects.create(
            attendance=att,
            student=profile_alice,
            status=stat
        )

    # 9. Seed Term Results / Grades
    print("Seeding exam term results...")
    Result.objects.create(
        student=profile_alice,
        subject=sub_automata,
        session_year=session_1,
        marks_obtained=88.5 # Distinction!
    )
    Result.objects.create(
        student=profile_alice,
        subject=sub_compiler,
        session_year=session_1,
        marks_obtained=42.0 # Pass
    )
    Result.objects.create(
        student=profile_bob,
        subject=sub_ml,
        session_year=session_2,
        marks_obtained=94.0 # Distinction!
    )

    print("--- Database seeding operation completed successfully! ---")

if __name__ == '__main__':
    seed()
