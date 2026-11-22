import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import type { Entry } from '../lib/types';
import { formatDate, parseTags, todayString } from '../lib/moods';
import { MoodPicker } from './MoodPicker';

interface EntryInput {
  date: string;
  mood: number;
  note: string;
  tags: string[];
}

/** Shared entry form: used for today's entry on the dashboard and for
 *  editing any day from history or the calendar. Saving upserts by
 *  date, so saving today twice updates the same entry. */
export function EntryForm({
  date,
  initial,
  submitLabel,
  onSaved,
}: {
  date: string;
  initial?: Entry | null;
  submitLabel: string;
  onSaved?: () => void;
}) {
  const [mood, setMood] = useState<number | null>(initial?.mood ?? null);
  const [note, setNote] = useState(initial?.note ?? '');
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '));
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: (input: EntryInput) => api.post<Entry>('/entries/', input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['entries'] });
      await queryClient.invalidateQueries({ queryKey: ['today'] });
      await queryClient.invalidateQueries({ queryKey: ['stats'] });
      await queryClient.invalidateQueries({ queryKey: ['calendar'] });
      setError(null);
      onSaved?.();
    },
    onError: (err: unknown) => {
      setError(
        err instanceof ApiError
          ? err.detail
          : 'Could not save this entry. Check your connection and try again.',
      );
    },
  });

  const isToday = date === todayString();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (mood === null) {
      setError('Pick a mood first, then save.');
      return;
    }
    if (note.length > 500) {
      setError('Keep the note under 500 characters.');
      return;
    }
    save.mutate({ date, mood, note: note.trim(), tags: parseTags(tags) });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div>
        <p className="caption-1 mb-2" style={{ color: 'var(--muted)' }}>
          {isToday ? 'Today' : formatDate(date)}
        </p>
        <MoodPicker value={mood} onChange={(m) => { setMood(m); setError(null); }} />
        {mood === null ? (
          <p className="caption-4 mt-2" style={{ color: 'var(--muted)' }}>
            Choose one of the five moods above.
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={`note-${date}`} className="label">
          A few words about today
        </label>
        <textarea
          id={`note-${date}`}
          className="input min-h-24 resize-y"
          value={note}
          maxLength={500}
          rows={3}
          placeholder="What made today feel this way?"
          onChange={(e) => setNote(e.target.value)}
        />
        <p className="caption-5 mt-1 text-right" style={{ color: 'var(--muted)' }}>
          {note.length} of 500 characters
        </p>
      </div>

      <div>
        <label htmlFor={`tags-${date}`} className="label">
          Tags
        </label>
        <input
          id={`tags-${date}`}
          className="input"
          value={tags}
          placeholder="work, family, rest — separate tags with commas"
          onChange={(e) => setTags(e.target.value)}
        />
        <p className="caption-5 mt-1" style={{ color: 'var(--muted)' }}>
          Optional. Separate tags with commas.
        </p>
      </div>

      {error ? (
        <p className="body-5 rounded-lg px-3 py-2" role="alert" style={{ background: 'var(--danger-soft)' }}>
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary self-start" disabled={save.isPending}>
        {save.isPending ? 'Saving…' : submitLabel}
      </button>
      {save.isSuccess ? (
        <p className="caption-1" role="status">
          Saved. Your entry is up to date.
        </p>
      ) : null}
    </form>
  );
}
