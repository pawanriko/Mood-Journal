import { MOODS, moodLabel } from '../lib/moods';

/** Five mood choices. The selected one is solid accent with the label
 *  in the accent text colour; the rest are hollow glass buttons. */
export function MoodPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (mood: number) => void;
}) {
  return (
    <div className="blur-siblings grid grid-cols-5 gap-2" role="radiogroup" aria-label="How are you feeling today">
      {MOODS.map((m) => {
        const selected = value === m.value;
        return (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={m.label}
            onClick={() => onChange(m.value)}
            className={`flex flex-col items-center gap-2 rounded-lg border px-2 py-3 transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] hover:-translate-y-0.5 active:scale-[0.96] ${
              selected ? 'mood-pop' : ''
            }`}
            style={{
              background: selected ? 'var(--accent)' : 'var(--surface)',
              color: selected ? 'var(--on-accent)' : 'var(--text)',
              borderColor: selected ? 'var(--accent)' : 'var(--border)',
            }}
          >
            <span className="flex gap-0.5" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{
                    background:
                      n <= m.value
                        ? selected
                          ? 'var(--on-accent)'
                          : 'var(--accent)'
                        : 'transparent',
                    border: `1.5px solid ${selected ? 'var(--on-accent)' : 'var(--accent)'}`,
                  }}
                />
              ))}
            </span>
            <span className="button-xsm">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function MoodLabel({ mood }: { mood: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className="inline-block h-2 w-2 rounded-full"
            style={{
              background: n <= mood ? 'var(--accent)' : 'transparent',
              border: '1.5px solid var(--accent)',
            }}
          />
        ))}
      </span>
      <span className="title-4">{moodLabel(mood)}</span>
    </span>
  );
}
