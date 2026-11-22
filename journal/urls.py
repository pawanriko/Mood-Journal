"""API URL routing for the Mood Journal.

Explicit paths come first: /entries/today/, /stats/ and /calendar/
must be matched before the router's /entries/{pk}/ detail route,
otherwise "today" would be treated as a primary key.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("entries", views.MoodEntryViewSet, basename="entry")

urlpatterns = [
    path("auth/csrf/", views.csrf_view, name="auth-csrf"),
    path("auth/signup/", views.signup_view, name="auth-signup"),
    path("auth/login/", views.login_view, name="auth-login"),
    path("auth/logout/", views.logout_view, name="auth-logout"),
    path("auth/me/", views.me_view, name="auth-me"),
    path("entries/today/", views.TodayEntryView.as_view(), name="entry-today"),
    path("stats/", views.StatsView.as_view(), name="stats"),
    path("calendar/", views.CalendarView.as_view(), name="calendar"),
    path("", include(router.urls)),
]
