from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from .models import Entreprise
import re


User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    entreprise = serializers.CharField(write_only=True, required=True)
    first_name = serializers.CharField(write_only=True, required=True)
    last_name = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ("email", "password", "entreprise", "first_name", "last_name")
        extra_kwargs = {"email": {"validators": []}}

    def validate_first_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError("Le prénom doit contenir au moins 2 caractères.")
        if not re.match(r"^[a-zA-ZÀ-ÿ\s\-\']+$", value):
            raise serializers.ValidationError("Le prénom contient des caractères non autorisés.")
        return value

    def validate_last_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError("Le nom doit contenir au moins 2 caractères.")
        if not re.match(r"^[a-zA-ZÀ-ÿ\s\-\']+$", value):
            raise serializers.ValidationError("Le nom contient des caractères non autorisés.")
        return value

    def validate_email(self, value):
        if not re.match(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$", value):
            raise serializers.ValidationError(
                "L'adresse email n'est pas valide (exemple : nom@domaine.com)."
            )
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Un utilisateur avec cet email existe déjà.")
        return value

    def validate_entreprise(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError("Le nom de l'entreprise est obligatoire.")
        if len(value) < 2:
            raise serializers.ValidationError("Le nom de l'entreprise doit contenir au moins 2 caractères.")
        if len(value) > 100:
            raise serializers.ValidationError("Le nom de l'entreprise ne peut pas dépasser 100 caractères.")
        if not re.match(r"^[a-zA-ZÀ-ÿ0-9\s\-\'\&\.\,\(\)\+\@]+$", value):
            raise serializers.ValidationError(
                "Le nom ne peut contenir que des lettres, chiffres, espaces et les caractères : - ' & . , ( ) + @"
            )
        if re.match(r"^[\d\s]+$", value):
            raise serializers.ValidationError("Le nom de l'entreprise doit contenir au moins une lettre.")
        if re.search(r"(.)\1{4,}", value):
            raise serializers.ValidationError("Le nom de l'entreprise semble invalide.")
        if Entreprise.objects.filter(nom__iexact=value).exists():
            raise serializers.ValidationError("Une entreprise avec ce nom existe déjà.")

        return value

    def validate_password(self, value):
        validate_password(value)

        errors = []
        if len(value) < 8:
            errors.append("8 caractères minimum")
        if not re.search(r"[A-Z]", value):
            errors.append("1 majuscule")
        if not re.search(r"[a-z]", value):
            errors.append("1 minuscule")
        if not re.search(r"[0-9]", value):
            errors.append("1 chiffre")
        if not re.search(r"[!@#\$%\^&\*\(\)_\+\-=\[\]{};:,\.<>\?]", value):
            errors.append("1 caractère spécial")

        if errors:
            raise serializers.ValidationError(
                f"Le mot de passe doit contenir : {', '.join(errors)}."
            )
        return value

    def create(self, validated_data):
        entreprise_nom = validated_data.pop("entreprise").strip()
        first_name = validated_data.pop("first_name").strip()
        last_name = validated_data.pop("last_name").strip()

        entreprise = Entreprise.objects.create(nom=entreprise_nom)

        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            role="ADMIN",
            entreprise=entreprise,
            is_active=False,
            first_name=first_name,
            last_name=last_name,
            poste="Administrateur",
        )

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        verification_url = f"{settings.FRONTEND_URL}/verify-email/{uid}/{token}/"

        send_mail(
            subject="Confirmez votre adresse email — PlanifyX",
            message=(
                f"Bonjour {first_name},\n\n"
                f"Merci de vous être inscrit sur PlanifyX.\n\n"
                f"Cliquez sur ce lien pour activer votre compte :\n"
                f"{verification_url}\n\n"
                f"Ce lien est valable 24h.\n\n"
                f"Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )

        return user


class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            raise serializers.ValidationError("L'email et le mot de passe sont obligatoires.")

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Aucun compte n'est associé à cette adresse email.")

        if not user.check_password(password):
            raise serializers.ValidationError("Le mot de passe est incorrect.")

        if not user.is_active:
            raise serializers.ValidationError(
                "Votre compte n'est pas encore activé. Vérifiez votre boîte mail."
            )

        data["user"] = user
        return data


class UserProfileSerializer(serializers.ModelSerializer):
    prenom = serializers.CharField(source="first_name")
    nom = serializers.CharField(source="last_name")
    entreprise = serializers.CharField(source="entreprise.nom", read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "prenom",
            "nom",
            "email",
            "role",
            "entreprise",
            "telephone",
            "adresse",
            "poste",
        )
        read_only_fields = (
            "id",
            "email",
            "role",
            "entreprise",
        )

    def update(self, instance, validated_data):
        first_name = validated_data.pop("first_name", None)
        last_name = validated_data.pop("last_name", None)

        if first_name is not None:
            instance.first_name = first_name

        if last_name is not None:
            instance.last_name = last_name

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate(self, data):
        email = data.get("email")

        if not User.objects.filter(email=email).exists():
            raise serializers.ValidationError("Aucun compte n'est associé à cette adresse email.")

        return data

    def save(self):
        email = self.validated_data["email"]

        try:
            user = User.objects.get(email=email)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"

            send_mail(
                subject="Réinitialisation de votre mot de passe",
                message=f"Cliquez sur ce lien pour réinitialiser votre mot de passe : {reset_url}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
        except User.DoesNotExist:
            pass


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        validate_password(value)

        if len(value) < 8:
            raise serializers.ValidationError("Le mot de passe doit contenir au moins 8 caractères.")
        if not re.search(r"[A-Z]", value):
            raise serializers.ValidationError("Le mot de passe doit contenir au moins une majuscule.")
        if not re.search(r"[a-z]", value):
            raise serializers.ValidationError("Le mot de passe doit contenir au moins une minuscule.")
        if not re.search(r"[0-9]", value):
            raise serializers.ValidationError("Le mot de passe doit contenir au moins un chiffre.")
        if not re.search(r"[!@#\$%\^&\*\(\)_\+\-=\[\]{};:,\.<>\?]", value):
            raise serializers.ValidationError("Le mot de passe doit contenir au moins un caractère spécial.")

        return value

    def validate(self, data):
        try:
            uid = force_str(urlsafe_base64_decode(data["uid"]))
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError):
            raise serializers.ValidationError("Lien invalide.")

        if not default_token_generator.check_token(user, data["token"]):
            raise serializers.ValidationError("Ce lien a expiré ou est invalide.")

        data["user"] = user
        return data

    def save(self):
        user = self.validated_data["user"]
        user.set_password(self.validated_data["new_password"])
        user.is_active = True
        user.save()


class EmployeSerializer(serializers.ModelSerializer):
    prenom = serializers.CharField(source="first_name")
    nom = serializers.CharField(source="last_name")
    est_valide = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "prenom",
            "nom",
            "email",
            "telephone",
            "adresse",
            "poste",
            "role",
            "est_valide",
        )
        read_only_fields = ("id", "est_valide")

    def get_est_valide(self, obj):
        return obj.has_usable_password()

    def validate_role(self, value):
        request = self.context["request"]

        if self.instance and self.instance.role == "ADMIN":
            return "ADMIN"

        if value not in ["MANAGER", "VENDEUR"]:
            raise serializers.ValidationError("Le rôle doit être MANAGER ou VENDEUR.")

        if request.user.role != "ADMIN":
            raise serializers.ValidationError("Seul un administrateur peut modifier un rôle.")

        return value

    def validate_email(self, value):
        qs = User.objects.filter(email=value)

        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            raise serializers.ValidationError("Un employé avec cet email existe déjà.")

        return value

    def create(self, validated_data):
        request_user = self.context["request"].user
        first_name = validated_data.pop("first_name")
        last_name = validated_data.pop("last_name")

        user = User.objects.create_user(
            email=validated_data["email"],
            password=None,
            first_name=first_name,
            last_name=last_name,
            role=validated_data["role"],
            entreprise=request_user.entreprise,
            telephone=validated_data.get("telephone", ""),
            adresse=validated_data.get("adresse", ""),
            poste=validated_data.get("poste", ""),
        )

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"

        send_mail(
            subject="Bienvenue — Définissez votre mot de passe",
            message=(
                f"Bonjour {user.first_name},\n\n"
                f"Votre compte a été créé. Cliquez sur ce lien pour définir votre mot de passe :\n"
                f"{reset_url}\n\n"
                f"Ce lien est valable 24h."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )

        return user

    def update(self, instance, validated_data):
        first_name_data = validated_data.pop("first_name", None)
        last_name_data = validated_data.pop("last_name", None)

        if first_name_data is not None:
            instance.first_name = first_name_data
        if last_name_data is not None:
            instance.last_name = last_name_data

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance


class EmailVerificationSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()

    def validate(self, data):
        try:
            uid = force_str(urlsafe_base64_decode(data["uid"]))
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError):
            raise serializers.ValidationError("Lien invalide.")

        if user.is_active:
            raise serializers.ValidationError("Ce compte est déjà activé.")

        if not default_token_generator.check_token(user, data["token"]):
            raise serializers.ValidationError("Ce lien a expiré ou est invalide.")

        data["user"] = user
        return data

    def save(self):
        user = self.validated_data["user"]
        user.is_active = True
        user.save()