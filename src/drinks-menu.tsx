import { useSiteContent } from './site-content';
import { money } from './lib';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Coffee, Snowflake } from 'lucide-react';
import './drinks-menu.css';

type DrinkCategory = 'hot' | 'cold';
const filters = [
  { value: 'all', label: 'كل الاختيارات' },
  { value: 'hot', label: 'حاجة سخنة' },
  { value: 'cold', label: 'حاجة ساقعة' },
] as const;

export function DrinksMenu({ compact = false }: { compact?: boolean }) {
  const { drinks } = useSiteContent();
  const [category, setCategory] = useState<'all' | DrinkCategory>('all');
  const shown = drinks
    .filter((drink) => drink.active && (category === 'all' || drink.category === category))
    .slice(0, compact ? 4 : undefined);
  return (
    <div className={`container page-space drinks-menu ${compact ? 'drinks-menu-compact' : ''}`}>
      <header className="drinks-menu-heading">
        <span className="eyebrow">الحكاية في الفنجان</span>
        {compact ? <h2>لحكايتك في الفرع، فنجان تاني.</h2> : <h1>مزاجك النهارده إيه؟</h1>}
        <p>سخن ولا ساقع؟ اكتشف عالم المشروبات، وشوف اللي على مزاجك.</p>
      </header>
      <p className="drinks-menu-demo" role="note">
        للاستفسار عن قائمة المشروبات المتوفرة وأسعارها الحالية، تواصل مع الفرع.
      </p>
      <div className="drinks-menu-filters" role="group" aria-label="تصفية المشروبات">
        {filters.map((filter) => (
          <button
            type="button"
            key={filter.value}
            aria-pressed={category === filter.value}
            onClick={() => setCategory(filter.value)}
          >
            {filter.value === 'hot' && <Coffee size={17} aria-hidden="true" />}
            {filter.value === 'cold' && <Snowflake size={17} aria-hidden="true" />}
            {filter.label}
          </button>
        ))}
      </div>
      <p className="drinks-menu-count" aria-live="polite" aria-atomic="true">
        {shown.length} مشروبات
      </p>
      <div className="drinks-menu-grid">
        {shown.map((drink) => (
          <article className="drinks-menu-card" key={drink.id}>
            <div className="drinks-menu-photo">
              <span className="drinks-menu-photo-fallback" aria-hidden="true">
                <Coffee size={48} strokeWidth={1.25} />
              </span>
              <img
                src={drink.image}
                alt={`صورة توضيحية لمشروب ${drink.name}`}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
              <span className="drinks-menu-badge">
                {drink.category === 'hot' ? <Coffee size={14} /> : <Snowflake size={14} />}
                {drink.category === 'hot' ? 'سخن' : 'ساقع'}
              </span>
            </div>
            <div className="drinks-menu-copy">
              <h2>{drink.name}</h2>
              <p>{drink.description}</p>
              {drink.price !== null && <strong>{money(drink.price)}</strong>}
            </div>
          </article>
        ))}
      </div>
      <aside className="drinks-menu-visit">
        <div>
          <h2>نكمل الحكاية في الفرع؟</h2>
          <p>شوف عنوان أقرب فرع لك، وتأكد من قائمة المشروبات المتاحة هناك.</p>
        </div>
        <Link className="btn" to="/branches">
          اعرف فروعنا <ArrowLeft size={18} aria-hidden="true" />
        </Link>
      </aside>
    </div>
  );
}
