import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarBlank, Code, Flame, GithubLogo, LinkedinLogo } from '@phosphor-icons/react';
import { api, ApiError } from '../lib/api';
import type { Entry, Stats } from '../lib/types';
import { fetchAll } from '../lib/api';
import { monthString, moodLabel, todayString } from '../lib/moods';
import { EntryForm } from '../components/EntryForm';
import { EntryCard } from '../components/EntryCard';
import { EmptyState, ErrorBanner, Skeleton } from '../components/ui';
import { MoodLabel } from '../components/MoodPicker';

function StatCard({
  label,
  value,
  hint,
  delay,
}: {
  label: string;
  value: string;
  hint: string;
  delay: string;
}) {
  return (
    <div className="card anim-stagger p-4" style={{ animationDelay: delay }}>
      <p className="caption-1" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="heading-4 mt-2">{value}</p>
      <p className="caption-2 mt-1" style={{ color: 'var(--muted)' }}>{hint}</p>
    </div>
  );
}

export function DashboardPage() {
  const today = todayString();

  const todayQuery = useQuery({
    queryKey: ['today'],
    queryFn: () => api.get<Entry>('/entries/today/'),
    retry: (count, err) => (err instanceof ApiError && err.status === 404 ? false : count < 1),
  });
  const statsQuery = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get<Stats>('/stats/'),
  });
  const recentQuery = useQuery({
    queryKey: ['entries', 'recent', monthString(new Date())],
    queryFn: () => fetchAll<Entry>(`/entries/?month=${monthString(new Date())}`),
  });

  const todayEntry = todayQuery.data ?? null;
  const todayMissing = todayQuery.error instanceof ApiError && todayQuery.error.status === 404;
  const stats = statsQuery.data;
  const recent = (recentQuery.data ?? []).slice(0, 3);

  const avg = stats?.avg_mood_30d;
  const avgText =
    avg === null || avg === undefined
      ? 'No entries yet'
      : `${avg.toFixed(1)} of 5 · ${moodLabel(Math.round(avg))}`;

  return (
    <div className="anim-page flex flex-col gap-6">
      <section className="max-w-[680px]">
        <h1 className="heading-3 hero-text">How are you feeling today?</h1>
        <p className="body-3 mt-2" style={{ color: 'var(--muted)' }}>
          One small entry a day. Write what the day felt like, tag what shaped it, and come
          back tomorrow to keep the streak going.
        </p>
      </section>

      <section className="card p-4 sm:p-6" aria-label="Today's mood entry">
        {todayQuery.isPending ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-32" />
          </div>
        ) : todayQuery.isError && !todayMissing ? (
          <ErrorBanner
            message="Could not load today's entry. Check your connection and try again."
            onRetry={() => void todayQuery.refetch()}
          />
        ) : (
          <>
            {todayEntry ? (
              <p className="caption-1 mb-4" style={{ color: 'var(--muted)' }}>
                You already logged today as <span className="font-semibold" style={{ color: 'var(--text)' }}>{moodLabel(todayEntry.mood)}</span>. Saving again updates the same entry.
              </p>
            ) : null}
            <EntryForm date={today} initial={todayEntry} submitLabel={todayEntry ? 'Update today' : 'Save today'} />
          </>
        )}
      </section>

      <section aria-label="Your stats at a glance">
        {statsQuery.isPending ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : statsQuery.isError ? (
          <ErrorBanner
            message="Could not load your stats. Check your connection and try again."
            onRetry={() => void statsQuery.refetch()}
          />
        ) : stats ? (
          <div className="blur-siblings lift-on-hover grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Current streak"
              value={`${stats.current_streak} ${stats.current_streak === 1 ? 'day' : 'days'}`}
              hint={stats.current_streak > 0 ? 'Keep it going tomorrow.' : 'Log today to start one.'}
              delay="0ms"
            />
            <StatCard
              label="Total entries"
              value={String(stats.total_entries)}
              hint={`${stats.entries_this_month} this month`}
              delay="60ms"
            />
            <StatCard
              label="Average mood, last 30 days"
              value={avgText}
              hint="Out of 5, across your recent entries."
              delay="120ms"
            />
          </div>
        ) : null}
      </section>

      <section aria-label="Recent entries">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="heading-6">Recent entries</h2>
          <Link to="/history" className="btn btn-ghost btn-sm">
            See all
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {recentQuery.isPending ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : recentQuery.isError ? (
          <ErrorBanner
            message="Could not load recent entries. Check your connection and try again."
            onRetry={() => void recentQuery.refetch()}
          />
        ) : recent.length === 0 ? (
          <div className="card">
            <EmptyState
              title="No entries yet"
              body="Your first entry is the one above. Once you save it, it shows up here and your streak starts."
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {recent.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </section>

      <section aria-label="About this journal">
        <div className="card flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="stat-icon">
              <Flame size={18} aria-hidden="true" />
            </span>
            <h2 className="title-1">Small days add up</h2>
          </div>
          <p className="body-3" style={{ color: 'var(--muted)' }}>
            A streak is just one entry a day. Miss a day and the count restarts, but your
            history stays. The calendar shows the shape of your month at a glance.
          </p>
          <Link to="/calendar" className="btn btn-ghost self-start">
            <CalendarBlank size={16} aria-hidden="true" />
            Open the calendar
          </Link>
        </div>
      </section>

      <footer className="flex flex-col items-center gap-2 border-t pt-6 pb-2" style={{ borderColor: 'var(--border)' }}>
        <p className="caption-1">Made by Pawan</p>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/pawanriko"
            target="_blank"
            rel="noreferrer"
            className="caption-1 inline-flex items-center gap-1 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            style={{ color: 'var(--muted)' }}
          >
            <GithubLogo size={16} aria-hidden="true" />
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/pawanriko"
            target="_blank"
            rel="noreferrer"
            className="caption-1 inline-flex items-center gap-1 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            style={{ color: 'var(--muted)' }}
          >
            <LinkedinLogo size={16} aria-hidden="true" />
            LinkedIn
          </a>
          <a
            href="https://leetcode.com/pawanriko"
            target="_blank"
            rel="noreferrer"
            className="caption-1 inline-flex items-center gap-1 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            style={{ color: 'var(--muted)' }}
          >
            <Code size={16} aria-hidden="true" />
            LeetCode
          </a>
        </div>
        <p className="caption-5" style={{ color: 'var(--muted)' }}>
          {todayEntry ? (
            <>
              Today: <MoodLabel mood={todayEntry.mood} />
            </>
          ) : (
            'Log today to start your streak.'
          )}
        </p>
      </footer>
    </div>
  );
}
