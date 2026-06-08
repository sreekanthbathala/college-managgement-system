"""
URL configuration for college project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path
from core import api
from rest_framework.routers import DefaultRouter
rounter = DefaultRouter()
rounter.register(r'sessions', api.SessionYearViewSet, basename='session')
rounter.register(r'courses', api.CourseViewSet, basename='course')
rounter.register(r'subjects', api.SubjectViewSet, basename='subject')
rounter.register(r'staff', api.StaffProfileViewSet, basename='staff')
rounter.register(r'students', api.StudentProfileViewSet, basename='student')

urlpatterns = [
    path('', api.APIRootView.as_view(), name='api_root'),
    path('admin/', admin.site.urls),
    #for api
    path('api/', include(rounter.urls)),
    
    # Custom API Authentication & Session routes
    path('api/auth/login/', api.CustomObtainAuthToken.as_view(), name='api_login'),
    path('api/auth/signup/', api.UserSignupView.as_view(), name='api_signup'),
    path('api/auth/user/', api.CurrentUserView.as_view(), name='api_user'),
    
    # Custom API Dashboard & Operations routes
    path('api/dashboard/stats/', api.DashboardStatsView.as_view(), name='api_dashboard_stats'),
    path('api/attendance/students/', api.FacultyAttendanceStudentListView.as_view(), name='api_attendance_students'),
    path('api/attendance/save/', api.FacultyAttendanceSaveView.as_view(), name='api_attendance_save'),
    path('api/marks/students/', api.FacultyMarksStudentListView.as_view(), name='api_marks_students'),
    path('api/marks/save/', api.FacultyMarksSaveView.as_view(), name='api_marks_save'),
]
