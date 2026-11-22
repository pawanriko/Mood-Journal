import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="anim-page flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="heading-1 hero-text">404</p>
      <h1 className="heading-5">This page is not here</h1>
      <p className="body-3 max-w-md" style={{ color: 'var(--muted)' }}>
        The page you opened does not exist or was moved. Head back to your dashboard to
        keep journaling.
      </p>
      <Link to="/" className="btn btn-primary">
        Back to dashboard
      </Link>
    </div>
  );
}
