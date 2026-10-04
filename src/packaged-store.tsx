import { Link } from 'react-router-dom';
import { ArrowLeft, Bean } from 'lucide-react';
import { money, startingVariant, type Product } from './lib';
import { packageGroups, packageKey, packageTitle } from './packaged-coffee';
import './packaged-store.css';

export function PackageCards({ products }: { products: Product[] }) {
  return (
    <div className="package-grid">
      {packageGroups(products).map((group) => {
        const product = group.find((p) => p.roast === 'وسط') || group[0];
        const minPrice = Math.min(...group.flatMap((p) => p.variants.map((v) => v.price)));
        return (
          <article className={`package-card ${packageKey(product)}`} key={packageKey(product)}>
            <Link to={`/products/${product.slug}`} className="package-photo">
              <span className="package-label">
                {packageKey(product) === 'tin' ? 'العلبة السوداء' : 'اختيارك اليومي'}
              </span>
              <img src={product.image} alt={packageTitle(product)} loading="lazy" />
            </Link>
            <div className="package-copy">
              <span className="eyebrow">الحكاية في الفنجان.</span>
              <h3>{packageTitle(product)}</h3>
              <p>اختار التحميص اللي تحبه، سادة أو محوج، والوزن المناسب ليك.</p>
              <div className="package-bottom">
                <span>
                  يبدأ من{' '}
                  <strong>
                    {money(Number.isFinite(minPrice) ? minPrice : startingVariant(product).price)}
                  </strong>
                </span>
                <Link className="btn" to={`/products/${product.slug}`}>
                  اختار تفاصيل عبوتك <ArrowLeft size={18} />
                </Link>
              </div>
            </div>
          </article>
        );
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
