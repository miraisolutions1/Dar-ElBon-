import { useState, useEffect, type FormEvent } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpLeft,
  ShoppingBag,
  Search,
  Menu,
  X,
  Coffee,
  Bean,
  SlidersHorizontal,
  Truck,
  ShieldCheck,
  Check,
  ChevronLeft,
  Trash2,
  Package,
  Copy,
  CheckCircle2,
  Minus,
  Plus,
  Facebook,
  Instagram,
  MapPin,
} from 'lucide-react';
import {
  Brand,
  SectionTitle,
  ProductCard,
  Quantity,
  Alert,
  Empty,
  Loading,
  Status,
} from './components';
import {
  useStore,
  useCart,
  money,
  stock,
  startingVariant,
  lineKey,
  api,
  send,
  useAsync,
  date,
  type CartLine,
  type Order,
} from './lib';

const socialPages = [
  { name: 'فيسبوك', href: 'https://www.facebook.com/thehouseofbraziliancoffee/', icon: Facebook },
  { name: 'إنستجرام', href: 'https://www.instagram.com/braziliancaffe/', icon: Instagram },
];

function SocialLinks() {
  return (
    <div className="social-links">
      {socialPages.map(({ name, href, icon: Icon }) => (
        <a
          key={name}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`دار البن على ${name} — يفتح في نافذة جديدة`}
        >
          <Icon size={18} />
          <span>{name}</span>
          <ArrowUpLeft size={13} />
        </a>
      ))}
    </div>
  );
}

function Branches() {
  const { settings } = useStore();
  if (!settings.branches?.length) return null;
  return (
    <section className="container section branch-section" id="branches">
      <SectionTitle eyebrow="نفس الحكاية، أقرب لك" title="فنجانك مستنيك في فروعنا" />
      <p className="section-intro">
        من ألف مسكن للعبور، اختار الفرع الأقرب وقابلنا على فنجان قهوة.
      </p>
      <div className="branch-grid">
        {settings.branches.map((branch, index) => (
          <article className="branch-card" key={index}>
            <div className="branch-top">
              <MapPin size={24} strokeWidth={1.4} />
              <span>{branch.main ? 'الفرع الرئيسي' : 'دار البن البرازيلي'}</span>
            </div>
            <h3>{branch.name}</h3>
            <p>{branch.address}</p>
            <a
              href={
                'https://www.google.com/maps/search/?api=1&query=' +
                encodeURIComponent('دار البن البرازيلي ' + branch.address)
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              ابحث على الخريطة <ArrowUpLeft size={16} />
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

export function StoreLayout() {
  const { settings } = useStore();
  const { count } = useCart();
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const nav = useNavigate();
  const location = useLocation();
  useEffect(() => {
    setMenu(false);
    setSearch(false);
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenu(false);
        setSearch(false);
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  return (
    <div className={`storefront ${location.pathname === '/' ? 'home-page' : ''}`}>
      <a href="#main" className="skip-link">
        انتقل للمحتوى
      </a>
      {settings.mode === 'preview' && (
        <div className="preview-bar">المتجر في وضع المعاينة · الأسعار والطلبات تجريبية</div>
      )}
      <div className="storefront-frame">
        <header className="site-header">
          <div className="container header-inner">
            <Link to="/" aria-label="دار البن — الرئيسية">
              <Brand />
            </Link>
            <p className="header-note">توليفة تحكي، وفنجان يجمع.</p>
            <div className="header-actions">
              <Link className="header-guide" to="/guide">
                دليل اختيار القهوة <ArrowLeft size={15} />
              </Link>
              <button
                className="icon-button search-toggle"
                aria-label="البحث في القهوة"
                aria-expanded={search}
                aria-controls="mobile-search"
                onClick={() => {
                  setSearch((v) => !v);
                  setMenu(false);
                }}
              >
                <Search size={21} />
              </button>
              <Link
                to="/cart"
                className="icon-button cart-link"
                aria-label={`السلة، ${count} منتجات`}
              >
                <ShoppingBag size={21} />
                <b className="cart-label">سلتك</b>
                {count > 0 && <span>{count}</span>}
              </Link>
              <button
                className="icon-button mobile-menu"
                aria-label="فتح القائمة"
                aria-expanded={menu}
                aria-controls="main-navigation"
                onClick={() => {
                  setMenu((v) => !v);
                  setSearch(false);
                }}
              >
                {menu ? <X /> : <Menu />}
              </button>
            </div>
          </div>
          <div className="header-navigation">
            <div className="container navigation-inner">
              <nav
                id="main-navigation"
                className={menu ? 'site-nav open' : 'site-nav'}
                aria-label="القائمة الرئيسية"
              >
                <NavLink to="/" end>
                  الرئيسية
                </NavLink>
                <NavLink to="/shop">قهوتنا</NavLink>
                <NavLink to="/about">حكاية دار البن</NavLink>
                <NavLink to="/guide">ساعدني أختار</NavLink>
              </nav>
              <form
                className="desktop-search"
                role="search"
                onSubmit={(e) => {
                  e.preventDefault();
                  nav(
                    '/shop?q=' +
                      encodeURIComponent(String(new FormData(e.currentTarget).get('q') || '')),
                  );
                }}
              >
                <input name="q" aria-label="ابحث عن قهوتك" placeholder="ابحث عن توليفتك المفضلة…" />
                <button aria-label="بحث" type="submit">
                  <Search size={19} />
                </button>
              </form>
            </div>
          </div>
          {search && (
            <form
              className="header-search container"
              id="mobile-search"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                nav(
                  '/shop?q=' + encodeURIComponent(new FormData(e.currentTarget).get('q') as string),
                );
                setSearch(false);
              }}
            >
              <input name="q" autoFocus placeholder="بتدور على قهوة إيه؟" aria-label="كلمة البحث" />
              <button className="btn small">بحث</button>
            </form>
          )}
        </header>
        <main id="main">
          <Outlet />
        </main>
        <footer className="site-footer">
          <div className="container footer-top">
            <div>
              <Link to="/">
                <Brand />
              </Link>
              <p>
                الحكاية في الفنجان.
                <br />
                ولكل يوم، فنجان يستاهل.
              </p>
              <SocialLinks />
            </div>
            <div>
              <h3>اكتشف دار البن</h3>
              <Link to="/shop">كل القهوة</Link>
              <Link to="/about">حكايتنا</Link>
              <Link to="/about">فروعنا</Link>
              <Link to="/guide">دليل اختيار القهوة</Link>
            </div>
            <div>
              <h3>معلومات تهمك</h3>
              <Link to="/policies/shipping">الشحن والتوصيل</Link>
              <Link to="/policies/returns">الاستبدال والاسترجاع</Link>
              <Link to="/policies/privacy">الخصوصية</Link>
            </div>
            {(settings.contactPhone || settings.contactEmail || settings.address) && (
              <div>
                <h3>خلّينا على تواصل</h3>
                {settings.contactPhone ? (
                  <a href={`tel:${settings.contactPhone}`} dir="ltr">
                    {settings.contactPhone}
                  </a>
                ) : null}
                {settings.contactEmail && (
                  <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>
                )}
                {settings.address && <p>{settings.address}</p>}
              </div>
            )}
          </div>
          <div className="container footer-bottom">
            <span>© {new Date().getFullYear()} دار البن البرازيلي</span>
            <span>بكل هدوء… استمتع بقهوتك.</span>
            <Link to="/admin">
              إدارة المتجر <ArrowUpLeft size={13} />
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

export function Home() {
  const { settings, products } = useStore();
  const featured = products.filter((p) => p.featured);
  const choices = featured
    .flatMap((product) => product.variants.map((variant) => ({ product, variant })))
    .slice(0, 4);
  const coffeeSheet = '/images/brewing-methods.webp';
  const sections: Record<string, React.ReactNode> = {
    branches: <Branches />,
    brewing: (
      <section className="container section coffee-selection">
        <SectionTitle eyebrow="لكل فنجان، طريقته" title="بتعمل قهوتك إزاي؟" />
        <div className="brew-grid">
          {[
            { name: 'تركي', description: 'للفنجان الصغير، والمزاج الكبير.', position: '100%' },
            { name: 'إسبريسو', description: 'للقهوة المركّزة، على طريقتك.', position: '50%' },
            { name: 'فلتر', description: 'خد وقتك، واستمتع بالتفاصيل.', position: '0%' },
          ].map(({ name, description, position }) => (
            <Link key={name} to={`/shop?brew=${encodeURIComponent(name)}`} className="brew-card">
              <div
                className="brew-photo"
                role="img"
                aria-label={`طريقة تحضير ${name}`}
                style={{ backgroundImage: `url(${coffeeSheet})`, backgroundPositionX: position }}
              />
              <div className="brew-caption">
                <h3>{name}</h3>
                <p>{description}</p>
                <span className="brew-arrow" aria-hidden="true">
                  <ArrowLeft size={17} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    ),
    featured: (
      <section className="container section home-featured">
        <SectionTitle eyebrow="فنجانك اليومي يبدأ هنا" title="توليفتك، بالمقدار اللي يناسبك" />
        <p className="section-intro">
          نفس التوليفة اللي بتحبها، بوزنك وطحنتك. اختار العبوة وكمّل تفاصيل فنجانك.
        </p>
        {choices.length ? (
          <div className={`featured-grid ${choices.length <= 2 ? 'pair' : ''}`}>
            {choices.map(({ product, variant }) => (
              <ProductCard key={variant.id} product={product} variant={variant} />
            ))}
          </div>
        ) : (
          <Empty title="توليفاتنا بتتجهز" description="المنتجات المميزة هتظهر هنا قريبًا." />
        )}
        <div className="section-action">
          <Link className="text-link" to="/shop">
            تصفّح كل القهوة <ArrowLeft size={17} />
          </Link>
        </div>
      </section>
    ),
    story: (
      <section className="container section home-story">
        <div className="story-band">
          <img
            className="story-background"
            src="/images/coffee-story.webp"
            alt="حبوب بن محمصة في مغرفة خشبية"
            loading="lazy"
          />
          <div className="story-copy">
            <span className="eyebrow">أهلًا بك في دار البن</span>
            <h2>{settings.storyTitle}</h2>
            <p>{settings.storyText}</p>
            <Link className="btn story-button" to="/about">
              اعرف الحكاية <ArrowLeft size={17} />
            </Link>
          </div>
        </div>
      </section>
    ),
    guide: (
      <section className="container section home-guide">
        <SectionTitle eyebrow="تفاصيل صغيرة، فرق في الفنجان" title="خلي كل فنجان على مزاجك" />
        <div className="coffee-notes">
          {[
            {
              number: '01',
              title: 'الطحنة على طريقة تحضيرك',
              text: 'التركي بيحتاج طحنة ناعمة جدًا. الإسبريسو والفلتر ليهم درجات مختلفة؛ اختار الطحنة من الخيارات المتاحة لكل توليفة.',
              icon: <SlidersHorizontal size={25} />,
            },
            {
              number: '02',
              title: 'اختار كمية تناسب يومك',
              text: '250 جم لتجربة التوليفة أو استهلاك أقل، و500 جم لو القهوة جزء من يومك. اختار على قد استخدامك.',
              icon: <Package size={25} />,
            },
            {
              number: '03',
              title: 'احتفظ بالرائحة',
              text: 'احفظ البن في عبوة محكمة، في مكان جاف بعيد عن الشمس والحرارة. اقفل العبوة بعد كل استخدام.',
              icon: <Bean size={25} />,
            },
          ].map(({ number, title, text, icon }) => (
            <article className="coffee-note" key={number}>
              <div className="note-top">
                {icon}
                <span>{number}</span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <div className="guide-banner">
          <span className="guide-icon">
            <Coffee size={40} strokeWidth={1.1} />
          </span>
          <div>
            <span className="eyebrow">فنجانك يبدأ من هنا</span>
            <h2>مش عارف تختار؟</h2>
            <p>قلّنا بتعمل قهوتك إزاي، ونرشّح لك من التوليفات المتاحة.</p>
          </div>
          <Link className="btn" to="/guide">
            ساعدني أختار <ArrowLeft size={17} />
          </Link>
        </div>
        <div className="coffee-faq">
          <div>
            <span className="eyebrow">قبل أول فنجان</span>
            <h2>
              سؤال صغير؟
              <br />
              إجابته هنا.
            </h2>
            <p>تفاصيل تساعدك تختار وانت مطمّن.</p>
          </div>
          <div className="faq-items">
            <details>
              <summary>
                إيه الفرق بين المحوج والسادة؟
                <Plus size={18} />
              </summary>
              <p>
                المحوج بيجمع البن مع إضافات من التوابل حسب التوليفة، زي الحبهان. السادة بن من غير
                إضافات. راجع وصف كل منتج لمعرفة تفاصيل التوليفة المتاحة.
              </p>
            </details>
            <details>
              <summary>
                أطلب بن مطحون ولا حبوب؟
                <Plus size={18} />
              </summary>
              <p>
                لو عندك مطحنة، اختار حبوب كاملة واطحن الكمية اللي هتحضّرها. لو بتفضّل البن جاهز
                للتحضير، اختار الطحنة المناسبة لأداتك من صفحة المنتج.
              </p>
            </details>
            <details>
              <summary>
                أقدر أغيّر الوزن والطحنة؟
                <Plus size={18} />
              </summary>
              <p>
                أيوه، من صفحة المنتج تقدر تختار الوزن والطحنة من الخيارات المتاحة، وتراجع اختيارك في
                السلة قبل إتمام الطلب.
              </p>
            </details>
          </div>
        </div>
      </section>
    ),
  };
  return (
    <>
      <section className="hero">
        <div className="hero-visual">
          <img
            src={settings.heroImage}
            alt="عبوة دار البن البرازيلي مع فنجان قهوة وركوة نحاسية"
            fetchPriority="high"
          />
        </div>
        <div className="container hero-content">
          <div className="hero-copy">
            <span className="eyebrow">دار البن البرازيلي · قهوة لها حكاية</span>
            <h1>{settings.heroTitle}</h1>
            <p>{settings.heroSubtitle}</p>
            <div className="hero-buttons">
              <Link className="btn" to="/shop">
                اختار قهوتك <ArrowLeft size={18} />
              </Link>
              <Link className="hero-secondary" to="/guide">
                نساعدك تختار <ArrowLeft size={16} />
              </Link>
            </div>
            <div className="hero-detail">
              <span />
              <span>ريحة تعرفها. لحظة تستناها.</span>
            </div>
          </div>
        </div>
      </section>
      <div className="ritual-strip container">
        <span>
          <Bean size={21} strokeWidth={1.4} />
          <span>
            اختار <strong>توليفتك</strong>
          </span>
        </span>
        <i />
        <span>
          <SlidersHorizontal size={21} strokeWidth={1.4} />
          <span>
            ظبّط <strong>الوزن والطحنة</strong>
          </span>
        </span>
        <i />
        <span>
          <ShoppingBag size={21} strokeWidth={1.4} />
          <span>
            كمّل <strong>طلبك من الموقع</strong>
          </span>
        </span>
      </div>
      {settings.sections.map((s) => (
        <div key={s}>{sections[s]}</div>
      ))}
    </>
  );
}

export function Shop() {
  const { products } = useStore();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const brew = params.get('brew') || '';
  const roast = params.get('roast') || '';
  const sort = params.get('sort') || '';
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next, { replace: true });
  }
  const norm = (s: string) =>
    s
      .replace(/[أإآ]/g, 'ا')
      .replace(/[\u064B-\u065F]/g, '')
      .toLowerCase();
  const filtered = products
    .filter(
      (p) =>
        norm(p.name + ' ' + p.description + ' ' + p.kind).includes(norm(q)) &&
        (!brew || p.brew.includes(brew)) &&
        (!roast || p.roast === roast),
    )
    .sort((a, b) =>
      sort === 'low'
        ? startingVariant(a).price - startingVariant(b).price
        : sort === 'high'
          ? startingVariant(b).price - startingVariant(a).price
          : 0,
    );
  return (
    <div className="container page-space">
      <div className="page-title">
        <span className="eyebrow">على مزاجك، بالضبط</span>
        <h1>اختار قهوتك.</h1>
        <p>توليفات مختلفة، وتفاصيل صغيرة تعمل فرق.</p>
      </div>
      <div className="shop-toolbar">
        <div className="search-input">
          <Search size={18} />
          <input
            aria-label="ابحث عن خلطة"
            placeholder="ابحث عن خلطة…"
            value={q}
            onChange={(e) => update('q', e.target.value)}
          />
        </div>
        <select
          aria-label="طريقة التحضير"
          value={brew}
          onChange={(e) => update('brew', e.target.value)}
        >
          <option value="">كل طرق التحضير</option>
          {['تركي', 'إسبريسو', 'فلتر'].map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
        <select
          aria-label="ترتيب المنتجات"
          value={sort}
          onChange={(e) => update('sort', e.target.value)}
        >
          <option value="">الترتيب الافتراضي</option>
          <option value="low">السعر: من الأقل</option>
          <option value="high">السعر: من الأعلى</option>
        </select>
      </div>
      <div className="row between filter-row">
        <div className="pills">
          {['', 'فاتح', 'وسط', 'غامق'].map((r) => (
            <button
              key={r}
              className={roast === r ? 'selected' : ''}
              onClick={() => update('roast', r)}
            >
              {r || 'كل التحميص'}
            </button>
          ))}
        </div>
        <span className="muted tiny">{filtered.length} منتجات</span>
      </div>
      {filtered.length ? (
        <div className="product-grid">
          {filtered.map((p) => (
            <ProductCard product={p} key={p.id} />
          ))}
        </div>
      ) : (
        <Empty title="لسه ما لقيناش التوليفة دي" description="جرّب تغيير البحث أو طريقة التحضير.">
          <button className="btn secondary" onClick={() => setParams({})}>
            عرض كل القهوة
          </button>
        </Empty>
      )}
    </div>
  );
}

export function ProductPage() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const requestedVariant = params.get('variant') || '';
  const { products, settings } = useStore();
  const { add } = useCart();
  const product = products.find((p) => p.slug === slug);
  const [variantId, setVariant] = useState(requestedVariant);
  const [grind, setGrind] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  useEffect(() => {
    setVariant(requestedVariant);
    setGrind('');
    setQuantity(1);
    setAdded(false);
  }, [slug, requestedVariant]);
  if (!product) return <NotFound />;
  const variant = product.variants.find((v) => v.id === variantId) || startingVariant(product);
  const selectedGrind = product.grinds.includes(grind) ? grind : product.grinds[0];
  const available = variant ? stock(product, variant) : 0;
  return (
    <div className="container page-space">
      <div className="breadcrumbs">
        <Link to="/">الرئيسية</Link>
        <ChevronLeft size={13} />
        <Link to="/shop">القهوة</Link>
        <ChevronLeft size={13} />
        <span>{product.name}</span>
      </div>
      <div className="product-detail">
        <div className="product-main-image">
          <img src={product.image} alt={product.name} />
          <span className="image-pill">{product.kind}</span>
        </div>
        <div className="product-detail-copy">
          <span className="eyebrow">
            {product.brew.join(' / ')} · تحميص {product.roast}
          </span>
          <h1>{product.name}</h1>
          <p className="description">{product.description}</p>
          <strong className="detail-price">{money(variant?.price || 0)}</strong>
          {product.demo && <span className="muted tiny">سعر ووزن تجريبيان لحين الاعتماد</span>}
          <fieldset>
            <legend>اختار الوزن</legend>
            <div className="pills weight-pills">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  className={v.id === variant?.id ? 'selected' : ''}
                  onClick={() => {
                    setVariant(v.id!);
                    setQuantity(1);
                    setAdded(false);
                  }}
                >
                  {v.weight} جم
                </button>
              ))}
            </div>
          </fieldset>
          <label className="field">
            الطحنة المناسبة
            <select
              value={selectedGrind}
              onChange={(e) => {
                setGrind(e.target.value);
                setAdded(false);
              }}
            >
              {product.grinds.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
          <div className="purchase-row">
            <Quantity
              value={quantity}
              onChange={(n) => {
                setQuantity(n);
                setAdded(false);
              }}
              max={Math.min(30, available)}
            />
            <button
              className="btn"
              disabled={!available}
              onClick={() => {
                add({
                  productId: product.id,
                  variantId: variant.id!,
                  grind: selectedGrind,
                  quantity: Math.min(quantity, available),
                });
                setAdded(true);
              }}
            >
              {added ? <Check size={19} /> : <ShoppingBag size={19} />}{' '}
              {!available ? 'غير متاح حاليًا' : added ? 'اتضاف للسلة' : 'أضف للسلة'}
            </button>
          </div>
          {added && (
            <Alert kind="success">
              اختيار موفق! <Link to="/cart">راجع السلة وكمّل طلبك ←</Link>
            </Alert>
          )}
          <div className="product-promises">
            <span>
              <Truck size={19} />
              تكلفة الشحن تظهر قبل تأكيد الطلب
            </span>
            <span>
              <ShieldCheck size={19} />
              {settings.codEnabled ? 'الدفع عند الاستلام' : 'طرق الدفع تُجهّز قبل الافتتاح'}
            </span>
          </div>
          <details className="details">
            <summary>تفاصيل التحضير والعناية</summary>
            <p>
              اختار الطحنة المتوافقة مع أداتك. احفظ القهوة في عبوتها المغلقة بعيدًا عن الرطوبة
              والحرارة والضوء المباشر.
            </p>
            <Link to="/guide" className="text-link">
              مساعدة في اختيار القهوة <ArrowLeft size={15} />
            </Link>
          </details>
        </div>
      </div>
    </div>
  );
}

function useCartDetails() {
  const { products } = useStore();
  const { lines } = useCart();
  return lines.map((line) => {
    const product = products.find((p) => p.id === line.productId);
    const variant = product?.variants.find((v) => v.id === line.variantId);
    return {
      line,
      product,
      variant,
      valid:
        !!product &&
        !!variant &&
        product.grinds.includes(line.grind) &&
        stock(product, variant) >= line.quantity,
      total: (variant?.price || 0) * line.quantity,
    };
  });
}
export function CartPage() {
  const { remove, setQuantity } = useCart();
  const details = useCartDetails();
  const subtotal = details.reduce((sum, d) => sum + d.total, 0);
  return (
    <div className="container page-space">
      <div className="page-title">
        <span className="eyebrow">قربنا نجهّز قهوتك</span>
        <h1>سلة اختياراتك.</h1>
      </div>
      {!details.length ? (
        <Empty title="السلة مستنية قهوتك" description="اختار توليفتك وارجع هنا عشان تكمّل الطلب.">
          <Link className="btn" to="/shop">
            اكتشف القهوة <ArrowLeft size={17} />
          </Link>
        </Empty>
      ) : (
        <div className="checkout-layout">
          <div className="cart-items">
            {details.map(({ line, product, variant, total, valid }) => (
              <article className="cart-item" key={lineKey(line)}>
                {product && <img src={product.image} alt={product.name} />}
                <div className="cart-item-info">
                  <h3>{product?.name || 'منتج لم يعد متاحًا'}</h3>
                  <p>
                    {variant?.weight} جم · {line.grind}
                  </p>
                  {!valid && (
                    <small className="danger-text">
                      الكمية أو الاختيار غير متاح؛ عدّل السلة للمتابعة.
                    </small>
                  )}
                  <Quantity
                    value={line.quantity}
                    onChange={(n) => setQuantity(lineKey(line), n)}
                    max={
                      product && variant ? Math.max(1, Math.min(30, stock(product, variant))) : 1
                    }
                  />
                </div>
                <div className="cart-item-end">
                  <strong>{money(total)}</strong>
                  <button
                    className="icon-button muted"
                    aria-label="إزالة من السلة"
                    onClick={() => remove(lineKey(line))}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </article>
            ))}
            <Link to="/shop" className="text-link">
              كمّل تصفح القهوة <ArrowLeft size={16} />
            </Link>
          </div>
          <aside className="summary-card">
            <h2>ملخص السلة</h2>
            <div className="row between">
              <span>المنتجات</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <div className="row between muted">
              <span>الشحن</span>
              <span>حسب منطقة التوصيل</span>
            </div>
            <div className="summary-total">
              <span>المجموع قبل الشحن</span>
              <strong>{money(subtotal)}</strong>
            </div>
            {details.every((d) => d.valid) ? (
              <Link className="btn full" to="/checkout">
                كمّل الطلب <ArrowLeft size={17} />
              </Link>
            ) : (
              <Alert>راجع المنتجات غير المتاحة قبل المتابعة.</Alert>
            )}
            <small className="muted">الإجمالي النهائي يظهر قبل تأكيد الطلب.</small>
          </aside>
        </div>
      )}
    </div>
  );
}

export function Checkout() {
  const { settings, refresh } = useStore();
  const { clear } = useCart();
  const details = useCartDetails();
  const navigate = useNavigate();
  const [zoneId, setZone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const zone = settings.shippingZones.find((z) => z.id === zoneId);
  const subtotal = details.reduce((sum, d) => sum + d.total, 0);
  const [key] = useState(() => {
    try {
      const old = sessionStorage.getItem('dar-order-key');
      if (old) return old;
      const next = crypto.randomUUID();
      sessionStorage.setItem('dar-order-key', next);
      return next;
    } catch {
      return crypto.randomUUID();
    }
  });
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const form = new FormData(e.currentTarget);
    const customer = Object.fromEntries(
      ['name', 'phone', 'city', 'address', 'notes'].map((k) => [k, String(form.get(k) || '')]),
    );
    try {
      const order = await send<Order>('/orders', 'POST', {
        idempotencyKey: key,
        customer,
        zoneId,
        paymentMethod: 'cod',
        expectedTotal: subtotal + (zone?.fee || 0),
        items: details.map((d) => d.line),
      });
      clear();
      try {
        sessionStorage.removeItem('dar-order-key');
      } catch {}
      void refresh().catch(() => {});
      navigate(`/order/${order.token}`, { replace: true });
    } catch (err) {
      setError((err as Error).message);
      void refresh().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  if (!details.length)
    return (
      <div className="container page-space">
        <Empty title="اختار قهوتك الأول" description="السلة فارغة حاليًا.">
          <Link to="/shop" className="btn">
            تصفح القهوة
          </Link>
        </Empty>
      </div>
    );
  return (
    <div className="container page-space">
      <div className="breadcrumbs">
        <Link to="/cart">السلة</Link>
        <ChevronLeft size={14} />
        <span>إتمام الطلب</span>
      </div>
      <div className="page-title">
        <span className="eyebrow">خطوة وتكمل الحكاية</span>
        <h1>نوصلها فين؟</h1>
        <p>كمّل طلبك من غير إنشاء حساب.</p>
      </div>
      {settings.mode === 'preview' && (
        <Alert kind="info">ده طلب تجريبي، لا يتم تحصيل مبالغ أو إرسال شحنة.</Alert>
      )}
      <form className="checkout-layout" onSubmit={submit}>
        <div className="panel checkout-form">
          <h2>بيانات التوصيل</h2>
          <div className="form-grid">
            <label className="field">
              الاسم بالكامل
              <input name="name" autoComplete="name" required minLength={3} maxLength={100} />
            </label>
            <label className="field">
              رقم الموبايل
              <input
                name="phone"
                type="tel"
                dir="ltr"
                autoComplete="tel"
                required
                pattern="\+?[0-9 ()\-]{8,25}"
                maxLength={25}
                placeholder="01xxxxxxxxx"
              />
            </label>
            <label className="field">
              منطقة الشحن
              <select required value={zoneId} onChange={(e) => setZone(e.target.value)}>
                <option value="">اختار المنطقة</option>
                {settings.shippingZones.map((z) => (
                  <option value={z.id} key={z.id}>
                    {z.name} — {money(z.fee)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              المدينة / الحي
              <input name="city" required maxLength={200} autoComplete="address-level2" />
            </label>
            <label className="field full-span">
              العنوان بالتفصيل
              <textarea
                name="address"
                required
                minLength={8}
                maxLength={500}
                autoComplete="street-address"
                placeholder="الشارع، رقم العمارة، الدور، الشقة وأقرب علامة مميزة"
              />
            </label>
            <label className="field full-span">
              ملاحظات للتوصيل <span className="optional">اختياري</span>
              <textarea name="notes" maxLength={500} rows={2} />
            </label>
          </div>
          <h2>طريقة الدفع</h2>
          {settings.codEnabled ? (
            <div className="payment-option">
              <CheckCircle2 size={21} />
              <div>
                <strong>الدفع عند الاستلام</strong>
                <p>ادفع قيمة طلبك عند وصوله.</p>
              </div>
            </div>
          ) : (
            <Alert>استقبال الطلبات متوقف لحين تفعيل طريقة دفع.</Alert>
          )}
          <p className="tiny muted">
            بإتمام الطلب، توافق على <Link to="/policies/privacy">سياسة الخصوصية</Link> و
            <Link to="/policies/returns">سياسة الاستبدال</Link>.
          </p>
        </div>
        <aside className="summary-card">
          <h2>طلبك</h2>
          {details.map((d) => (
            <div className="checkout-line" key={lineKey(d.line)}>
              <span>
                {d.product?.name}
                <small>
                  {d.variant?.weight} جم · {d.line.grind} × {d.line.quantity}
                </small>
              </span>
              <strong>{money(d.total)}</strong>
            </div>
          ))}
          <div className="row between">
            <span>الشحن</span>
            <strong>{zone ? money(zone.fee) : 'اختار المنطقة'}</strong>
          </div>
          {zone && <p className="tiny muted">مدة التوصيل: {zone.eta}</p>}
          <div className="summary-total">
            <span>الإجمالي</span>
            <strong>{money(subtotal + (zone?.fee || 0))}</strong>
          </div>
          <Alert>{error}</Alert>
          {!details.every((d) => d.valid) && (
            <Alert>
              بعض الاختيارات غير متاحة. <Link to="/cart">راجع السلة.</Link>
            </Alert>
          )}
          <button
            className="btn full"
            disabled={busy || !zone || !settings.codEnabled || !details.every((d) => d.valid)}
          >
            {busy
              ? 'جاري تسجيل الطلب…'
              : settings.mode === 'preview'
                ? 'تأكيد الطلب التجريبي'
                : 'تأكيد الطلب'}
            <ArrowLeft size={17} />
          </button>
          <small className="muted">سيتم التحقق من السعر والتوفر عند التأكيد.</small>
        </aside>
      </form>
    </div>
  );
}

export function OrderPage() {
  const { token } = useParams();
  const {
    data: order,
    error,
    loading,
    reload,
  } = useAsync(() => api<Order>(`/orders/${token}`), [token]);
  const [copied, setCopied] = useState(false);
  if (loading && !order) return <Loading />;
  if (error)
    return (
      <div className="container page-space">
        <Alert>{error}</Alert>
      </div>
    );
  if (!order) return null;
  return (
    <div className="container narrow page-space">
      <div className="order-success">
        <span className="success-icon">
          <Check size={32} />
        </span>
        <span className="eyebrow">وصلنا طلبك</span>
        <h1>{order.demo ? 'اتسجّل طلبك التجريبي.' : 'شكرًا لاختيارك دار البن.'}</h1>
        <p>
          رقم طلبك <strong dir="ltr">{order.reference}</strong>
        </p>
        <div className="row center">
          <Status value={order.status} />
          <Status value={order.paymentStatus} />
        </div>
      </div>
      {order.demo && (
        <Alert kind="info">الطلب محفوظ للتجربة في النظام. لن تتم عملية شحن أو تحصيل.</Alert>
      )}
      <div className="panel">
        <h2>تفاصيل الطلب</h2>
        {order.items.map((item, i) => (
          <div className="checkout-line" key={i}>
            <span>
              {item.name}
              <small>
                {item.weight} جم · {item.grind} × {item.quantity}
              </small>
            </span>
            <strong>{money(item.total)}</strong>
          </div>
        ))}
        <div className="row between">
          <span>الشحن · {order.zone}</span>
          <strong>{money(order.shipping)}</strong>
        </div>
        <div className="summary-total">
          <span>الإجمالي</span>
          <strong>{money(order.total)}</strong>
        </div>
        <p>مدة التوصيل: {order.eta}</p>
        {order.tracking && <p>متابعة الشحنة: {order.tracking}</p>}
        <small className="muted">تم التسجيل: {date(order.createdAt)}</small>
      </div>
      <div className="row wrap gap">
        <button
          className="btn secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(location.href);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          <Copy size={16} />
          {copied ? 'تم نسخ الرابط' : 'نسخ رابط متابعة الطلب'}
        </button>
        <button className="btn secondary" onClick={reload}>
          تحديث الحالة
        </button>
        <Link className="text-link" to="/shop">
          ارجع للقهوة <ArrowLeft size={16} />
        </Link>
      </div>
      <p className="tiny muted">احتفظ بالرابط لمتابعة حالة الطلب. لا تشاركه مع الآخرين.</p>
    </div>
  );
}

export function Guide() {
  const { products } = useStore();
  const [brew, setBrew] = useState('');
  const [roast, setRoast] = useState('');
  const choices = products.filter(
    (p) => (!brew || p.brew.includes(brew)) && (!roast || p.roast === roast),
  );
  return (
    <div className="container page-space">
      <div className="page-title">
        <span className="eyebrow">مش لازم تكون خبير قهوة</span>
        <h1>نلاقي قهوتك سوا.</h1>
        <p>ابدأ بطريقتك، واختار درجة التحميص اللي بتحبها.</p>
      </div>
      <div className="guide-steps">
        <fieldset className="panel">
          <legend>01 — بتعمل قهوتك إزاي؟</legend>
          <div className="pills">
            {['تركي', 'إسبريسو', 'فلتر'].map((b) => (
              <button
                key={b}
                className={brew === b ? 'selected' : ''}
                onClick={() => setBrew(brew === b ? '' : b)}
              >
                {b}
              </button>
            ))}
          </div>
          <p className="muted">طريقة التحضير تساعدنا نرشّح المنتجات والطحن المناسبين.</p>
        </fieldset>
        <fieldset className="panel">
          <legend>02 — بتحب التحميص إيه؟</legend>
          <div className="pills">
            {['فاتح', 'وسط', 'غامق'].map((r) => (
              <button
                key={r}
                className={roast === r ? 'selected' : ''}
                onClick={() => setRoast(roast === r ? '' : r)}
              >
                {r}
              </button>
            ))}
          </div>
          <p className="muted">لو لسه بتكتشف ذوقك، سيب الاختيار مفتوح وشوف المتاح.</p>
        </fieldset>
      </div>
      <SectionTitle eyebrow="اختيارات مناسبة لطريقتك" title="ابدأ من هنا" />
      {choices.length ? (
        <div className="product-grid">
          {choices.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <Empty
          title="الاختيار ده مش متاح حاليًا"
          description="جرّب درجة تحميص أو طريقة تحضير مختلفة."
        >
          <button
            className="btn secondary"
            onClick={() => {
              setBrew('');
              setRoast('');
            }}
          >
            عرض كل الاختيارات
          </button>
        </Empty>
      )}
    </div>
  );
}
export function About() {
  const { settings } = useStore();
  return (
    <div className="container page-space">
      <div className="about-layout">
        <div>
          <span className="eyebrow">حكاية دار البن</span>
          <h1>{settings.storyTitle}</h1>
          <p>{settings.storyText}</p>
          <Link className="btn" to="/shop">
            اكتشف توليفتنا <ArrowLeft size={17} />
          </Link>
        </div>
        <img src={settings.heroImage} alt="قهوة دار البن البرازيلي" />
      </div>
      <div className="social-story">
        <div>
          <span className="eyebrow">دار البن، أقرب لك</span>
          <h2>الحكاية مكملة على صفحاتنا.</h2>
          <p>تابع دار البن البرازيلي على فيسبوك وإنستجرام.</p>
        </div>
        <SocialLinks />
      </div>
      <section className="section about-journey">
        <SectionTitle eyebrow="من حبوب البن لفنجانك" title="كل خطوة جزء من الحكاية" />
        <div className="coffee-notes">
          {[
            {
              title: 'القطف والتجميع',
              text: 'الحكاية بتبدأ من حبوب البن؛ قطفها وتجميعها أول خطوة في الرحلة.',
            },
            {
              title: 'اختيار الحبوب',
              text: 'اختيار الحبوب هو بداية الاهتمام بالتفاصيل، قبل ما تبدأ رحلة التحميص.',
            },
            {
              title: 'التحميص والطحن',
              text: 'من التحميص للطحن، لحد ما توصل التوليفة لفنجانك. كل تفصيلة لها دور في المذاق.',
            },
          ].map(({ title, text }, index) => (
            <article className="coffee-note" key={title}>
              <div className="note-top">
                <Bean size={25} />
                <span>0{index + 1}</span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <Branches />
    </div>
  );
}
export function Policy() {
  const { type } = useParams();
  const { settings } = useStore();
  const mapping: Record<string, { title: string; body: string }> = {
    shipping: { title: 'الشحن والتوصيل', body: settings.shippingPolicy },
    returns: { title: 'الاستبدال والاسترجاع', body: settings.returnsPolicy },
    privacy: { title: 'سياسة الخصوصية', body: settings.privacyPolicy },
  };
  const policy = mapping[type || ''];
  if (!policy) return <NotFound />;
  return (
    <div className="container narrow page-space">
      <div className="page-title">
        <h1>{policy.title}</h1>
      </div>
      <div className="panel policy-text">
        {policy.body || 'تفاصيل السياسة قيد الإعداد قبل افتتاح المتجر واستقبال طلبات فعلية.'}
      </div>
    </div>
  );
}
export function NotFound() {
  return (
    <div className="container page-space">
      <Empty title="الصفحة مش موجودة" description="ممكن الرابط اتغير. نرجع نختار قهوتنا؟">
        <Link to="/" className="btn">
          ارجع للرئيسية <ArrowLeft size={17} />
        </Link>
      </Empty>
    </div>
  );
}
