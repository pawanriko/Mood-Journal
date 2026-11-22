import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarBlank,
  ChartBar,
  ClockCounterClockwise,
  House,
  List,
  Plus,
  SignOut,
  Smiley,
  X,
} from '@phosphor-icons/react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';

const NAV = [
  { to: '/', label: 'Dashboard', icon: House, end: true },
  { to: '/history', label: 'History', icon: ClockCounterClockwise, end: false },
  { to: '/calendar', label: 'Calendar', icon: CalendarBlank, end: false },
  { to: '/stats', label: 'Stats', icon: ChartBar, end: false },
];

export function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    navigate('/login', { replace: true });
  }

  function handleFab() {
    const scrollToEntry = () => {
      document.getElementById('today-entry')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    if (location.pathname !== '/') {
      navigate('/');
      window.setTimeout(scrollToEntry, 350);
    } else {
      scrollToEntry();
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="app-blob app-blob-1" aria-hidden="true" />
      <div className="app-blob app-blob-2" aria-hidden="true" />
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <header
        className="sticky top-0 z-40 border-b"
        style={{
          background: 'var(--surface)',
          backdropFilter: 'blur(18px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(18px) saturate(1.4)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="topbar-wordmark flex items-center gap-2" aria-label="Mood Journal home">
            <Smiley size={28} weight="fill" aria-hidden="true" />
            <span>Mood Journal</span>
          </Link>

          <nav aria-label="Main navigation" className="topbar-nav hidden items-center gap-1 overflow-x-auto md:flex">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `topbar-nav-link nav-link ${isActive ? 'active' : ''}`
                }
                aria-current={undefined}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <span className="caption-1 hidden sm:block" style={{ color: 'var(--muted)' }}>
                {user.username}
              </span>
            ) : null}
            <button
              type="button"
              onClick={(e) => toggle(e.clientX, e.clientY)}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="ink-toggle"
            >
              <span className="ink-toggle-dot" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="btn btn-ghost btn-sm hidden md:inline-flex"
            >
              <SignOut size={16} aria-hidden="true" />
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="btn btn-ghost btn-sm md:hidden"
            >
              {menuOpen ? <X size={18} /> : <List size={18} />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <nav
            aria-label="Mobile navigation"
            className="anim-page flex flex-col gap-1 border-t px-4 py-3 md:hidden"
            style={{ borderColor: 'var(--border)' }}
          >
            {NAV.map(({ to, label, icon: Icon, end }, i) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => `nav-link anim-stagger ${isActive ? 'active' : ''}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="btn btn-ghost justify-start"
            >
              <SignOut size={16} aria-hidden="true" />
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </nav>
        ) : null}
      </header>

      <main id="main" className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-28 sm:py-8 md:pb-8">
        <Outlet />
      </main>

      {/* Floating + : jumps to today's entry, like the planner screens. */}
      <button
        type="button"
        onClick={handleFab}
        aria-label="Log today's mood"
        className="btn btn-primary fixed bottom-20 right-4 z-40 h-14 w-14 !rounded-full !p-0 shadow-lg md:bottom-6 md:right-6"
      >
        <Plus size={24} weight="bold" aria-hidden="true" />
      </button>

      {/* Mobile bottom nav, like the planner screens. */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-40 border-t md:hidden"
        style={{
          background: 'var(--surface)',
          backdropFilter: 'blur(18px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(18px) saturate(1.4)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="mx-auto grid max-w-5xl grid-cols-4">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                  isActive ? 'text-[var(--text)]' : 'text-[var(--muted)]'
                }`
              }
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
