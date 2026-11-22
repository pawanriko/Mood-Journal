import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PencilSimple, Trash } from '@phosphor-icons/react';
import { api, ApiError } from '../lib/api';
import type { Entry } from '../lib/types';
import { formatShortDate } from '../lib/moods';
import { ConfirmDialog, Modal } from './ui';
import { MoodLabel } from './MoodPicker';
import { EntryForm } from './EntryForm';

export function EntryCard({ entry }: { entry: Entry }) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: () => api.delete(`/entries/${entry.id}/`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['entries'] });
      await queryClient.invalidateQueries({ queryKey: ['today'] });
      await queryClient.invalidateQueries({ queryKey: ['stats'] });
      await queryClient.invalidateQueries({ queryKey: ['calendar'] });
      setConfirmingDelete(false);
    },
    onError: (err: unknown) => {
      setError(
        err instanceof ApiError
          ? err.detail
          : 'Could not delete this entry. Check your connection and try again.',
      );
    },
  });

  return (
    <article className="card liquid-card card-hover p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <MoodLabel mood={entry.mood} />
          <p className="caption-1" style={{ color: 'var(--muted)' }}>
            {formatShortDate(entry.date)}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setEditing(true)}
            aria-label={`Edit entry from ${formatShortDate(entry.date)}`}
          >
            <PencilSimple size={16} />
            Edit
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setConfirmingDelete(true)}
            aria-label={`Delete entry from ${formatShortDate(entry.date)}`}
          >
            <Trash size={16} />
            Delete
          </button>
        </div>
      </div>

      {entry.note ? <p className="body-3 mt-4">{entry.note}</p> : null}

      {entry.tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {entry.tags.map((tag) => (
            <span key={tag} className="badge badge-grey">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="body-5 mt-4 rounded-lg px-3 py-2" role="alert" style={{ background: 'var(--danger-soft)' }}>
          {error}
        </p>
      ) : null}

      {editing ? (
        <Modal title={`Edit ${formatShortDate(entry.date)}`} onClose={() => setEditing(false)}>
          <EntryForm
            date={entry.date}
            initial={entry}
            submitLabel="Save changes"
            onSaved={() => setEditing(false)}
          />
        </Modal>
      ) : null}

      {confirmingDelete ? (
        <ConfirmDialog
          title="Delete this entry?"
          body={`This removes your entry from ${formatShortDate(entry.date)}. You cannot undo this.`}
          confirmLabel="Delete entry"
          busy={remove.isPending}
          onConfirm={() => remove.mutate()}
          onCancel={() => setConfirmingDelete(false)}
        />
      ) : null}
    </article>
  );
}
