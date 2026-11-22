"""Models for the Mood Journal: one entry per user per day."""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxLengthValidator, MaxValueValidator, MinValueValidator
from django.db import models

MAX_TAGS = 5
MAX_NOTE_CHARS = 500


class MoodEntry(models.Model):
    """A single day's mood entry. A user has at most one entry per
    date — re-logging the same day updates the existing entry
    (upsert) instead of creating a second one."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="mood_entries",
    )
    date = models.DateField()
    mood = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Mood on a 1–5 scale (1 = very low, 5 = great).",
    )
    note = models.TextField(
        blank=True,
        validators=[MaxLengthValidator(MAX_NOTE_CHARS)],
        help_text="Short note, at most 500 characters.",
    )
    tags = models.JSONField(
        default=list,
        blank=True,
        help_text="Up to 5 short tags, e.g. ['work', 'sleep'].",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "date"],
                name="unique_mood_entry_per_user_per_date",
            )
        ]
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.user} — {self.date}: {self.mood}/5"

    def clean(self):
        super().clean()
        tags = self.tags if self.tags is not None else []
        if not isinstance(tags, list):
            raise ValidationError({"tags": "Tags must be a list of strings."})
        if len(tags) > MAX_TAGS:
            raise ValidationError(
                {"tags": f"At most {MAX_TAGS} tags are allowed."}
            )
        for tag in tags:
            if not isinstance(tag, str) or not tag.strip():
                raise ValidationError(
                    {"tags": "Each tag must be a non-empty string."}
                )
