from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    SessionYear, Course, Subject, CustomeUser, 
    AdminProfile, StaffProfile, StudentProfile, 
    Attendance, AttendanceReport, Result
)

class CustomeUserSerializer(serializers.ModelSerializer):
    user_type_display = serializers.CharField(source='get_user_type_display', read_only=True)
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = CustomeUser
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'user_type', 'user_type_display', 'password']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = CustomeUser(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

class SessionYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionYear
        fields = ['id', 'session_start_year', 'session_end_year']

    def to_representation(self, instance):
        repr_data = super().to_representation(instance)
        # Add a string representation for display in dropdowns
        repr_data['display_name'] = f"{instance.session_start_year} to {instance.session_end_year}"
        return repr_data

class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ['id', 'course_name', 'created_at', 'updated_at']

class SubjectSerializer(serializers.ModelSerializer):
    course_detail = CourseSerializer(source='course', read_only=True)
    staff_detail = CustomeUserSerializer(source='staff', read_only=True)
    course = serializers.PrimaryKeyRelatedField(queryset=Course.objects.all())
    staff = serializers.PrimaryKeyRelatedField(queryset=CustomeUser.objects.filter(user_type=2))

    class Meta:
        model = Subject
        fields = ['id', 'subject_name', 'course', 'course_detail', 'staff', 'staff_detail', 'created_at', 'updated_at']

class StaffProfileSerializer(serializers.ModelSerializer):
    user = CustomeUserSerializer()

    class Meta:
        model = StaffProfile
        fields = ['id', 'user', 'additional_info', 'created_at', 'updated_at']

    def create(self, validated_data):
        user_data = validated_data.pop('user')
        # Automatically make sure it is a Staff user type (2)
        user_data['user_type'] = 2
        user_serializer = CustomeUserSerializer(data=user_data)
        user_serializer.is_valid(raise_exception=True)
        user = user_serializer.save()
        staff_profile = StaffProfile.objects.create(user=user, **validated_data)
        return staff_profile

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', None)
        if user_data:
            user_serializer = CustomeUserSerializer(instance.user, data=user_data, partial=True)
            user_serializer.is_valid(raise_exception=True)
            user_serializer.save()
        instance.additional_info = validated_data.get('additional_info', instance.additional_info)
        instance.save()
        return instance

class StudentProfileSerializer(serializers.ModelSerializer):
    user = CustomeUserSerializer()
    course_detail = CourseSerializer(source='course', read_only=True)
    session_year_detail = SessionYearSerializer(source='session_year', read_only=True)
    course = serializers.PrimaryKeyRelatedField(queryset=Course.objects.all(), required=False, allow_null=True)
    session_year = serializers.PrimaryKeyRelatedField(queryset=SessionYear.objects.all(), required=False, allow_null=True)

    class Meta:
        model = StudentProfile
        fields = [
            'id', 'user', 'Registration_number', 'gender', 
            'course', 'course_detail', 'session_year', 'session_year_detail', 
            'created_at', 'updated_at'
        ]

    def create(self, validated_data):
        user_data = validated_data.pop('user')
        # Automatically make sure it is a Student user type (3)
        user_data['user_type'] = 3
        user_serializer = CustomeUserSerializer(data=user_data)
        user_serializer.is_valid(raise_exception=True)
        user = user_serializer.save()
        
        student_profile = StudentProfile.objects.create(user=user, **validated_data)
        return student_profile

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', None)
        if user_data:
            user_serializer = CustomeUserSerializer(instance.user, data=user_data, partial=True)
            user_serializer.is_valid(raise_exception=True)
            user_serializer.save()
            
        instance.Registration_number = validated_data.get('Registration_number', instance.Registration_number)
        instance.gender = validated_data.get('gender', instance.gender)
        instance.course = validated_data.get('course', instance.course)
        instance.session_year = validated_data.get('session_year', instance.session_year)
        instance.save()
        return instance

class AttendanceSerializer(serializers.ModelSerializer):
    subject_detail = SubjectSerializer(source='subject', read_only=True)
    session_year_detail = SessionYearSerializer(source='session_year', read_only=True)

    class Meta:
        model = Attendance
        fields = ['id', 'subject', 'subject_detail', 'session_year', 'session_year_detail', 'date', 'created_at', 'updated_at']

class AttendanceReportSerializer(serializers.ModelSerializer):
    student_detail = StudentProfileSerializer(source='student', read_only=True)

    class Meta:
        model = AttendanceReport
        fields = ['id', 'attendance', 'student', 'student_detail', 'status', 'created_at', 'updated_at']

class ResultSerializer(serializers.ModelSerializer):
    student_detail = StudentProfileSerializer(source='student', read_only=True)
    subject_detail = SubjectSerializer(source='subject', read_only=True)
    session_year_detail = SessionYearSerializer(source='session_year', read_only=True)

    class Meta:
        model = Result
        fields = ['id', 'student', 'student_detail', 'subject', 'subject_detail', 'session_year', 'session_year_detail', 'marks_obtained', 'created_at', 'updated_at']