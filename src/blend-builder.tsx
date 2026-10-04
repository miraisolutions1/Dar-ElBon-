import { useEffect, useState } from 'react';
import { Bean, Minus, Plus, Bookmark, RotateCcw } from 'lucide-react';
import { money, useStore, useCart } from './lib';
import { Link } from 'react-router-dom';
import {
  blendOrigins,
  calculateBlend,
  initialBlend,
  normalizeBlendGrams,
  validateSavedBlend,
  type BlendAmounts,
} from './blend-pricing';
import './blend-builder.css';

function BlendAmount({
  name,
  grams,
  onChange,
  max = 1000,
}: {
  name: string;
  grams: number;
  onChange: (grams: number) => void;
  max?: number;
}) {
  const [draft, setDraft] = useState(String(grams));
  useEffect(() => setDraft(String(grams)), [grams]);
  return (
    <div className="bb-quantity">
      <button
        type="button"
        aria-label={`تقليل كمية البن ${name} 50 جم`}
        disabled={!grams || !max}
        onClick={() => onChange(grams - 50)}
      >
        <Minus size={18} />
      </button>
      <label>
        <span className="bb-input-label">كمية {name} بالجرام</span>
        <input
          type="number"
          min="0"
          max={max}
          step="50"
          inputMode="numeric"
          disabled={!max}
          value={draft}
          onChange={(event) => {
            const value = event.target.value;
            setDraft(value);
            const parsed = Number(value);
            if (
              value !== '' &&
              Number.isFinite(parsed) &&
              parsed >= 0 &&
              parsed <= max &&
              parsed % 50 === 0
            )
              onChange(parsed);
          }}
          onBlur={() => {
            const value = Math.min(max, normalizeBlendGrams(Number(draft)));
            setDraft(String(value));
            onChange(value);
          }}
        />
        <small>جم</small>
      </label>
      <button
        type="button"
        aria-label={`زيادة كمية البن ${name} 50 جم`}
        disabled={grams >= max}
        onClick={() => onChange(grams + 50)}
      >
        <Plus size={18} />
      </button>
    </div>
  );
}

export function BlendBuilder({ standalone = false }: { standalone?: boolean }) {
  const [amounts, setAmounts] = useState<BlendAmounts>({ ...initialBlend });
  const [message, setMessage] = useState('');
  const [added, setAdded] = useState(false);
  const [grind, setGrind] = useState('تركي ناعم');
  const { products, settings } = useStore();
  const cart = useCart();
  const catalog = blendOrigins.map((origin) => {
    const product = products.find(
      (product) =>
        product.slug === origin.slug && product.active && product.kind === 'حبوب للتوليف',
    );
    const variant = product?.variants.find((variant) => variant.weight === 50 && variant.price > 0);
    const max =
      product && variant && product.stockMode === 'grams'
        ? Math.min(1000, Math.floor(product.stockGrams / 50) * 50)
        : 0;
    return { origin, product, max, pricePer100: variant ? variant.price * 2 : 0 };
  });
  const effectiveAmounts = Object.fromEntries(
    catalog.map((item) => [item.origin.id, Math.min(item.max, amounts[item.origin.id] || 0)]),
  );
  const prices = Object.fromEntries(catalog.map((item) => [item.origin.id, item.pricePer100]));
  const total = calculateBlend(effectiveAmounts, prices);
  const selectedCatalog = catalog.filter((item) => effectiveAmounts[item.origin.id] > 0);
  const grinds = ['تركي ناعم', 'إسبريسو ناعم', 'فلتر متوسط', 'حبوب كاملة'].filter((grind) =>
    selectedCatalog.every((item) => item.product?.grinds.includes(grind)),
  );
  const canAdd = total.weight > 0 && total.weight <= 3000 && grinds.includes(grind);

  const Heading = standalone ? 'h1' : 'h2';
  function update(id: keyof BlendAmounts, grams: number) {
    setAmounts((current) => ({ ...current, [id]: normalizeBlendGrams(grams) }));
    setMessage('');
    setAdded(false);
  }
  return (
    <section className="blend-builder" aria-labelledby="blend-builder-title">
      <header className="bb-heading">
        <span className="bb-eyebrow">توليفة على ذوقك</span>
        <Heading id="blend-builder-title">كوّن توليفتك</Heading>
        <p>اختار من ٨ أنواع، وظبّط نسب توليفتك بخطوات ٥٠ جم. اختار الطحنة وأضفها للسلة.</p>
      </header>
      <div className="bb-preview-note">
        {settings.mode === 'preview'
          ? 'المتجر في وضع المعاينة · بيانات الأنواع والأسعار والطلبات تجريبية لحين اعتمادها.'
          : 'السعر محسوب من أسعار الأنواع المتاحة، ويتأكد عند تسجيل الطلب.'}
      </div>
      <div className="bb-origin-grid">
        {total.items.map((origin) => (
          <article className="bb-origin" key={origin.id}>
            <div
              className="bb-beans-photo"
              role="img"
              aria-label={`تصور توضيحي لحبوب بن ${origin.name}`}
              style={{
                backgroundImage: 'url(/images/blend-beans.webp)',
                backgroundPositionX: `${((origin.imageIndex % 4) * 100) / 3}%`,
                backgroundPositionY: origin.imageIndex < 4 ? '0%' : '100%',
              }}
            />
            <div className="bb-origin-top">
              <Bean size={25} style={{ color: origin.color }} />
              <span>
                {catalog.find((item) => item.origin.id === origin.id)?.max
                  ? `${money(origin.pricePer100)} / 100 جم`
                  : 'غير متاح حاليًا'}
              </span>
            </div>
            <h3>بن {origin.name}</h3>
            <p>{origin.note}</p>
            <div className="bb-traits">
              <span>القوام: {origin.body}</span>
              <span>الحموضة: {origin.acidity}</span>
              <span>
                {origin.specie} · تحميص توضيحي {origin.sampleRoast}
              </span>
            </div>
            <BlendAmount
              name={origin.name}
              grams={origin.grams}
              max={catalog.find((item) => item.origin.id === origin.id)?.max || 0}
              onChange={(grams) => update(origin.id, grams)}
            />
            <div className="bb-origin-total">
              <span>قيمة الكمية</span>
              <strong>{money(origin.price)}</strong>
            </div>
          </article>
        ))}
      </div>
      <div className="bb-summary">
        <div className="bb-summary-heading">
          <h3>توليفتك بالأرقام</h3>
          <span>خطوات ٥٠ جم · حتى ١٠٠٠ جم للنوع و٣٠٠٠ جم للتوليفة</span>
        </div>
        <div className="bb-totals" aria-live="polite" aria-atomic="true">
          <div>
            <span>الوزن الإجمالي</span>
            <strong>
              {total.weight} <small>جم</small>
            </strong>
          </div>
          <div>
            <span>سعر التوليفة</span>
            <strong>{money(total.price)}</strong>
          </div>
        </div>
        {total.weight ? (
          <>
            <div className="bb-share-bar" aria-hidden="true">
              {total.items.map((item) => (
                <span key={item.id} style={{ width: `${item.share}%`, background: item.color }} />
              ))}
            </div>
            <ul className="bb-share-labels">
              {total.items.map((item) => (
                <li key={item.id}>
                  <i style={{ background: item.color }} />
                  {item.name} <strong>{Math.round(item.share)}%</strong>
                </li>
              ))}
            </ul>
            <p className="bb-composition">
              {total.items
                .filter((item) => item.grams > 0)
                .map((item) => `${item.grams} جم ${item.name}`)
                .join(' + ')}
            </p>
          </>
        ) : (
          <p className="bb-empty">توليفتك لسه فاضية. ضيف 50 جم من أي نوع وابدأ التجربة.</p>
        )}
        <label className="bb-grind-field">
          اختار طحنة التوليفة
          <select
            value={grind}
            onChange={(event) => {
              setGrind(event.target.value);
              setAdded(false);
            }}
          >
            {['تركي ناعم', 'إسبريسو ناعم', 'فلتر متوسط', 'حبوب كاملة'].map((value) => (
              <option key={value} value={value} disabled={!grinds.includes(value)}>
                {value}
              </option>
            ))}
          </select>
        </label>
        {total.weight > 3000 && (
          <p className="bb-limit-error" role="alert">
            الحد الأقصى للتوليفة ٣٠٠٠ جم. قلّل الكمية قبل إضافتها للسلة.
          </p>
        )}
        <div className="bb-actions">
          <button
            className="bb-save bb-cart-add"
            disabled={!canAdd}
            onClick={() => {
              const components = selectedCatalog.flatMap((item) =>
                item.product
                  ? [{ productId: item.product.id, grams: effectiveAmounts[item.origin.id] }]
                  : [],
              );
              if (!canAdd || !components.length) return;
              cart.add({ type: 'blend', components, grind, quantity: 1 });
              setAdded(true);
              setMessage('اتضافت توليفتك للسلة. راجعها وكمّل الطلب.');
            }}
          >
            أضف التوليفة للسلة
          </button>
          {added && (
            <Link className="bb-checkout-link" to="/cart">
              كمّل الطلب
            </Link>
          )}
          <button
            className="bb-save"
            disabled={!total.weight}
            onClick={() => {
              try {
                localStorage.setItem(
                  'dar-coffee-preview-blend',
                  JSON.stringify({ amounts: effectiveAmounts, savedAt: Date.now(), preview: true }),
                );
                setMessage('اتحفظت توليفتك على جهازك. لطلبها، أضفها للسلة وكمّل الطلب.');
              } catch {
                setMessage('تعذّر حفظ الوصفة على جهازك. تقدر تكمّل اختيارك هنا.');
              }
            }}
          >
            <Bookmark size={17} />
            احفظ توليفتك
          </button>
          <button
            className="bb-reset"
            onClick={() => {
              try {
                const stored = localStorage.getItem('dar-coffee-preview-blend');
                const restored = stored ? validateSavedBlend(JSON.parse(stored)) : null;
                if (!restored) {
                  setMessage('مفيش توليفة محفوظة على جهازك. احفظ توليفتك من هنا الأول.');
                  return;
                }
                setAmounts(restored);
                setMessage('اتحمّلت توليفتك المحفوظة. تقدر تعدّلها أو تضيفها للسلة.');
              } catch {
                setMessage('تعذّر تحميل الوصفة المحفوظة. تقدر تكوّن توليفة جديدة هنا.');
              }
            }}
          >
            حمّل الوصفة المحفوظة
          </button>
          <button
            className="bb-reset"
            onClick={() => {
              setAmounts({ ...initialBlend });
              setAdded(false);
              setMessage('');
            }}
          >
            <RotateCcw size={16} />
            ابدأ من جديد
          </button>
        </div>
        <p className="bb-save-message" role="status">
          {message}
        </p>
      </div>
      <aside className="bb-taste-notes">
        <h3>إزاي نفهم الطعم؟</h3>
        <p>
          صور الحبوب توضيحية. اختلاف لون الحبة مرتبط بالتحميص والمعالجة، ومش دليل على بلد المنشأ
          وحده.
        </p>
        <p>
          <strong>القوام</strong> هو إحساس القهوة خفيفة أو تقيلة في الفم. <strong>الحموضة</strong>{' '}
          وصف لطعم فاكهي أو منعش، مش معناها إن البن فاسد.
        </p>
        <p>
          أوصاف الأنواع أمثلة عامة وقد تختلف حسب الحبوب والتحميص والمعالجة والتحضير. تغيير النسب
          يساعدك تتخيل اختيارات مختلفة؛ الطعم النهائي يتحدد بالتجربة، ومش مضمون من النسب وحدها.
        </p>
      </aside>
    </section>
  );
}
