import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface InkState {
  x: number;
  y: number;
  target: Theme;
  phase: 'in' | 'out';
}

interface ThemeCtx {
  theme: Theme;
  /** Toggle with the click point so the ink can start at the button,
   *  like the reel: the splash grows out of the toggle. */
  toggle: (x?: number, y?: number) => void;
}

const ThemeContext = createContext<ThemeCtx>({ theme: 'light', toggle: () => {} });

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem('mj-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

const DROPLETS = [
  { dx: -140, dy: -90, s: 34, d: '40ms' },
  { dx: 150, dy: -70, s: 22, d: '90ms' },
  { dx: -90, dy: 120, s: 26, d: '130ms' },
  { dx: 120, dy: 110, s: 40, d: '70ms' },
  { dx: 0, dy: -170, s: 16, d: '160ms' },
  { dx: -180, dy: 20, s: 18, d: '110ms' },
  { dx: 190, dy: 10, s: 14, d: '180ms' },
  { dx: 40, dy: 170, s: 20, d: '140ms' },
];

/** The ink splash itself: a big irregular blob plus droplets, centred
 *  on the toggle click. It expands to cover the screen in the new
 *  theme's colour, the theme swaps underneath, then it retreats. */
function InkOverlay({ ink }: { ink: InkState }) {
  const isDark = ink.target === 'dark';
  const bg = isDark ? '#000000' : '#faf8f3';
  return (
    <div
      aria-hidden="true"
      className="ink-overlay"
      style={{ left: ink.x, top: ink.y, ['--ink-bg' as string]: bg }}
    >
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <filter id="ink-rough">
            <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="90" />
          </filter>
        </defs>
      </svg>
      <div className={`ink-blob ${ink.phase === 'out' ? 'ink-blob-out' : ''}`}>
        <span className="ink-speck ink-speck-1" />
        <span className="ink-speck ink-speck-2" />
        <span className="ink-speck ink-speck-3" />
      </div>
      {DROPLETS.map((d, i) => (
        <span
          key={i}
          className={`ink-drop ${ink.phase === 'out' ? 'ink-drop-out' : ''}`}
          style={{
            left: d.dx,
            top: d.dy,
            width: d.s,
            height: d.s,
            animationDelay: d.d,
          }}
        />
      ))}
    </div>
  );
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [ink, setInk] = useState<InkState | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('mj-theme', theme);
    } catch {
      // storage unavailable — theme still applies for this session
    }
  }, [theme]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  function toggle(x?: number, y?: number) {
    const target: Theme = theme === 'dark' ? 'light' : 'dark';
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || x === undefined || y === undefined) {
      setTheme(target);
      return;
    }
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setInk({ x, y, target, phase: 'in' });
    // Swap the theme while the ink covers the screen, so the text
    // under it flips colour as the splash passes — like the reel.
    timers.current.push(
      window.setTimeout(() => {
        setTheme(target);
        setInk((prev) => (prev ? { ...prev, phase: 'out' } : prev));
      }, 620),
    );
    timers.current.push(window.setTimeout(() => setInk(null), 1250));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
      {ink ? <InkOverlay ink={ink} /> : null}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeCtx {
  return useContext(ThemeContext);
}
