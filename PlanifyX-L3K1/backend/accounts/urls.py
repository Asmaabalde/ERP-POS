from django.urls import path
from .views import (
    UserRegistrationView,
    UserLoginView,
    UserProfileView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    EmployeListCreateView,
    EmployeDetailView,
    EmailVerificationView,
)

urlpatterns = [
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('login/', UserLoginView.as_view(), name='login'),
    path('user/', UserProfileView.as_view(), name='user_profile'),
    path('forgot-password/', PasswordResetRequestView.as_view(), name='forgot_password'),
    path('reset-password/', PasswordResetConfirmView.as_view(), name='reset_password'),
    path('employes/', EmployeListCreateView.as_view(), name='create_employes'),
    path('employes/<int:pk>/', EmployeDetailView.as_view(), name='employe-detail'),
    path('verify-email/<str:uid>/<str:token>/', EmailVerificationView.as_view(), name='verify_email'),
]