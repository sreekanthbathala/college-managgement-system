from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from core.models import Course, Subject, SessionYear, StudentProfile, StaffProfile, Attendance, AttendanceReport, Result
import datetime

CustomeUser = get_user_model()

class CollegeSystemAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create a Session
        self.session = SessionYear.objects.create(
            session_start_year=datetime.date(2025, 1, 1),
            session_end_year=datetime.date(2025, 12, 31)
        )
        
        # Create a Course
        self.course = Course.objects.create(course_name="Computer Science")
        
        # Create Admin User
        self.admin_user = CustomeUser.objects.create_user(
            username='admin_test',
            email='admin@test.com',
            password='testpassword123',
            user_type=1
        )
        
        # Create Staff User
        self.staff_user = CustomeUser.objects.create_user(
            username='staff_test',
            email='staff@test.com',
            password='testpassword123',
            user_type=2,
            first_name="John",
            last_name="Doe"
        )
        self.staff_profile = StaffProfile.objects.create(
            user=self.staff_user,
            additional_info="AI Professor"
        )
        
        # Create Student User
        self.student_user = CustomeUser.objects.create_user(
            username='student_test',
            email='student@test.com',
            password='testpassword123',
            user_type=3,
            first_name="Alice",
            last_name="Smith"
        )
        self.student_profile = StudentProfile.objects.create(
            user=self.student_user,
            Registration_number="REG-1001",
            gender="Female",
            course=self.course,
            session_year=self.session
        )
        
        # Create Subject
        self.subject = Subject.objects.create(
            subject_name="Mathematics",
            course=self.course,
            staff=self.staff_user
        )

    def test_api_login_and_token_retrieval(self):
        """Verify API login retrieves a valid auth token and correct user meta details"""
        response = self.client.post(reverse('api_login'), {
            'username': 'admin_test',
            'password': 'testpassword123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['user_type'], 1)
        self.assertEqual(response.data['username'], 'admin_test')

    def test_api_access_control_guards(self):
        """Ensure student accounts cannot access admin viewsets or faculty actions"""
        # Unauthenticated request
        response = self.client.get(reverse('subject-list'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Authenticate as Student
        self.client.force_authenticate(user=self.student_user)
        
        # Student trying to register a new course (Admin only)
        response = self.client.post(reverse('course-list'), {'course_name': 'Civil Engineering'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Student trying to load faculty roster
        response = self.client.get(reverse('api_attendance_students'), {
            'subject': self.subject.id,
            'session_year': self.session.id
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_courses_api_crud(self):
        """Verify Admin HOD course creation and deletion via REST endpoints"""
        self.client.force_authenticate(user=self.admin_user)
        
        # Create course
        response = self.client.post(reverse('course-list'), {
            'course_name': 'Mechanical Engineering'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Course.objects.filter(course_name='Mechanical Engineering').exists())
        
        # Delete course
        c = Course.objects.get(course_name='Mechanical Engineering')
        response = self.client.delete(reverse('course-detail', args=[c.id]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Course.objects.filter(course_name='Mechanical Engineering').exists())

    def test_faculty_roll_call_api_logging(self):
        """Test Faculty attendance logs collection and processing via API"""
        self.client.force_authenticate(user=self.staff_user)
        
        # Fetch roster
        response = self.client.get(reverse('api_attendance_students'), {
            'subject': self.subject.id,
            'session_year': self.session.id,
            'attendance_date': '2025-06-15'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['students']), 1)
        self.assertEqual(response.data['students'][0]['Registration_number'], 'REG-1001')
        
        # Save attendance (Alice is present)
        response = self.client.post(reverse('api_attendance_save'), {
            'subject': self.subject.id,
            'session_year': self.session.id,
            'attendance_date': '2025-06-15',
            'student_status': [self.student_profile.id]
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check DB objects
        attendance = Attendance.objects.get(subject=self.subject, date='2025-06-15')
        report = AttendanceReport.objects.get(attendance=attendance, student=self.student_profile)
        self.assertTrue(report.status)

    def test_faculty_grades_evaluations_api_entry(self):
        """Verify Faculty grades evaluations inputs via API"""
        self.client.force_authenticate(user=self.staff_user)
        
        response = self.client.post(reverse('api_marks_save'), {
            'subject': self.subject.id,
            'session_year': self.session.id,
            'marks_data': {
                str(self.student_profile.id): '92.5'
            }
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check DB
        res = Result.objects.get(student=self.student_profile, subject=self.subject)
        self.assertEqual(res.marks_obtained, 92.5)

    def test_student_dashboard_metrics_computations(self):
        """Test Student dashboard analytics (correct attendance rates and grade marks) via dashboard stats API"""
        # Set up some mock attendance for Alice: 3 classes, present in 2, absent in 1 (66.7%)
        att1 = Attendance.objects.create(subject=self.subject, session_year=self.session, date='2025-05-01')
        AttendanceReport.objects.create(attendance=att1, student=self.student_profile, status=True)
        
        att2 = Attendance.objects.create(subject=self.subject, session_year=self.session, date='2025-05-02')
        AttendanceReport.objects.create(attendance=att2, student=self.student_profile, status=True)
        
        att3 = Attendance.objects.create(subject=self.subject, session_year=self.session, date='2025-05-03')
        AttendanceReport.objects.create(attendance=att3, student=self.student_profile, status=False)
        
        # Create a term grade of 78.0
        Result.objects.create(student=self.student_profile, subject=self.subject, session_year=self.session, marks_obtained=78.0)
        
        # Fetch stats as student
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(reverse('api_dashboard_stats'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['counts']['overall_percentage'], 66.7)
        self.assertEqual(response.data['counts']['total_held'], 3)
        self.assertEqual(response.data['counts']['total_attended'], 2)
        self.assertEqual(response.data['subjects_stats'][0]['marks'], 78.0)
