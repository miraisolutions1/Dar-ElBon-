import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Coffee, Snowflake } from 'lucide-react';
import './drinks-menu.css';

type DrinkCategory = 'hot' | 'cold';
const drinks: { id: string; name: string; category: DrinkCategory; description: string }[] = [
  { id: 'espresso', name: 'إسبريسو', category: 'hot', description: 'فنجان صغير، ومذاق قهوة حاضر.' },
  {
    id: 'turkish',
    name: 'قهوة تركي',
    category: 'hot',
    description: 'قهوة على الهادي، من الكنكة للفنجان.',
  },
  {
    id: 'cappuccino',
    name: 'كابتشينو',
    category: 'hot',
    description: 'قهوة ورغوة لبن، للحظة أهدى.',
  },
  { id: 'latte', name: 'لاتيه', category: 'hot', description: 'قهوة مع اللبن، لمزاج ناعم ودافي.' },
  {
    id: 'iced-latte',
    name: 'آيس لاتيه',
    category: 'cold',
    description: 'لاتيه على الساقع، لفاصل من زحمة اليوم.',
  },
  {
    id: 'iced-americano',
    name: 'آيس أمريكانو',
    category: 'cold',
    description: 'القهوة على الساقع، بمذاقها الواضح.',
  },
  {
    id: 'lemon-mint',
    name: 'ليمون بالنعناع',
    category: 'cold',
    description: 'اختيار منعش، لما تحب تغيّر المزاج.',
  },
  {
    id: 'iced-matcha',
    name: 'آيس ماتشا',
    category: 'cold',
    description: 'ماتشا ساقعة، لحكاية بطعم مختلف.',
  },
];
const drinkImages: Record<string, string> = {
  espresso: '/images/drink-espresso.webp',
  turkish: '/images/drink-turkish.webp',
  cappuccino: '/images/drink-cappuccino.webp',
  latte: '/images/drink-latte.webp',
  'iced-latte': '/images/drink-iced-latte.webp',
  'iced-americano': '/images/drink-iced-americano.webp',
  'lemon-mint': '/images/drink-lemon-mint.webp',
  'iced-matcha': '/images/drink-iced-matcha.webp',
};
const filters = [
  { value: 'all', label: 'كل الاختيارات' },
  { value: 'hot', label: 'حاجة سخنة' },
  { value: 'cold', label: 'حاجة ساقعة' },
] as const;

export function DrinksMenu({ compact = false }: { compact?: boolean }) {
  const [category, setCategory] = useState<'all' | DrinkCategory>('all');
  const shown = drinks.filter(
    (drink) =>
      (!compact || ['turkish', 'cappuccino', 'iced-latte', 'lemon-mint'].includes(drink.id)) &&
      (category === 'all' || drink.category === category),
  );
  return (
    <div className={`container page-space drinks-menu ${compact ? 'drinks-menu-compact' : ''}`}>
      <header className="drinks-menu-heading">
        <span className="eyebrow">الحكاية في الفنجان</span>
        {compact ? <h2>لحكايتك في الفرع، فنجان تاني.</h2> : <h1>مزاجك النهارده إيه؟</h1>}
        <p>سخن ولا ساقع؟ شوف التصوّر المقترح للمشروبات، واختار اللي على مزاجك.</p>
      </header>
      <p className="drinks-menu-demo" role="note">
        دي قائمة تجريبية للتصميم بصور توضيحية. أسماء المشروبات وتوفرها في الفروع محتاجة اعتماد،
        والأسعار والطلب مش متاحين هنا.
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
        {shown.length} اختيارات في التصوّر
      </p>
      <div className="drinks-menu-grid">
        {shown.map((drink) => (
          <article className="drinks-menu-card" key={drink.id}>
            <div className="drinks-menu-photo">
              <span className="drinks-menu-photo-fallback" aria-hidden="true">
                <Coffee size={48} strokeWidth={1.25} />
              </span>
              <img
                src={drinkImages[drink.id]}
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
