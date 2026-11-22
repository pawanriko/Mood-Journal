"""API views. Every queryset is scoped to ``request.user`` — a user
can only ever see or change their own entries (per-user isolation is
also covered by tests). Auth is Django session auth + CSRF.
"""

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import MoodEntry
from .serializers import (
    LoginSerializer,
    MoodEntrySerializer,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()


def _parse_month(value):
    """Parse a YYYY-MM query value; return (year, month) or None when
    the value is missing or malformed."""
    if not value:
        return None
    try:
        year, month = value.split("-")
        year, month = int(year), int(month)
    except ValueError:
        return None
    if not (1 <= month <= 12):
        return None
    return year, month


class MoodEntryViewSet(viewsets.ModelViewSet):
    """Entries, newest date first. POST upserts: logging a date that
    already has an entry updates it (200) instead of creating a
    second one (201)."""

    queryset = MoodEntry.objects.all()
    serializer_class = MoodEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = self.queryset.filter(user=self.request.user)
        month = self.request.query_params.get("month")
        if month:
            parsed = _parse_month(month)
            if parsed is None:
                return qs.none()
            year, month_num = parsed
            qs = qs.filter(date__year=year, date__month=month_num)
        return qs

    def create(self, request, *args, **kwargs):
        existing = MoodEntry.objects.filter(
            user=request.user, date=request.data.get("date")
        ).first()
        if existing is not None:
            serializer = self.get_serializer(
                existing, data=request.data, partial=True
            )
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data, status=status.HTTP_200_OK)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ---------------------------------------------------------------------------
# Single-purpose endpoints (explicit paths, listed before the router so
# e.g. /entries/today/ can never be swallowed by the detail route)
# ---------------------------------------------------------------------------

class TodayEntryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        entry = get_object_or_404(
            MoodEntry, user=request.user, date=timezone.now().date()
        )
        return Response(MoodEntrySerializer(entry).data)


class StatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(services.user_stats(request.user))


class CalendarView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        month = request.query_params.get("month")
        parsed = _parse_month(month)
        if parsed is None:
            today = timezone.now().date()
            year, month_num = today.year, today.month
        else:
            year, month_num = parsed
        entries = MoodEntry.objects.filter(
            user=request.user, date__year=year, date__month=month_num
        ).values_list("date", "mood")
        return Response({d.isoformat(): m for d, m in entries})


# ---------------------------------------------------------------------------
# Auth (session + CSRF)
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([permissions.AllowAny])
@ensure_csrf_cookie
def csrf_view(request):
    return Response({"detail": "CSRF cookie set."})


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def signup_view(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    login(request, user)
    return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = authenticate(
        request,
        username=serializer.validated_data["username"],
        password=serializer.validated_data["password"],
    )
    if user is None:
        return Response(
            {"detail": "Invalid username or password."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    login(request, user)
    return Response(UserSerializer(user).data)


@api_view(["POST"])
def logout_view(request):
    logout(request)
    return Response({"detail": "Logged out."})


@api_view(["GET"])
def me_view(request):
    return Response(UserSerializer(request.user).data)
