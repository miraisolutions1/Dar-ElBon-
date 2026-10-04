import { PackageCards, CustomBlendCallout } from './packaged-store';
import { isPackagedCoffee, packageKey, packageTitle } from './packaged-coffee';
import copy from '../content/site-copy-ar.json';
import experience from '../content/coffee-experience-ar.json';
import { TasteQuiz, RecipeCards } from './coffee-experience';
import { BlendBuilder } from './blend-builder';
import { HeroMedia } from './hero-media';
import { DrinksMenu } from './drinks-menu';
import { BrewMotion } from './brew-motion';
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
      <SectionTitle eyebrow={copy.branches.eyebrow} title={copy.branches.title} />
      <p className="section-intro">
        {settings.branches.length === 4
          ? copy.branches.intro
          : 'اختار الفرع الأقرب لك، والحكاية تكمل مع كل فنجان.'}
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
              {copy.branches.mapCta} <ArrowUpLeft size={16} />
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
      <div className="storefront-frame">
        <header className="site-header">
          <div className="container header-inner">
            <Link className="header-brand" to="/" aria-label="دار البن — الرئيسية">
              <Brand />
            </Link>
            <nav
              id="main-navigation"
              className={menu ? 'site-nav open' : 'site-nav'}
              aria-label="القائمة الرئيسية"
            >
              <NavLink to="/" end>
                الرئيسية
              </NavLink>
              <NavLink to="/shop">{copy.navigation.shop}</NavLink>
              <NavLink to="/blend">كوّن توليفتك</NavLink>
              <NavLink to="/about">حكاية دار البن</NavLink>
              <NavLink to="/branches">فروعنا</NavLink>
              <NavLink to="/guide">ساعدني أختار</NavLink>
            </nav>
            <div className="header-actions">
              <Link className="header-guide" to="/quiz">
                {experience.header.quizCta} <ArrowLeft size={15} />
              </Link>
              <button
                className="icon-button search-toggle"
                aria-label="البحث في القهوة"
                aria-expanded={search}
                aria-controls="header-search"
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
          {search && (
            <form
              className="header-search container"
              id="header-search"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                nav(
                  '/shop?q=' + encodeURIComponent(new FormData(e.currentTarget).get('q') as string),
                );
                setSearch(false);
              }}
            >
              <input
                name="q"
                autoFocus
                placeholder={copy.navigation.searchPlaceholder}
                aria-label="كلمة البحث"
              />
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
              <p className="footer-story">{copy.brand.footerText}</p>
              <SocialLinks />
            </div>
            <div>
              <h3>اكتشف دار البن</h3>
              <Link to="/shop">كل القهوة</Link>
              <Link to="/about">حكايتنا</Link>
              <Link to="/branches">فروعنا</Link>
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
            <span className="developer-credit" dir="ltr">
              Developed by{' '}
              <a href="https://miraisolutions.net/" target="_blank" rel="noopener noreferrer">
                <strong>Mirai Solutions</strong>
              </a>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export function Home() {
  const { settings, products } = useStore();
  const coffeeSheet = '/images/brewing-editorial.webp';
  const sections: Record<string, React.ReactNode> = {
    branches: <Branches />,
    quiz: (
      <section className="container section">
        <div className="home-quiz-teaser">
          <div>
            <span className="eyebrow">كل مزاج، وله فنجان</span>
            <h2>لسه بتدور على قهوتك؟</h2>
            <p>٣ اختيارات بسيطة عن طريقتك وذوقك. نرشّح لك عبوة تناسبك، ونقول لك ليه.</p>
            <Link className="btn" to="/quiz">
              اكتشف فنجانك <ArrowLeft size={18} />
            </Link>
          </div>
          <img
            src="/images/drink-espresso.webp"
            alt="فنجان إسبريسو على خلفية دافئة"
            loading="lazy"
          />
        </div>
      </section>
    ),
    recipes: (
      <section className="container home-learn-note">
        <div>
          <span className="eyebrow">تفاصيل صغيرة، تفرق في الفنجان</span>
          <h2>القهوة الحلوة تبدأ من طريقة تحضيرها.</h2>
          <p>من الكنكة للفلتر. خطوات بسيطة، ومقادير واضحة، وحكاية تستاهل تتعمل على الهادي.</p>
        </div>
        <Link className="text-link" to="/learn">
          اكتشف طرق التحضير <ArrowLeft size={18} />
        </Link>
      </section>
    ),
    experience: <DrinksMenu compact />,
    brewing: (
      <section className="container section coffee-selection">
        <SectionTitle eyebrow={copy.brewing.eyebrow} title={copy.brewing.title} />
        <div className="brew-grid">
          {copy.brewing.items
            .map((item, index) => ({
              ...item,
              position: ['100%', '50%', '0%'][index],
              number: index + 1,
              label: ['قهوة تركي', 'إسبريسو', 'قهوة فلتر'][index],
              tool: ['على نار هادية', 'من ماكينة القهوة', 'بالتقطير'][index],
            }))
            .map(({ name, description, position, number, label, tool }) => (
              <Link
                key={name}
                to={`${products.some((p) => isPackagedCoffee(p) && p.brew.includes(name)) ? '/shop' : '/guide'}?brew=${encodeURIComponent(name)}`}
                className="brew-card"
              >
                <div className="brew-topline">
                  <span className="brew-number">0{number}</span>
                  <span className="brew-tool">{tool}</span>
                </div>
                <div
                  className="brew-photo"
                  role="img"
                  aria-label={`طريقة تحضير ${name}`}
                  style={{ backgroundImage: `url(${coffeeSheet})`, backgroundPositionX: position }}
                />
                <div className="brew-caption">
                  <h3>{label}</h3>
                  <p>{description}</p>
                  <small className="brew-route-label">
                    {products.some((p) => isPackagedCoffee(p) && p.brew.includes(name))
                      ? 'شوف البن المناسب'
                      : 'اعرف طريقة التحضير'}
                    <ArrowLeft size={16} aria-hidden="true" />
                  </small>
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
      <section className="container section home-featured package-store-section">
        <div className="package-section-heading">
          <div>
            <span className="eyebrow">المتجر · قهوة دار البن لبيتك</span>
            <h2>حكايتك تبدأ باختيارك.</h2>
            <p>العبوة، التحميص، سادة أو محوج. فنجان معمول على مزاجك.</p>
          </div>
          <Link className="text-link" to="/shop">
            افتح المتجر <ArrowLeft size={18} />
          </Link>
        </div>
        <PackageCards products={products} />
        <CustomBlendCallout />
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
            <span className="eyebrow">{copy.story.eyebrow}</span>
            <h2>{settings.storyTitle}</h2>
            <p>{settings.storyText}</p>
            <Link className="btn story-button" to="/about">
              {copy.story.cta} <ArrowLeft size={17} />
            </Link>
          </div>
        </div>
      </section>
    ),
    guide: (
      <section className="container section home-guide">
        <SectionTitle eyebrow={copy.guide.eyebrow} title={copy.guide.tipsTitle} />
        <div className="coffee-notes">
          {copy.guide.tips
            .map((tip, index) => ({
              ...tip,
              number: '0' + (index + 1),
              icon: [<SlidersHorizontal size={25} />, <Package size={25} />, <Bean size={25} />][
                index
              ],
            }))
            .map(({ number, title, text, icon }) => (
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
            <h2>{copy.guide.bannerTitle}</h2>
            <p>{copy.guide.bannerText}</p>
          </div>
          <Link className="btn" to="/guide">
            {copy.guide.cta} <ArrowLeft size={17} />
          </Link>
        </div>
        <div className="coffee-faq">
          <div>
            <span className="eyebrow">{copy.faq.eyebrow}</span>
            <h2>{copy.faq.title}</h2>
            <p>{copy.faq.intro}</p>
          </div>
          <div className="faq-items">
            {copy.faq.items.map((item) => (
              <details key={item.question}>
                <summary>
                  {item.question}
                  <Plus size={18} />
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    ),
  };
  return (
    <>
      <section className="hero">
        <HeroMedia image={settings.heroImage} video={settings.heroVideo} />
        <div className="container hero-content">
          <div className="hero-copy">
            <span className="eyebrow">{copy.hero.eyebrow}</span>
            <h1>{settings.heroTitle}</h1>
            <p>{settings.heroSubtitle}</p>
            <div className="hero-buttons">
              <Link className="btn" to="/shop">
                {copy.hero.primaryCta} <ArrowLeft size={18} />
              </Link>
              <Link className="hero-secondary" to="/branches">
                {copy.hero.secondaryCta} <ArrowLeft size={16} />
              </Link>
            </div>
            <div className="hero-detail">
              <span />
              <span>{copy.hero.detail}</span>
            </div>
          </div>
        </div>
      </section>
      <div className="ritual-strip container">
        <span>
          <Bean size={21} strokeWidth={1.4} />
          <span>
            {copy.ritual[0].lead} <strong>{copy.ritual[0].emphasis}</strong>
          </span>
        </span>
        <i />
        <span>
          <SlidersHorizontal size={21} strokeWidth={1.4} />
          <span>
            {copy.ritual[1].lead} <strong>{copy.ritual[1].emphasis}</strong>
          </span>
        </span>
        <i />
        <span>
          <ShoppingBag size={21} strokeWidth={1.4} />
          <span>
            {copy.ritual[2].lead} <strong>{copy.ritual[2].emphasis}</strong>
          </span>
        </span>
      </div>
      {[
        'featured',
        ...['brewing', 'story', 'experience', 'recipes', 'quiz', 'branches', 'guide'].filter(
          (s) =>
            settings.sections.includes(s) && !(s === 'guide' && settings.sections.includes('quiz')),
        ),
      ].map((s) => (
        <div key={s}>{sections[s]}</div>
      ))}
    </>
  );
}

export function Shop() {
  const { products } = useStore();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const norm = (s: string) =>
    s
      .replace(/[أإآ]/g, 'ا')
      .replace(/[\u064B-\u065F]/g, '')
      .toLowerCase();
  const packaged = products.filter(isPackagedCoffee);
  const filtered = packaged.filter((p) => norm(p.name + ' ' + p.description).includes(norm(q)));
  return (
    <div className="container page-space package-store-section">
      <div className="page-title">
        <span className="eyebrow">المتجر · الحكاية في الفنجان.</span>
        <h1>اختار عبوتك. وكملها على مزاجك.</h1>
        <p>ابدأ بشكل العبوة، وبعدها اختار التحميص وسادة أو محوج والوزن والطحنة.</p>
      </div>
      <div className="package-order-steps" aria-label="خطوات اختيار القهوة">
        <span>
          <b>١</b> اختار العبوة
        </span>
        <span>
          <b>٢</b> التحميص والتوليفة
        </span>
        <span>
          <b>٣</b> الوزن والطحنة
        </span>
      </div>
      <div className="search-input package-search">
        <Search size={18} />
        <input
          aria-label="ابحث عن عبوة"
          placeholder="بتدور على عبوة؟"
          value={q}
          onChange={(e) =>
            setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })
          }
        />
      </div>
      {filtered.length ? (
        <PackageCards products={filtered} />
      ) : (
        <Empty title="مفيش عبوة بالاسم ده" description="جرّب اسم تاني أو اعرض كل العبوات." />
      )}
      <CustomBlendCallout />
    </div>
  );
}

export function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
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
  if (!isPackagedCoffee(product))
    return (
      <div className="container page-space">
        <CustomBlendCallout />
      </div>
    );
  const siblings = products.filter(
    (p) => isPackagedCoffee(p) && packageKey(p) === packageKey(product),
  );
  function chooseDetails(roast: string, kind: string) {
    const next = siblings.find((p) => p.roast === roast && p.kind === kind);
    if (next) navigate(`/products/${next.slug}`);
  }
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
          <h1>{packageTitle(product)}</h1>
          <p className="description">{product.description}</p>
          <strong className="detail-price">{money(variant?.price || 0)}</strong>
          {product.demo && <span className="muted tiny">سعر ووزن تجريبيان لحين الاعتماد</span>}
          <fieldset className="package-choice">
            <legend>١ · اختار التحميص</legend>
            <div className="pills">
              {['فاتح', 'وسط', 'غامق'].map((roast) => (
                <button
                  type="button"
                  key={roast}
                  className={product.roast === roast ? 'selected' : ''}
                  disabled={!siblings.some((p) => p.roast === roast && p.kind === product.kind)}
                  onClick={() => chooseDetails(roast, product.kind)}
                >
                  {roast}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="package-choice">
            <legend>٢ · سادة ولا محوج؟</legend>
            <div className="pills">
              {['سادة', 'محوج'].map((kind) => (
                <button
                  type="button"
                  key={kind}
                  className={product.kind === kind ? 'selected' : ''}
                  disabled={!siblings.some((p) => p.kind === kind && p.roast === product.roast)}
                  onClick={() => chooseDetails(product.roast, kind)}
                >
                  {kind}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>٣ · اختار الوزن</legend>
            <div className="pills weight-pills">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  className={v.id === variant?.id ? 'selected' : ''}
                  onClick={() => {
                    navigate(`/products/${product.slug}?variant=${encodeURIComponent(v.id!)}`);
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
  const demand = new Map<string, number>();
  const details = lines.map((line) => {
    if (line.type === 'blend') {
      const components = line.components.map((component) => {
        const product = products.find((p) => p.id === component.productId);
        const variant = product?.variants.find((v) => v.weight === 50);
        const valid =
          !!product &&
          product.active &&
          product.kind === 'حبوب للتوليف' &&
          product.stockMode === 'grams' &&
          !!variant &&
          product.grinds.includes(line.grind);
        const key = `${component.productId}/grams`;
        demand.set(key, (demand.get(key) || 0) + component.grams * line.quantity);
        return { ...component, product, variant, valid, key };
      });
      const weight = components.reduce((sum, c) => sum + c.grams, 0);
      const price = components.reduce(
        (sum, c) => sum + ((c.variant?.price || 0) * c.grams) / 50,
        0,
      );
      const available = Math.min(
        30,
        ...components.map((c) => Math.floor((c.product?.stockGrams || 0) / c.grams)),
      );
      const variant = { id: lineKey(line), weight, price, stock: available };
      const product = {
        id: lineKey(line),
        slug: 'custom-blend',
        name: 'توليفتك الخاصة',
        description: '',
        roast: '',
        brew: [],
        kind: 'توليفة خاصة',
        grinds: [line.grind],
        image: '/images/coffee-story.webp',
        active: true,
        featured: false,
        demo: components.some((c) => c.product?.demo),
        stockMode: 'units' as const,
        stockGrams: 0,
        variants: [variant],
      };
      return {
        line,
        product,
        variant,
        composition: components
          .map((c) => `${c.product?.name || 'نوع غير متاح'} ${c.grams} جم`)
          .join(' + '),
        valid:
          weight > 0 &&
          weight <= 3000 &&
          components.every((c) => c.valid) &&
          available >= line.quantity,
        total: price * line.quantity,
        resources: components.map((c) => ({ key: c.key, available: c.product?.stockGrams || 0 })),
      };
    }
    const product = products.find((p) => p.id === line.productId);
    const variant = product?.variants.find((v) => v.id === line.variantId);
    const key =
      product?.stockMode === 'grams'
        ? `${line.productId}/grams`
        : `${line.productId}/${line.variantId}`;
    const requested =
      product?.stockMode === 'grams' ? (variant?.weight || 0) * line.quantity : line.quantity;
    demand.set(key, (demand.get(key) || 0) + requested);
    return {
      line,
      product,
      variant,
      composition: '',
      valid:
        !!product &&
        product.active &&
        !!variant &&
        product.grinds.includes(line.grind) &&
        stock(product, variant) >= line.quantity,
      total: (variant?.price || 0) * line.quantity,
      resources: [
        {
          key,
          available: product?.stockMode === 'grams' ? product.stockGrams : variant?.stock || 0,
        },
      ],
    };
  });
  return details.map((detail) => ({
    ...detail,
    valid:
      detail.valid &&
      detail.resources.every(({ key, available }) => (demand.get(key) || 0) <= available),
  }));
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
            {details.map(({ line, product, variant, total, valid, composition }) => (
              <article className="cart-item" key={lineKey(line)}>
                {product && <img src={product.image} alt={product.name} />}
                <div className="cart-item-info">
                  <h3>{product?.name || 'منتج لم يعد متاحًا'}</h3>
                  <p>
                    {variant?.weight} جم · {line.grind}
                  </p>
                  {composition && <p className="blend-composition">{composition}</p>}
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
  const [fulfillment, setFulfillment] = useState<'delivery' | 'pickup'>('delivery');
  const [pickupBranchIndex, setPickupBranchIndex] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const zone = settings.shippingZones.find((z) => z.id === zoneId);
  const shipping = fulfillment === 'pickup' ? 0 : zone?.fee || 0;
  const destinationReady =
    fulfillment === 'pickup'
      ? pickupBranchIndex !== '' &&
        !!settings.branches[Number(pickupBranchIndex)] &&
        settings.branches[Number(pickupBranchIndex)].enabled !== false
      : !!zone;
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
        fulfillment,
        pickupBranchIndex: fulfillment === 'pickup' ? Number(pickupBranchIndex) : undefined,
        zoneId: fulfillment === 'delivery' ? zoneId : undefined,
        paymentMethod: 'cod',
        expectedTotal: subtotal + shipping,
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
        <h1>تستلم قهوتك إزاي؟</h1>
        <p>كمّل طلبك من غير إنشاء حساب.</p>
      </div>
      {settings.mode === 'preview' && (
        <Alert kind="info">ده طلب تجريبي، لا يتم تحصيل مبالغ أو إرسال شحنة.</Alert>
      )}
      <form className="checkout-layout" onSubmit={submit}>
        <div className="panel checkout-form">
          <h2>طريقة الاستلام</h2>
          <fieldset className="fulfillment-options">
            <legend className="sr-only">طريقة الاستلام</legend>
            <label>
              <input
                type="radio"
                name="fulfillment"
                value="delivery"
                checked={fulfillment === 'delivery'}
                onChange={() => setFulfillment('delivery')}
              />
              توصيل للعنوان
            </label>
            {!!settings.branches.length && (
              <label>
                <input
                  type="radio"
                  name="fulfillment"
                  value="pickup"
                  checked={fulfillment === 'pickup'}
                  onChange={() => setFulfillment('pickup')}
                />
                استلام من الفرع
              </label>
            )}
          </fieldset>
          <h2>بياناتك</h2>
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
            {fulfillment === 'delivery' ? (
              <>
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
              </>
            ) : (
              <label className="field full-span">
                فرع الاستلام
                <select
                  value={pickupBranchIndex}
                  required
                  onChange={(e) => setPickupBranchIndex(e.target.value)}
                >
                  <option value="">اختار الفرع</option>
                  {settings.branches.map((branch, index) => (
                    <option key={index} value={index} disabled={branch.enabled === false}>
                      {branch.name} — {branch.address}
                    </option>
                  ))}
                </select>
                <small>اسم الفرع وعنوانه بيتحفظوا مع طلبك.</small>
              </label>
            )}
            <label className="field full-span">
              ملاحظات للطلب <span className="optional">اختياري</span>
              <textarea name="notes" maxLength={500} rows={2} />
            </label>
          </div>
          <h2>طريقة الدفع</h2>
          {settings.codEnabled ? (
            <div className="payment-option">
              <CheckCircle2 size={21} />
              <div>
                <strong>الدفع عند الاستلام</strong>
                <p>
                  {fulfillment === 'pickup'
                    ? 'ادفع قيمة طلبك عند الاستلام من الفرع.'
                    : 'ادفع قيمة طلبك عند وصوله.'}
                </p>
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
                {d.composition && <small>{d.composition}</small>}
              </span>
              <strong>{money(d.total)}</strong>
            </div>
          ))}
          <div className="row between">
            <span>الشحن</span>
            <strong>
              {fulfillment === 'pickup' ? money(0) : zone ? money(zone.fee) : 'اختار المنطقة'}
            </strong>
          </div>
          {fulfillment === 'delivery' && zone && (
            <p className="tiny muted">مدة التوصيل: {zone.eta}</p>
          )}
          {fulfillment === 'pickup' && pickupBranchIndex !== '' && (
            <p className="tiny muted">
              الاستلام من: {settings.branches[Number(pickupBranchIndex)]?.name}
            </p>
          )}
          <div className="summary-total">
            <span>الإجمالي</span>
            <strong>{money(subtotal + shipping)}</strong>
          </div>
          <Alert>{error}</Alert>
          {!details.every((d) => d.valid) && (
            <Alert>
              بعض الاختيارات غير متاحة. <Link to="/cart">راجع السلة.</Link>
            </Alert>
          )}
          <button
            className="btn full"
            disabled={
              busy || !destinationReady || !settings.codEnabled || !details.every((d) => d.valid)
            }
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
              {item.type === 'blend' && (
                <small>{item.components.map((c) => `${c.name} ${c.grams} جم`).join(' + ')}</small>
              )}
            </span>
            <strong>{money(item.total)}</strong>
          </div>
        ))}
        <div className="row between">
          <span>
            {order.fulfillment === 'pickup' ? 'استلام من الفرع' : `الشحن · ${order.zone}`}
          </span>
          <strong>{money(order.shipping)}</strong>
        </div>
        <div className="summary-total">
          <span>الإجمالي</span>
          <strong>{money(order.total)}</strong>
        </div>
        {order.fulfillment === 'pickup' && order.pickupBranch ? (
          <div className="pickup-confirmation">
            <h3>الاستلام من: {order.pickupBranch.name}</h3>
            <p>{order.pickupBranch.address}</p>
            <p>تابع حالة الطلب قبل التوجّه للفرع.</p>
          </div>
        ) : (
          <p>مدة التوصيل: {order.eta}</p>
        )}
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
  const [params] = useSearchParams();
  const requestedBrew = params.get('brew') || '';
  const [brew, setBrew] = useState(
    ['تركي', 'إسبريسو', 'فلتر'].includes(requestedBrew) ? requestedBrew : '',
  );
  const [roast, setRoast] = useState('');
  useEffect(() => {
    setBrew(['تركي', 'إسبريسو', 'فلتر'].includes(requestedBrew) ? requestedBrew : '');
  }, [requestedBrew]);
  const methodNotes = Object.fromEntries(
    copy.brewing.items.map((item) => [item.name, item.guideText]),
  );
  const choices = products.filter(
    (p) => isPackagedCoffee(p) && (!brew || p.brew.includes(brew)) && (!roast || p.roast === roast),
  );
  return (
    <div className="container page-space">
      <div className="page-title">
        <span className="eyebrow">{copy.guide.eyebrow}</span>
        <h1>{copy.guide.title}</h1>
        <p>{copy.guide.intro}</p>
      </div>
      <div className="section-action">
        <Link className="btn" to="/quiz">
          اكتشف فنجانك في ٣ أسئلة
        </Link>
        <Link className="btn secondary" to="/learn">
          كروت تحضير القهوة
        </Link>
      </div>
      <div className="guide-steps">
        <fieldset className="panel">
          <legend>{copy.guide.brewStep}</legend>
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
          <legend>{copy.guide.roastStep}</legend>
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
      {brew && (
        <div className="panel method-note">
          <h2>فنجان {brew} على طريقتك</h2>
          <p>{methodNotes[brew]}</p>
        </div>
      )}
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
          description="مفيش توليفة متاحة للاختيار ده دلوقتي. تقدر تشوف البن المتاح أو تغيّر طريقة التحضير."
        >
          <Link className="btn" to="/shop">
            شوف البن المتاح <ArrowLeft size={16} />
          </Link>
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
export function BranchesPage() {
  return (
    <div className="page-space">
      <Branches />
      <DrinksMenu />
      <div className="container branch-social">
        <SocialLinks />
      </div>
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
          {(settings.storyText === copy.story.shortText
            ? copy.story.longParagraphs
            : [settings.storyText]
          ).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <Link className="btn" to="/shop">
            اكتشف توليفتنا <ArrowLeft size={17} />
          </Link>
        </div>
        <img src={settings.heroImage} alt="قهوة دار البن البرازيلي" />
      </div>
      <div className="social-story">
        <div>
          <span className="eyebrow">دار البن، أقرب لك</span>
          <h2>{copy.social.title}</h2>
          <p>{copy.social.text}</p>
        </div>
        <SocialLinks />
      </div>
      <section className="section about-journey">
        <SectionTitle eyebrow={copy.journey.eyebrow} title={copy.journey.title} />
        <figure className="journey-visual">
          <img
            src="/images/coffee-journey.webp"
            alt="صورة توضيحية لرحلة البن من الثمار إلى الحبوب المحمصة والفنجان"
            loading="lazy"
          />
          <figcaption>صورة توضيحية لرحلة البن</figcaption>
        </figure>
        <div className="coffee-notes">
          {copy.journey.items.map(({ title, text }, index) => (
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

export function QuizPage() {
  const { products } = useStore();
  return (
    <div className="page-space quiz-page">
      <TasteQuiz products={products} standalone />
    </div>
  );
}
export function RecipesPage() {
  return (
    <div className="page-space">
      <RecipeCards />
      <BrewMotion />
    </div>
  );
}

export function BlendPage() {
  return (
    <div className="page-space blend-page">
      <BlendBuilder standalone />
    </div>
  );
}
