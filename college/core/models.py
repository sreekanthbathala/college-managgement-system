from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager




class UserManager(BaseUserManager):
    def create_user(self, email,username, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, username, password, **extra_fields)
    
class SessionYear(models.Model):
    session_start_year = models.DateField()
    session_end_year = models.DateField()

    def __str__(self):
        return f"{self.session_start_year} to {self.session_end_year}"
class Course(models.Model):
    course_name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return self.course_name

class Subject(models.Model):
    subject_name = models.CharField(max_length=100)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='subjects')
    staff = models.ForeignKey('CustomeUser', on_delete=models.CASCADE, limit_choices_to={'user_type': '2'}, related_name='assigned_subjects')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return f"{self.subject_name} ({self.course.course_name})"

class CustomeUser(AbstractUser):
    USER_TYPE_CHOICES = (
        (1, 'HOD/Admin'),
        (2, 'Staff'),
        (3, 'Student'),
    )
    email = models.EmailField(unique=True)
    user_type = models.PositiveSmallIntegerField(choices=USER_TYPE_CHOICES, default=3)
    objects = UserManager()

    def __str__(self):
        return f"{self.username} ({self.get_user_type_display()})"
    
class AdminProfile(models.Model):
    user = models.OneToOneField(CustomeUser, on_delete=models.CASCADE, related_name='admin_profile')
    # Add any additional fields specific to admin profile here
    created_at = models.DateTimeField(auto_now_add=True)    
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Admin Profile for {self.user.username}"
    
class StaffProfile(models.Model):
    user = models.OneToOneField(CustomeUser, on_delete=models.CASCADE, related_name='staff_profile')
    # Add any additional fields specific to staff profile here
    additional_info = models.TextField(blank=True, null=True)  # Example additional field
    created_at = models.DateTimeField(auto_now_add=True)    
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Staff Profile for {self.user.username}"
    
class StudentProfile(models.Model):
    user = models.OneToOneField(CustomeUser, on_delete=models.CASCADE, related_name='student_profile')
    Registration_number = models.CharField(max_length=20, unique=True) 
    gender = models.CharField(max_length=10, choices=[('Male', 'Male'), ('Female', 'Female'), ('Other', 'Other')])  # Example additional field
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True, related_name='student_profiles')
    session_year = models.ForeignKey(SessionYear, on_delete=models.SET_NULL, null=True, blank=True, related_name='student_profiles')
    created_at = models.DateTimeField(auto_now_add=True)    
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Student Profile for {self.user.username}"
    
class Attendance(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='attendances')
    session_year = models.ForeignKey(SessionYear, on_delete=models.CASCADE, related_name='attendances')
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)    
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Attendance for {self.subject.subject_name} on {self.date}"
    
class AttendanceReport(models.Model):
    attendance = models.ForeignKey(Attendance, on_delete=models.CASCADE, related_name='attendance_reports')
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='attendance_reports')
    status = models.BooleanField(default=False)  # True for present, False for absent
    created_at = models.DateTimeField(auto_now_add=True)    
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Attendance Report for {self.student.user.username} on {self.attendance.date} - {'Present' if self.status else 'Absent'}"
    
class Result(models.Model):
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='results')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='results')
    session_year = models.ForeignKey(SessionYear, on_delete=models.CASCADE, related_name='results')
    marks_obtained = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)    
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('student', 'subject', 'session_year')  # Ensure one result per student per subject per session

    def __str__(self):
        return f"Result for {self.student.user.username} in {self.subject.subject_name} - {self.marks_obtained}"    
    