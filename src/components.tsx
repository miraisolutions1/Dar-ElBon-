import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Coffee, Plus, Minus, Upload, PackageOpen } from 'lucide-react';
import {
  api,
  money,
  stock,
  startingVariant,
  statusLabels,
  useStore,
  type Product,
  type Variant,
} from './lib';

export function Brand({ compact = false }: { compact?: boolean }) {
  const { settings } = useStore();
  return (
    <span className={`brand ${compact ? 'compact' : ''}`}>
      <span className="brand-symbol">
        <Coffee size={25} strokeWidth={1.3} />
      </span>
      <span>
        <strong>{settings.brand}</strong>
        <small>THE HOUSE OF BRAZILIAN COFFEE</small>
      </span>
    </span>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}
export function ProductCard({
  product,
  variant: selectedVariant,
}: {
  product: Product;
  variant?: Variant;
}) {
  const variant = selectedVariant || startingVariant(product);
  const href = `/products/${product.slug}${selectedVariant?.id ? `?variant=${encodeURIComponent(selectedVariant.id)}` : ''}`;
  return (
    <article className="product-card">
      <Link className="product-image" to={href}>
        <img src={product.image} alt={product.name} loading="lazy" />
        <span className="image-pill">{product.kind}</span>
      </Link>
      <div className="product-info">
        <div className="row between">
          <span className="tiny muted">{product.brew.join(' · ')}</span>
          <span className="roast">
            <i
              className={
                product.roast === 'غامق' ? 'dark' : product.roast === 'فاتح' ? 'light' : ''
              }
            />
            {product.roast}
          </span>
        </div>
        <Link to={href}>
          <h3>{product.name}</h3>
        </Link>
        <div className="row between">
          <div>
            {variant && (
              <>
                <small className="muted">
                  {selectedVariant ? 'الوزن' : 'يبدأ من'} · {variant.weight} جم
                </small>
                <strong className="price">{money(variant.price)}</strong>
              </>
            )}
          </div>
        </div>
        <Link
          className="btn product-select"
          to={href}
          aria-label={`اختيار ${product.name}${selectedVariant ? ` — ${selectedVariant.weight} جم` : ''}`}
        >
          اختار الطحنة <ArrowLeft size={17} />
        </Link>
        {variant && stock(product, variant) < 1 && (
          <small className="danger-text">غير متاح حاليًا</small>
        )}
      </div>
    </article>
  );
}
export function Quantity({
  value,
  onChange,
  max = 30,
}: {
  value: number;
  onChange: (n: number) => void;
  max?: number;
}) {
  return (
    <div className="quantity">
      <button
        type="button"
        aria-label="تقليل الكمية"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
      >
        <Minus size={15} />
      </button>
      <span aria-label="الكمية">{value}</span>
      <button
        type="button"
        aria-label="زيادة الكمية"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
      >
        <Plus size={15} />
      </button>
    </div>
  );
}
export function Alert({
  children,
  kind = 'error',
}: {
  children: ReactNode;
  kind?: 'error' | 'success' | 'info';
}) {
  return children ? (
    <div className={`alert ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  ) : null;
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <PackageOpen size={42} strokeWidth={1} />
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" />
      جاري التحميل…
    </div>
  );
}
export function Status({ value }: { value: string }) {
  return <span className={`status ${value}`}>{statusLabels[value] || value}</span>;
}
export function ImageUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className="image-upload">
      <img src={value} alt="معاينة الصورة" />
      <label className="btn secondary small">
        <Upload size={17} />
        {busy ? 'جاري رفع الصورة…' : 'رفع صورة'}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setError('');
            const body = new FormData();
            body.append('image', file);
            try {
              const result = await api<{ url: string }>('/admin/upload', { method: 'POST', body });
              onChange(result.url);
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
              e.target.value = '';
            }
          }}
        />
      </label>
      <small className="muted">JPG أو PNG أو WebP · حتى 8 ميجابايت</small>
      <Alert>{error}</Alert>
    </div>
  );
}
