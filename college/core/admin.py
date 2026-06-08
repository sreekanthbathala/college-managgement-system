from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import CustomeUser, AdminProfile, StaffProfile, StudentProfile, SessionYear, Course, Subject, Attendance, AttendanceReport, Result



@admin.register(CustomeUser)
class CustomeUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'user_type', 'is_staff', 'is_active')
    list_filter = ('user_type', 'is_staff', 'is_active')
    search_fields = ('username', 'email')
    fieldsets = UserAdmin.fieldsets + (
        ('Custom College Fields', {'fields': ('user_type',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Custom College Fields', {'fields': ('user_type',)}),
    )   

@admin.register(AdminProfile)
class AdminProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at', 'updated_at')
    search_fields = ('user__username', 'user__email')

@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at', 'updated_at')
    search_fields = ('user__username', 'user__email')

@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'Registration_number', 'gender', 'created_at', 'updated_at')
    search_fields = ('user__username', 'user__email', 'Registration_number')

admin.site.register(SessionYear)
admin.site.register(Course)
admin.site.register(Subject)
admin.site.register(Attendance)
admin.site.register(AttendanceReport)
admin.site.register(Result)
admin.site.site_header = "College Management System Admin"
# Register your models here.