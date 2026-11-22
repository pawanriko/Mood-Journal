"""URL configuration for the Mood Journal backend."""

from pathlib import Path

from django.conf import settings
from django.contrib import admin
from django.http import HttpResponse, JsonResponse
from django.urls import include, path, re_path
from django.views.generic import TemplateView


def api_not_found(request, *args, **kwargs):
    """JSON 404 for unknown /api/ paths.

    Without this, an unmatched /api/... URL falls through Django's
    resolver to the SPA catch-all below and comes back as HTML 200.
    """
    return JsonResponse({"detail": "Not found."}, status=404)


def spa_or_api(request):
    """Serve the built React SPA when it exists; otherwise a plain
    text response. The frontend agent builds frontend/dist later —
    until then the backend still answers health checks at /."""
    index = Path(settings.BASE_DIR) / "frontend" / "dist" / "index.html"
    if index.is_file():
        return TemplateView.as_view(template_name="index.html")(request)
    return HttpResponse("Mood Journal API", content_type="text/plain")


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("journal.urls")),
    # Unknown API paths are a real 404, not the SPA.
    re_path(r"^api/.*$", api_not_found),
    # Catch-all LAST: serve the built React SPA for every non-API,
    # non-admin path, so React Router works on refresh and deep links.
    # Static assets under /static/ are served by WhiteNoise before URL
    # resolution, so they never reach this route.
    re_path(r"^.*$", spa_or_api),
]
