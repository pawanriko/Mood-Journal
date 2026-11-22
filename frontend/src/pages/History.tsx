import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAll } from '../lib/api';
import type { Entry } from '../lib/types';
import { monthString } from '../lib/moods';
import { EntryCard } from '../components/EntryCard';
import { EmptyState, ErrorBanner, Skeleton } from '../components/ui';

export function HistoryPage() {
  const [month, setMonth] = useState(monthString(new Date()));

  const entriesQuery = useQuery({
    queryKey: ['entries', 'history', month],
    queryFn: () => fetchAll<Entry>(`/entries/?month=${month}`),
  });

  const entries = entriesQuery.data ?? [];
  const [year, monthNum] = month.split('-').map(Number);
  const monthName = new Date(year, monthNum - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="anim-page flex flex-col gap-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-[680px]">
          <h1 className="heading-3 hero-text">History</h1>
          <p className="body-3 mt-2" style={{ color: 'var(--muted)' }}>
            Every entry you wrote, newest first. Pick a month to look further back.
          </p>
        </div>
        <div className="shrink-0">
          <label htmlFor="month-filter" className="label">
            Month
          </label>
          <input
            id="month-filter"
            type="month"
            className="input"
            value={month}
            onChange={(e) => {
              if (e.target.value) setMonth(e.target.value);
            }}
          />
        </div>
      </section>

      {entriesQuery.isPending ? (
        <div className="flex flex-col gap-4" aria-label="Loading entries">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : entriesQuery.isError ? (
        <ErrorBanner
          message="Could not load your entries. Check your connection and try again."
          onRetry={() => void entriesQuery.refetch()}
        />
      ) : entries.length === 0 ? (
        <div className="card">
          <EmptyState
            title={`Nothing in ${monthName} yet`}
            body="No entries for this month. Write one from the dashboard and it will show up here."
          />
        </div>
      ) : (
        <section aria-label={`Entries from ${monthName}`} className="flex flex-col gap-4">
          <p className="caption-1" style={{ color: 'var(--muted)' }}>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} in {monthName}
          </p>
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </section>
      )}
    </div>
  );
}
