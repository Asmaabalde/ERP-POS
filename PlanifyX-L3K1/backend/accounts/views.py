from rest_framework import generics, status, permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema, inline_serializer
from django.contrib.auth import get_user_model
from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserProfileSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    EmployeSerializer,
    EmailVerificationSerializer,
)


User = get_user_model()


class UserRegistrationView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = UserRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": "Inscription réussie. Vérifiez votre boîte mail pour activer votre compte."},
            status=status.HTTP_201_CREATED,
        )


class EmailVerificationView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, uid, token):
        serializer = EmailVerificationSerializer(data={"uid": uid, "token": token})
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"detail": "Votre compte a été activé avec succès."},
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        request=UserLoginSerializer,
        responses={
            200: inline_serializer(
                name="UserLoginResponseSerializer",
                fields={
                    "refresh": serializers.CharField(),
                    "access": serializers.CharField(),
                    "detail": serializers.CharField(),
                },
            )
        },
        summary="Connexion utilisateur",
        description="Authentifie un utilisateur et retourne les tokens JWT.",
    )
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            user = serializer.validated_data["user"]
            refresh = RefreshToken.for_user(user)
            return Response(
                {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                    "detail": "Connexion réussie.",
                },
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        responses=UserProfileSerializer,
        summary="Profil utilisateur",
        description="Retourne ou modifie les informations de l'utilisateur connecté.",
    )
    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        if request.user.role != "ADMIN":
            return Response(
                {"detail": "Seul un administrateur peut modifier ses informations."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = UserProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": "Si cet email existe, un lien de réinitialisation a été envoyé."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": "Mot de passe réinitialisé avec succès."},
            status=status.HTTP_200_OK,
        )


class EmployeListCreateView(generics.ListCreateAPIView):
    serializer_class = EmployeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.entreprise:
            return User.objects.none()

        return User.objects.filter(
            entreprise=self.request.user.entreprise
        )

    def perform_create(self, serializer):
        serializer.save()


class EmployeDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EmployeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.entreprise:
            return User.objects.none()

        return User.objects.filter(
            entreprise=self.request.user.entreprise
        )