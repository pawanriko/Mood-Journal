# Mood Journal

A simple daily mood journal — log one mood (1–5) per day with a short
note and up to 5 tags, then see your history, a calendar view, streaks
and simple stats.

Stack: Django 5.2 + Django REST Framework backend, React + TypeScript
+ Vite frontend — the same stack as the Personal Finance Dashboard.
Design is black & white only, glossy/blurry glass UI (see the
frontend). Auth is Django session auth + CSRF; no tokens in browser
storage.

## Run the backend

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

The API lives at http://127.0.0.1:8000/api/. The root URL (`/`)
serves the built React SPA once `frontend/dist` exists; until then it
answers with a plain "Mood Journal API" text response.

Create an admin user with `python manage.py createsuperuser`
(admin UI at `/admin/`).

## Run the frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server runs on http://localhost:5173 and proxies `/api` to the
Django backend (see `frontend/vite.config.ts`).

## API summary

All endpoints except the auth ones require a logged-in session
(anonymous requests get 401).

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | `/api/auth/signup/` | `{username, email, password}` → creates the user and logs in |
| POST | `/api/auth/login/` | `{username, password}` |
| POST | `/api/auth/logout/` | Ends the session |
| GET | `/api/auth/me/` | `{username, email}` of the logged-in user |
| GET | `/api/auth/csrf/` | Sets the CSRF cookie for the SPA |
| GET | `/api/entries/?month=YYYY-MM` | Own entries, newest first; optional month filter |
| POST | `/api/entries/` | `{date, mood, note, tags}` — **upsert**: creates (201), or updates the entry for that date (200) |
| GET / PATCH / DELETE | `/api/entries/<id>/` | One entry (own entries only — others' return 404) |
| GET | `/api/entries/today/` | Today's entry, or 404 |
| GET | `/api/stats/` | `{total_entries, current_streak, longest_streak, avg_mood_30d, mood_counts, entries_this_week, entries_this_month}` |
| GET | `/api/calendar/?month=YYYY-MM` | `{"YYYY-MM-DD": mood, ...}` for the month (defaults to the current month) |

Rules: mood is an integer 1–5, note at most 500 characters, at most
5 tags, one entry per user per day. A streak counts consecutive days
with an entry, ending today — or yesterday when today has no entry
yet; it is 0 when neither today nor yesterday has one.

## Tests

```bash
python manage.py test
```

## Production build

```bash
cd frontend && npm run build   # emits frontend/dist (Vite base '/static/')
cd ..
python manage.py collectstatic --noinput
gunicorn moodjournal.wsgi:application
```

`collectstatic` also works before the frontend is built: the static
dirs are only added when `frontend/dist` exists. Set
`DJANGO_SECRET_KEY`, `DJANGO_DEBUG=false` and `DJANGO_ALLOWED_HOSTS`
in the environment; set `DATABASE_URL` (e.g. a Neon Postgres URL) to
use Postgres instead of the local SQLite file.
