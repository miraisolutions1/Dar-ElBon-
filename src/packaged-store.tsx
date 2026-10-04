import { Link } from 'react-router-dom';
import { ArrowLeft, Bean } from 'lucide-react';
import { money, type Product } from './lib';
import { packageGroups, packageKey, packageTitle } from './packaged-coffee';
import './packaged-store.css';

export function PackageCards({ products }: { products: Product[] }) {
  return (
    <div className="package-grid">
      {packageGroups(products).flatMap((group) => {
        const weights = [
          ...new Set(group.flatMap((product) => product.variants.map((v) => v.weight))),
        ].sort((a, b) => a - b);
        return weights.map((weight) => {
          const candidates = group.filter((p) => p.variants.some((v) => v.weight === weight));
          const product = candidates.find((p) => p.roast === 'وسط') || candidates[0];
          const variant = product.variants.find((v) => v.weight === weight)!;
          const minPrice = Math.min(
            ...candidates.flatMap((p) =>
              p.variants.filter((v) => v.weight === weight).map((v) => v.price),
            ),
          );
          const href = `/products/${product.slug}?variant=${encodeURIComponent(variant.id!)}`;
          return (
            <article
              className={`package-card ${packageKey(product)}`}
              key={`${packageKey(product)}-${weight}`}
            >
              <Link to={href} className="package-photo">
                <span className="package-label">{weight} جم</span>
                <img
                  src={product.image}
                  alt={`${packageTitle(product)} — ${weight} جم`}
                  loading="lazy"
                />
              </Link>
              <div className="package-copy">
                <Link to={href}>
                  <h3>{packageTitle(product)}</h3>
                </Link>
                <p>سادة أو محوج · تحميص على مزاجك</p>
                <div className="package-bottom">
                  <span>
                    يبدأ من <strong>{money(minPrice)}</strong>
                  </span>
                  <Link className="btn" to={href}>
                    اختار عبوتك <ArrowLeft size={16} />
                  </Link>
                </div>
              </div>
            </article>
          );
        });
      })}
    </div>
  );
}
export function CustomBlendCallout() {
  return (
    <Link className="custom-blend-callout" to="/blend">
      <span className="custom-blend-icon">
        <Bean size={34} />
      </span>
      <div>
        <span className="eyebrow">مساحة لذوقك الخاص</span>
        <h3>عايز تكوّن توليفة بنفسك؟</h3>
        <p>برازيلي، كولومبي، إثيوبي وأكثر. اختار الأنواع والكميات، وشوف السعر وكمّل طلبك.</p>
      </div>
      <span className="btn">
        كوّن توليفتك الخاصة <ArrowLeft size={18} />
      </span>
    </Link>
  );
}
