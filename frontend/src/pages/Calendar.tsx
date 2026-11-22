import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { api } from '../lib/api';
import { fetchAll } from '../lib/api';
import type { Entry } from '../lib/types';
import { formatDate, monthString, moodLabel, toDateString, todayString } from '../lib/moods';
import { EntryForm } from '../components/EntryForm';
import { ErrorBanner, Modal, MoodDots, Skeleton } from '../components/ui';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function CalendarPage() {
  const now = new Date();
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState<string | null>(null);

  const month = monthString(cursor);
  const monthName = cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const calendarQuery = useQuery({
    queryKey: ['calendar', month],
    queryFn: () => api.get<Record<string, number>>(`/calendar/?month=${month}`),
  });
  const entriesQuery = useQuery({
    queryKey: ['entries', 'calendar', month],
    queryFn: () => fetchAll<Entry>(`/entries/?month=${month}`),
  });

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(toDateString(new Date(cursor.getFullYear(), cursor.getMonth(), d)));
    }
    return cells;
  }, [cursor]);

  const moods = calendarQuery.data ?? {};
  const entriesByDate = useMemo(() => {
    const map = new Map<string, Entry>();
    for (const e of entriesQuery.data ?? []) map.set(e.date, e);
    return map;
  }, [entriesQuery.data]);

  const selectedEntry = selected ? entriesByDate.get(selected) ?? null : null;
  const today = todayString();

  function shift(delta: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
    setSelected(null);
  }

  const loading = calendarQuery.isPending || entriesQuery.isPending;
  const failed = calendarQuery.isError || entriesQuery.isError;

  return (
    <div className="anim-page flex flex-col gap-6">
      <section className="max-w-[680px]">
        <h1 className="heading-3 hero-text">Calendar</h1>
        <p className="body-3 mt-2" style={{ color: 'var(--muted)' }}>
          Your month at a glance. Each day with an entry shows how full its dots are.
          Tap a day to view it or write an entry for it.
        </p>
      </section>

      <section className="card p-4 sm:p-6" aria-label={`Calendar for ${monthName}`}>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="heading-6">{monthName}</h2>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => shift(-1)}
              aria-label="Previous month"
            >
              <CaretLeft size={16} />
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
                setSelected(null);
              }}
            >
              Today
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => shift(1)}
              aria-label="Next month"
            >
              <CaretRight size={16} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-7 gap-2" aria-label="Loading calendar">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-16 sm:h-20" />
            ))}
          </div>
        ) : failed ? (
          <ErrorBanner
            message="Could not load this month. Check your connection and try again."
            onRetry={() => {
              void calendarQuery.refetch();
              void entriesQuery.refetch();
            }}
          />
        ) : (
          <div className="grid grid-cols-7 gap-2" role="grid" aria-label={monthName}>
            {WEEKDAYS.map((d) => (
              <p key={d} className="caption-3 pb-2 text-center" style={{ color: 'var(--muted)' }}>
                {d}
              </p>
            ))}
            {days.map((date, i) => {
              if (date === null) return <span key={`blank-${i}`} aria-hidden="true" />;
              const mood = moods[date];
              const isToday = date === today;
              const isSelected = date === selected;
              const dayNum = Number(date.slice(-2));
              return (
                <button
                  key={date}
                  type="button"
                  role="gridcell"
                  aria-label={
                    mood
                      ? `${formatDate(date)}, mood ${moodLabel(mood)}`
                      : `${formatDate(date)}, no entry yet`
                  }
                  aria-pressed={isSelected}
                  onClick={() => setSelected(date)}
                  className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border px-1 py-2 transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] active:scale-[0.98] sm:min-h-20"
                  style={{
                    background: isSelected
                      ? 'var(--accent-soft)'
                      : mood
                        ? 'var(--surface)'
                        : 'transparent',
                    borderColor: isToday ? 'var(--accent)' : 'var(--border)',
                    borderWidth: isToday ? 2 : 1,
                  }}
                >
                  <span className="button-sm">{dayNum}</span>
                  {mood ? (
                    <MoodDots mood={mood} size={6} />
                  ) : (
                    <span className="caption-5" style={{ color: 'var(--muted)' }}>
                      —
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <p className="caption-2 mt-4" style={{ color: 'var(--muted)' }}>
          Dots show the mood from 1 to 5, filled up to that day's mood. A bold outline marks
          today.
        </p>
      </section>

      {selected ? (
        <Modal title={formatDate(selected)} onClose={() => setSelected(null)}>
          {selectedEntry ? (
            <div className="flex flex-col gap-4">
              <p className="body-3">
                You felt <span className="font-semibold">{moodLabel(selectedEntry.mood)}</span> on
                this day.
              </p>
              {selectedEntry.note ? <p className="body-3">{selectedEntry.note}</p> : null}
              {selectedEntry.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedEntry.tags.map((tag) => (
                    <span key={tag} className="badge badge-grey">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                <EntryForm
                  date={selected}
                  initial={selectedEntry}
                  submitLabel="Save changes"
                  onSaved={() => setSelected(null)}
                />
              </div>
            </div>
          ) : (
            <EntryForm
              date={selected}
              submitLabel="Save entry"
              onSaved={() => setSelected(null)}
            />
          )}
        </Modal>
      ) : null}
    </div>
  );
}
