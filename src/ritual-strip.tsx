import { useSiteContent } from './site-content';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

function RitualArt({ kind }: { kind: 'pack' | 'taste' | 'bag' }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true" focusable="false">
      <circle cx="40" cy="40" r="34" fill="#fff0ac" />
      <g stroke="#302319" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {kind === 'pack' ? (
          <>
            <path d="M24 18h30l3 43c-10 5-24 5-36 0l3-43Z" fill="var(--brand-accent, #ffd200)" />
            <path d="M24 24h30M23 57h33" />
            <circle cx="39" cy="40" r="11" fill="#fff9e7" />
            <path d="M33 40h10v3c0 6-10 6-10 0v-3Zm10 1h3v3h-3M36 36l2-3m3 3 2-3" />
            <ellipse cx="62" cy="59" rx="5" ry="7" transform="rotate(30 62 59)" fill="#a56c3e" />
            <path d="m64 54-4 10" />
          </>
        ) : kind === 'taste' ? (
          <>
            <path d="M17 45h38v7c0 18-38 18-38 0v-7Z" fill="var(--brand-accent, #ffd200)" />
            <path d="M55 47h8c11 0 8 15-2 15h-8M18 69h41M27 37c-7-7 7-10 0-17M38 37c-7-7 7-10 0-17" />
            <ellipse cx="57" cy="27" rx="7" ry="10" transform="rotate(30 57 27)" fill="#a56c3e" />
            <path d="m60 20-6 14" />
          </>
        ) : (
          <>
            <path d="M22 31h36l4 33H18l4-33Z" fill="var(--brand-accent, #ffd200)" />
            <path d="M30 35V24c0-13 20-13 20 0v11" />
            <circle cx="40" cy="48" r="10" fill="#fff9e7" />
            <path d="m35 48 4 4 7-8M24 69h32" />
          </>
        )}
      </g>
      <path d="m65 13 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" fill="#a56c3e" />
    </svg>
  );
}

export function RitualStrip() {
  const { ritual } = useSiteContent();
  const items = ritual.map((item, index) => ({
    ...item,
    kind: ['pack', 'taste', 'bag'][index % 3] as 'pack' | 'taste' | 'bag',
  }));
  return (
    <ol className="ritual-strip container" aria-label="خطوات طلب قهوتك">
      {items.map((item, index) => (
        <li key={item.kind}>
          <Link
            to={
              ['/shop', '/quiz', '/cart', '/blend', '/branches', '/learn'].includes(item.href)
                ? item.href
                : '/shop'
            }
          >
            <span className="ritual-art">
              <RitualArt kind={item.kind} />
            </span>
            <span className="ritual-copy">
              <span className="ritual-step">{['٠١', '٠٢', '٠٣'][index]}</span>
              <strong>{item.title}</strong>
              <span className="ritual-description">{item.text}</span>
            </span>
            <ArrowLeft className="ritual-arrow" size={17} aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ol>
  );
}
