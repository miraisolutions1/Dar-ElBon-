import { useEffect, useState } from 'react';
import { Bean, Minus, Plus, Bookmark, RotateCcw } from 'lucide-react';
import { money } from './lib';
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
}: {
  name: string;
  grams: number;
  onChange: (grams: number) => void;
}) {
  const [draft, setDraft] = useState(String(grams));
  useEffect(() => setDraft(String(grams)), [grams]);
  return (
    <div className="bb-quantity">
      <button
        type="button"
        aria-label={`تقليل كمية البن ${name} 50 جم`}
        disabled={!grams}
        onClick={() => onChange(grams - 50)}
      >
        <Minus size={18} />
      </button>
      <label>
        <span className="bb-input-label">كمية {name} بالجرام</span>
        <input
          type="number"
          min="0"
          max="1000"
          step="50"
          inputMode="numeric"
          value={draft}
          onChange={(event) => {
            const value = event.target.value;
            setDraft(value);
            const parsed = Number(value);
            if (
              value !== '' &&
              Number.isFinite(parsed) &&
              parsed >= 0 &&
              parsed <= 1000 &&
              parsed % 50 === 0
            )
              onChange(parsed);
          }}
          onBlur={() => {
            const value = normalizeBlendGrams(Number(draft));
            setDraft(String(value));
            onChange(value);
          }}
        />
        <small>جم</small>
      </label>
      <button
        type="button"
        aria-label={`زيادة كمية البن ${name} 50 جم`}
        disabled={grams >= 1000}
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
  const total = calculateBlend(amounts);
  const Heading = standalone ? 'h1' : 'h2';
  function update(id: keyof BlendAmounts, grams: number) {
    setAmounts((current) => ({ ...current, [id]: normalizeBlendGrams(grams) }));
    setMessage('');
  }
  return (
    <section className="blend-builder" aria-labelledby="blend-builder-title">
      <header className="bb-heading">
        <span className="bb-eyebrow">تجربة توليفة على ذوقك</span>
        <Heading id="blend-builder-title">كوّن توليفتك</Heading>
        <p>
          زوّد وقلّل من البرازيلي والكولومبي والإثيوبي، وشوف نسب توليفتك ووزنها وسعرها التوضيحي
          فورًا.
        </p>
      </header>
      <div className="bb-preview-note">
        حاسبة معاينة فقط · الأسعار والمنشأ أمثلة للتجربة، وليست قائمة منتجات أو أسعار دار البن.
        الوصفة لا تُضاف للسلة ولا تُسجّل كطلب.
      </div>
      <div className="bb-origin-grid">
        {total.items.map((origin) => (
          <article className="bb-origin" key={origin.id}>
            <div className="bb-origin-top">
              <Bean size={25} style={{ color: origin.color }} />
              <span>{money(origin.pricePer100)} / 100 جم</span>
            </div>
            <h3>بن {origin.name}</h3>
            <p>{origin.note}</p>
            <div className="bb-traits">
              <span>القوام: {origin.body}</span>
              <span>الحموضة: {origin.acidity}</span>
            </div>
            <BlendAmount
              name={origin.name}
              grams={origin.grams}
              onChange={(grams) => update(origin.id, grams)}
            />
            <div className="bb-origin-total">
              <span>قيمة الكمية التجريبية</span>
              <strong>{money(origin.price)}</strong>
            </div>
          </article>
        ))}
      </div>
      <div className="bb-summary">
        <div className="bb-summary-heading">
          <h3>توليفتك بالأرقام</h3>
          <span>الكمية بخطوات 50 جم، حتى 1000 جم لكل نوع</span>
        </div>
        <div className="bb-totals" aria-live="polite" aria-atomic="true">
          <div>
            <span>الوزن الإجمالي</span>
            <strong>
              {total.weight} <small>جم</small>
            </strong>
          </div>
          <div>
            <span>السعر التوضيحي</span>
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
        <div className="bb-actions">
          <button
            className="bb-save"
            disabled={!total.weight}
            onClick={() => {
              try {
                localStorage.setItem(
                  'dar-coffee-preview-blend',
                  JSON.stringify({ amounts, savedAt: Date.now(), preview: true }),
                );
                setMessage('اتحفظت وصفة المعاينة على جهازك. ده حفظ للوصفة فقط، مش طلب شراء.');
              } catch {
                setMessage('تعذّر حفظ الوصفة على جهازك. تقدر تكمّل التجربة هنا.');
              }
            }}
          >
            <Bookmark size={17} />
            احفظ وصفة المعاينة
          </button>
          <button
            className="bb-reset"
            onClick={() => {
              try {
                const stored = localStorage.getItem('dar-coffee-preview-blend');
                const restored = stored ? validateSavedBlend(JSON.parse(stored)) : null;
                if (!restored) {
                  setMessage('مفيش وصفة معاينة محفوظة صالحة على جهازك. احفظ وصفة من هنا الأول.');
                  return;
                }
                setAmounts(restored);
                setMessage(
                  'اتحمّلت وصفة المعاينة المحفوظة على جهازك. تقدر تعدّلها وتجرّب من جديد.',
                );
              } catch {
                setMessage('تعذّر تحميل الوصفة المحفوظة. تقدر تبدأ تجربة جديدة هنا.');
              }
            }}
          >
            حمّل الوصفة المحفوظة
          </button>
          <button
            className="bb-reset"
            onClick={() => {
              setAmounts({ ...initialBlend });
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
