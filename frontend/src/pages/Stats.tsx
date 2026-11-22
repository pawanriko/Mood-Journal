import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Stats } from '../lib/types';
import { MOODS, moodLabel } from '../lib/moods';
import { EmptyState, ErrorBanner, Skeleton } from '../components/ui';
import { MoodDots } from '../components/ui';

function StatTile({
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

export function StatsPage() {
  const statsQuery = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get<Stats>('/stats/'),
  });

  const stats = statsQuery.data;
  const total = stats
    ? Object.values(stats.mood_counts).reduce((a, b) => a + b, 0)
    : 0;
  const avg = stats?.avg_mood_30d;
  const avgText =
    avg === null || avg === undefined
      ? 'No entries yet'
      : `${avg.toFixed(1)} of 5 · ${moodLabel(Math.round(avg))}`;

  return (
    <div className="anim-page flex flex-col gap-6">
      <section className="max-w-[680px]">
        <h1 className="heading-3 hero-text">Stats</h1>
        <p className="body-3 mt-2" style={{ color: 'var(--muted)' }}>
          The shape of your mood over time. Bars are filled by count, never by colour.
        </p>
      </section>

      {statsQuery.isPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : statsQuery.isError ? (
        <ErrorBanner
          message="Could not load your stats. Check your connection and try again."
          onRetry={() => void statsQuery.refetch()}
        />
      ) : stats && stats.total_entries === 0 ? (
        <div className="card">
          <EmptyState
            title="No stats yet"
            body="Write your first entry from the dashboard and your stats will start building here."
          />
        </div>
      ) : stats ? (
        <>
          <section aria-label="Overview" className="blur-siblings lift-on-hover grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Average mood, last 30 days"
              value={avgText}
              hint="Out of 5, across your recent entries."
              delay="0ms"
            />
            <StatTile
              label="Current streak"
              value={`${stats.current_streak} ${stats.current_streak === 1 ? 'day' : 'days'}`}
              hint="One entry a day keeps it going."
              delay="60ms"
            />
            <StatTile
              label="Longest streak"
              value={`${stats.longest_streak} ${stats.longest_streak === 1 ? 'day' : 'days'}`}
              hint="Your best run so far."
              delay="120ms"
            />
            <StatTile
              label="Total entries"
              value={String(stats.total_entries)}
              hint={`${stats.entries_this_week} this week · ${stats.entries_this_month} this month`}
              delay="180ms"
            />
          </section>

          <section className="card p-4 sm:p-6" aria-label="Mood distribution">
            <h2 className="heading-6 mb-2">Mood distribution</h2>
            <p className="caption-1 mb-6" style={{ color: 'var(--muted)' }}>
              How often each mood shows up across all your entries.
            </p>
            <div className="flex flex-col gap-4">
              {MOODS.map((m) => {
                const count = stats.mood_counts[String(m.value)] ?? 0;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={m.value} className="flex items-center gap-4">
                    <div className="flex w-32 shrink-0 items-center gap-2">
                      <MoodDots mood={m.value} size={7} />
                      <span className="title-4">{m.label}</span>
                    </div>
                    <div
                      className="h-8 flex-1 overflow-hidden rounded-lg"
                      style={{ background: 'var(--accent-soft)' }}
                      role="img"
                      aria-label={`${m.label}: ${count} entries, ${pct} percent`}
                    >
                      <div
                        className="h-full rounded-lg transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                        style={{ width: `${pct}%`, background: 'var(--accent)' }}
                      />
                    </div>
                    <span className="body-4 w-16 shrink-0 text-right">
                      {count} · {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
