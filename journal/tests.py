"""Tests for the Mood Journal backend.

Covers model validation, auth gating, entry CRUD + upsert, the today
endpoint, stats (streaks, averages, counts) and the calendar map.
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import MoodEntry
from .services import compute_streaks

User = get_user_model()


def today():
    return timezone.now().date()


def make_user(username, password="testpass123"):
    return User.objects.create_user(
        username=username, email=f"{username}@example.com", password=password
    )


def make_entry(user, day, mood=4, note="", tags=None):
    return MoodEntry.objects.create(
        user=user, date=day, mood=mood, note=note, tags=tags or []
    )


class ModelValidationTests(TestCase):
    def setUp(self):
        self.user = make_user("alice")

    def test_mood_must_be_between_1_and_5(self):
        for bad in (0, 6, -1):
            with self.subTest(mood=bad):
                entry = MoodEntry(user=self.user, date=today(), mood=bad)
                with self.assertRaises(ValidationError):
                    entry.full_clean()

    def test_mood_boundaries_are_valid(self):
        for good in (1, 5):
            entry = MoodEntry(user=self.user, date=today(), mood=good)
            entry.full_clean()  # must not raise

    def test_note_longer_than_500_chars_is_rejected(self):
        entry = MoodEntry(user=self.user, date=today(), mood=3, note="x" * 501)
        with self.assertRaises(ValidationError):
            entry.full_clean()

    def test_note_of_exactly_500_chars_is_valid(self):
        entry = MoodEntry(user=self.user, date=today(), mood=3, note="x" * 500)
        entry.full_clean()  # must not raise

    def test_more_than_5_tags_is_rejected(self):
        entry = MoodEntry(
            user=self.user,
            date=today(),
            mood=3,
            tags=["a", "b", "c", "d", "e", "f"],
        )
        with self.assertRaises(ValidationError):
            entry.full_clean()

    def test_one_entry_per_user_per_date(self):
        make_entry(self.user, today(), mood=4)
        duplicate = MoodEntry(user=self.user, date=today(), mood=2)
        with self.assertRaises(ValidationError):
            duplicate.full_clean()
        with self.assertRaises(IntegrityError):
            MoodEntry.objects.create(user=self.user, date=today(), mood=2)

    def test_same_date_allowed_for_different_users(self):
        other = make_user("bob")
        make_entry(self.user, today(), mood=4)
        make_entry(other, today(), mood=2)  # must not raise
        self.assertEqual(MoodEntry.objects.count(), 2)


class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user("alice")

    def test_anonymous_requests_are_rejected(self):
        for method, url in [
            ("get", "/api/entries/"),
            ("get", "/api/stats/"),
            ("get", "/api/calendar/"),
            ("get", "/api/entries/today/"),
            ("get", "/api/auth/me/"),
            ("post", "/api/entries/"),
        ]:
            with self.subTest(method=method, url=url):
                response = getattr(self.client, method)(url, {})
                self.assertIn(response.status_code, (401, 403))

    def test_signup_creates_user_and_logs_in(self):
        response = self.client.post(
            "/api/auth/signup/",
            {"username": "carol", "email": "carol@example.com", "password": "testpass123"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["username"], "carol")
        self.assertTrue(User.objects.filter(username="carol").exists())
        # The signup session is live: /me/ answers as carol.
        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data["username"], "carol")

    def test_signup_rejects_duplicate_username(self):
        response = self.client.post(
            "/api/auth/signup/",
            {"username": "alice", "email": "a2@example.com", "password": "testpass123"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_login_logout_flow(self):
        response = self.client.post(
            "/api/auth/login/",
            {"username": "alice", "password": "testpass123"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["username"], "alice")

        bad = self.client.post(
            "/api/auth/login/",
            {"username": "alice", "password": "wrongpass"},
            format="json",
        )
        self.assertEqual(bad.status_code, 400)

        out = self.client.post("/api/auth/logout/")
        self.assertEqual(out.status_code, 200)
        # Session auth has no WWW-Authenticate challenge, so DRF coerces
        # the 401 into a 403 for anonymous requests (same as /api/entries/).
        self.assertIn(self.client.get("/api/auth/me/").status_code, (401, 403))


class EntryApiTests(TestCase):
    def setUp(self):
        self.user = make_user("alice")
        self.other = make_user("bob")
        self.client = APIClient()
        self.client.login(username="alice", password="testpass123")

    def _list(self, **params):
        response = self.client.get("/api/entries/", params)
        self.assertEqual(response.status_code, 200)
        return response.data["results"]

    def test_create_entry(self):
        response = self.client.post(
            "/api/entries/",
            {"date": str(today()), "mood": 5, "note": "Great day", "tags": ["sun"]},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["mood"], 5)
        self.assertEqual(MoodEntry.objects.filter(user=self.user).count(), 1)

    def test_create_rejects_bad_mood_and_long_note(self):
        for payload in (
            {"date": str(today()), "mood": 0},
            {"date": str(today()), "mood": 6},
            {"date": str(today()), "mood": 3, "note": "x" * 501},
            {"date": str(today()), "mood": 3, "tags": ["1", "2", "3", "4", "5", "6"]},
        ):
            response = self.client.post("/api/entries/", payload, format="json")
            self.assertEqual(response.status_code, 400, payload)

    def test_upsert_updates_existing_date(self):
        day = today() - timedelta(days=1)
        first = self.client.post(
            "/api/entries/",
            {"date": str(day), "mood": 2, "note": "Rough", "tags": ["work"]},
            format="json",
        )
        self.assertEqual(first.status_code, 201)
        second = self.client.post(
            "/api/entries/",
            {"date": str(day), "mood": 4, "note": "Better now"},
            format="json",
        )
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.data["mood"], 4)
        self.assertEqual(second.data["note"], "Better now")
        # Tags were not sent on the second call: the old tags survive.
        self.assertEqual(second.data["tags"], ["work"])
        self.assertEqual(
            MoodEntry.objects.filter(user=self.user, date=day).count(), 1
        )

    def test_list_newest_first_and_month_filter(self):
        created = [
            make_entry(self.user, today() - timedelta(days=40), mood=2),
            make_entry(self.user, today() - timedelta(days=2), mood=3),
            make_entry(self.user, today(), mood=5),
        ]
        entries = self._list()
        self.assertEqual(len(entries), 3)
        dates = [e["date"] for e in entries]
        self.assertEqual(dates, sorted(dates, reverse=True))

        month = today().strftime("%Y-%m")
        filtered = self._list(month=month)
        expected = [e for e in created if e.date.strftime("%Y-%m") == month]
        self.assertEqual(len(filtered), len(expected))
        self.assertTrue(all(e["date"].startswith(month) for e in filtered))

    def test_detail_patch_delete(self):
        entry = make_entry(self.user, today(), mood=3, note="ok")
        url = f"/api/entries/{entry.id}/"

        detail = self.client.get(url)
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["mood"], 3)

        patched = self.client.patch(url, {"mood": 5}, format="json")
        self.assertEqual(patched.status_code, 200)
        self.assertEqual(patched.data["mood"], 5)
        entry.refresh_from_db()
        self.assertEqual(entry.mood, 5)

        deleted = self.client.delete(url)
        self.assertEqual(deleted.status_code, 204)
        self.assertFalse(MoodEntry.objects.filter(pk=entry.id).exists())

    def test_other_users_entries_are_invisible(self):
        entry = make_entry(self.other, today(), mood=1)
        url = f"/api/entries/{entry.id}/"
        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertEqual(
            self.client.patch(url, {"mood": 5}, format="json").status_code, 404
        )
        self.assertEqual(self.client.delete(url).status_code, 404)
        self.assertEqual(len(self._list()), 0)

    def test_today_endpoint(self):
        self.assertEqual(self.client.get("/api/entries/today/").status_code, 404)
        make_entry(self.user, today(), mood=4, note="today")
        response = self.client.get("/api/entries/today/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["mood"], 4)
        self.assertEqual(response.data["note"], "today")


class StatsTests(TestCase):
    def setUp(self):
        self.user = make_user("alice")
        self.client = APIClient()
        self.client.login(username="alice", password="testpass123")

    def _stats(self):
        response = self.client.get("/api/stats/")
        self.assertEqual(response.status_code, 200)
        return response.data

    def test_empty_stats(self):
        stats = self._stats()
        self.assertEqual(stats["total_entries"], 0)
        self.assertEqual(stats["current_streak"], 0)
        self.assertEqual(stats["longest_streak"], 0)
        self.assertIsNone(stats["avg_mood_30d"])
        self.assertEqual(stats["mood_counts"], {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0})
        self.assertEqual(stats["entries_this_week"], 0)
        self.assertEqual(stats["entries_this_month"], 0)

    def test_streak_counts_back_from_today(self):
        for delta in (0, 1, 2):
            make_entry(self.user, today() - timedelta(days=delta), mood=4)
        stats = self._stats()
        self.assertEqual(stats["current_streak"], 3)
        self.assertEqual(stats["longest_streak"], 3)

    def test_streak_counts_back_from_yesterday_when_no_entry_today(self):
        for delta in (1, 2):
            make_entry(self.user, today() - timedelta(days=delta), mood=4)
        stats = self._stats()
        self.assertEqual(stats["current_streak"], 2)
        self.assertEqual(stats["longest_streak"], 2)

    def test_gap_breaks_current_streak_but_not_longest(self):
        # A 3-day run a week ago, then only today: current 1, longest 3.
        for delta in (7, 8, 9):
            make_entry(self.user, today() - timedelta(days=delta), mood=3)
        make_entry(self.user, today(), mood=5)
        stats = self._stats()
        self.assertEqual(stats["current_streak"], 1)
        self.assertEqual(stats["longest_streak"], 3)

    def test_no_recent_entry_means_zero_streak(self):
        make_entry(self.user, today() - timedelta(days=5), mood=3)
        stats = self._stats()
        self.assertEqual(stats["current_streak"], 0)
        self.assertEqual(stats["longest_streak"], 1)

    def test_compute_streaks_unit_cases(self):
        ref = today()
        self.assertEqual(compute_streaks(set(), ref), (0, 0))
        self.assertEqual(
            compute_streaks({ref, ref - timedelta(days=1)}, ref), (2, 2)
        )
        self.assertEqual(
            compute_streaks({ref - timedelta(days=1)}, ref), (1, 1)
        )
        self.assertEqual(
            compute_streaks({ref - timedelta(days=2)}, ref), (0, 1)
        )

    def test_avg_mood_30d_and_counts(self):
        make_entry(self.user, today(), mood=5)
        make_entry(self.user, today() - timedelta(days=1), mood=4)
        make_entry(self.user, today() - timedelta(days=2), mood=3)
        # 40 days ago: outside the 30-day window, still counted in totals.
        make_entry(self.user, today() - timedelta(days=40), mood=1)
        stats = self._stats()
        self.assertEqual(stats["total_entries"], 4)
        self.assertAlmostEqual(stats["avg_mood_30d"], 4.0)
        self.assertEqual(
            stats["mood_counts"], {"1": 1, "2": 0, "3": 1, "4": 1, "5": 1}
        )

    def test_entries_this_week_and_month(self):
        week_start = today() - timedelta(days=today().weekday())
        make_entry(self.user, week_start, mood=4)
        make_entry(self.user, today(), mood=5)
        make_entry(self.user, today() - timedelta(days=40), mood=2)
        stats = self._stats()
        self.assertEqual(stats["entries_this_week"], 2)
        in_month = 1 + (1 if week_start.month == today().month else 0)
        self.assertEqual(stats["entries_this_month"], in_month)

    def test_stats_ignore_other_users(self):
        other = make_user("bob")
        make_entry(other, today(), mood=1)
        make_entry(other, today() - timedelta(days=1), mood=1)
        make_entry(self.user, today(), mood=5)
        stats = self._stats()
        self.assertEqual(stats["total_entries"], 1)
        self.assertEqual(stats["current_streak"], 1)
        self.assertEqual(stats["mood_counts"]["1"], 0)


class CalendarTests(TestCase):
    def setUp(self):
        self.user = make_user("alice")
        self.client = APIClient()
        self.client.login(username="alice", password="testpass123")

    def test_calendar_map_for_month(self):
        day1 = today().replace(day=1)
        day2 = today().replace(day=2)
        make_entry(self.user, day1, mood=2)
        make_entry(self.user, day2, mood=5)
        # An entry in another month must not leak in.
        other_month = (today().replace(day=1) - timedelta(days=1))
        make_entry(self.user, other_month, mood=1)

        month = today().strftime("%Y-%m")
        response = self.client.get("/api/calendar/", {"month": month})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data,
            {day1.isoformat(): 2, day2.isoformat(): 5},
        )

    def test_calendar_defaults_to_current_month(self):
        make_entry(self.user, today(), mood=4)
        response = self.client.get("/api/calendar/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {today().isoformat(): 4})

    def test_calendar_is_scoped_to_the_user(self):
        other = make_user("bob")
        make_entry(other, today(), mood=1)
        response = self.client.get("/api/calendar/")
        self.assertEqual(response.data, {})
