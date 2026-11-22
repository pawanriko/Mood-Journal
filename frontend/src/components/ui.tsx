import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { X } from '@phosphor-icons/react';

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2"
        style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
        aria-hidden="true"
      />
      {label ? <p className="caption-1" style={{ color: 'var(--muted)' }}>{label}</p> : null}
    </div>
  );
}

/** Skeleton shaped like the real layout, never a circular spinner. */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className}`}
      style={{ background: 'var(--accent-soft)' }}
      aria-hidden="true"
    />
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <p className="title-2">{title}</p>
      <p className="body-6 max-w-md" style={{ color: 'var(--muted)' }}>{body}</p>
      {action}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      className="card flex flex-col gap-2 rounded-lg px-4 py-3"
      role="alert"
      style={{ borderWidth: 1.5 }}
    >
      <p className="body-4">{message}</p>
      {onRetry ? (
        <button type="button" className="btn btn-ghost btn-sm self-start" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="anim-overlay fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="anim-modal card w-full max-w-lg p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="heading-6">{title}</h2>
          <button
            type="button"
            className="btn btn-ghost btn-sm shrink-0"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} weight="bold" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  busy,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="body-3 mb-6" style={{ color: 'var(--muted)' }}>{body}</p>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'Deleting…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/** Five dots, filled up to the mood value. The monochrome way to show
 *  a mood: solid vs hollow, plus the label next to it. */
export function MoodDots({ mood, size = 8 }: { mood: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className="inline-block rounded-full"
          style={{
            width: size,
            height: size,
            background: n <= mood ? 'var(--accent)' : 'transparent',
            border: '1.5px solid var(--accent)',
          }}
        />
      ))}
    </span>
  );
}
