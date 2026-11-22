"""Serializers. Every writable serializer runs the model's
``full_clean`` so the validation rules in ``models.py`` are enforced
at the API, not just in the Django admin.
"""

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import MoodEntry

User = get_user_model()


class CleanModelMixin:
    """Run ``Model.full_clean()`` during serializer validation."""

    def validate(self, attrs):
        attrs = super().validate(attrs)
        model = self.Meta.model
        instance = self.instance or model()
        for key, value in attrs.items():
            setattr(instance, key, value)
        request = self.context.get("request")
        if (
            hasattr(instance, "user_id")
            and not instance.user_id
            and request
            and request.user.is_authenticated
        ):
            instance.user = request.user
        try:
            instance.full_clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict)
        return attrs


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["username", "email"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["username", "email", "password"]

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class MoodEntrySerializer(CleanModelMixin, serializers.ModelSerializer):
    class Meta:
        model = MoodEntry
        fields = ["id", "date", "mood", "note", "tags", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
