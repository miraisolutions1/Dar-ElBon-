import { RotateCcw } from 'lucide-react';
import './loading-screen.css';

export function LoadingScreen({ error, retry }: { error?: string; retry?: () => void }) {
  return (
    <main className="dar-loading" role={error ? 'alert' : 'status'} aria-live="polite">
      <div className="dar-loading-card">
        <img
          src="/images/dar-logo.webp"
          alt="شعار دار البن البرازيلي"
          className="dar-loading-logo"
        />
        <p className="dar-loading-brand">دار البن البرازيلي</p>
        <p className="dar-loading-tagline">الحكاية في الفنجان</p>
        {error ? (
          <div className="dar-loading-error">
            <h1>الصفحة ما فتحتش المرة دي.</h1>
            <p>{error}</p>
            {retry && (
              <button type="button" onClick={retry}>
                جرّب تاني <RotateCcw size={17} aria-hidden="true" />
              </button>
            )}
          </div>
        ) : (
          <>
            <span className="dar-loading-progress" aria-hidden="true">
              <i />
            </span>
            <p className="dar-loading-message">بنحضّرلك الصفحة…</p>
          </>
        )}
      </div>
    </main>
  );
}
