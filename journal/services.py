"""Stats helpers: streaks and aggregates over a user's entries."""

from datetime import timedelta

from django.db.models import Avg, Count
from django.utils import timezone

from .models import MoodEntry


def compute_streaks(entry_dates, today):
    """Return (current_streak, longest_streak) for a set of dates.

    Current streak = consecutive days with an entry ending today, or
    ending yesterday when there is no entry today yet. It is 0 when
    there is an entry on neither today nor yesterday.
    """
    dates = set(entry_dates)

    # Current streak: start at today, fall back to yesterday.
    cursor = today
    if cursor not in dates:
        cursor = today - timedelta(days=1)
    current = 0
    while cursor in dates:
        current += 1
        cursor -= timedelta(days=1)

    # Longest streak: single pass over the sorted dates.
    longest = 0
    run = 0
    prev = None
    for d in sorted(dates):
        if prev is not None and d == prev + timedelta(days=1):
            run += 1
        else:
            run = 1
        longest = max(longest, run)
        prev = d
    return current, longest


def user_stats(user, today=None):
    """Aggregate stats for the stats endpoint. ``today`` is injectable
    so tests can freeze the reference day."""
    today = today or timezone.now().date()
    qs = MoodEntry.objects.filter(user=user)
    entry_dates = list(qs.values_list("date", flat=True))

    current_streak, longest_streak = compute_streaks(entry_dates, today)

    # Average mood over the last 30 days (today and the 29 days before).
    window_start = today - timedelta(days=29)
    avg = qs.filter(date__gte=window_start, date__lte=today).aggregate(
        avg=Avg("mood")
    )["avg"]
    avg_mood_30d = round(float(avg), 2) if avg is not None else None

    mood_counts = {str(m): 0 for m in range(1, 6)}
    for row in qs.values("mood").annotate(n=Count("id")):
        mood_counts[str(row["mood"])] = row["n"]

    week_start = today - timedelta(days=today.weekday())  # Monday
    entries_this_week = qs.filter(date__gte=week_start, date__lte=today).count()
    entries_this_month = qs.filter(
        date__year=today.year, date__month=today.month
    ).count()

    return {
        "total_entries": qs.count(),
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "avg_mood_30d": avg_mood_30d,
        "mood_counts": mood_counts,
        "entries_this_week": entries_this_week,
        "entries_this_month": entries_this_month,
    }
