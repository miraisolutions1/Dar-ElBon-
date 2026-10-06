import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import productsData from '../content/products.json';
import './styles.css';

type Product = {
  id: string;
  name: string;
  category: string;
  image: string;
  source: string;
  weight: number | null;
  roast: string | null;
  price: number | null;
};
type Selection = { id: string; quantity: number };

const products = productsData as Product[];
const KEY = 'bch-jordan-selections-v1';
const categories = ['الكل', 'تركية', 'عربية', 'فلتر', 'إسبريسو'];
const featuredIds = ['121', '135', '148', '149', '136', '7', '109', '11'];
const branches = ['سيتي مول', 'الصويفية', 'الجاردنز', 'مرج الحمام', 'أفينيو مول', 'الفحيص', 'إربد سيتي سنتر', 'إربد شارع الملك حسين', 'إربد شارع البتراء', 'إربد مجمع الباصات', 'المفرق', 'إربد مول'];
const imagePath = (product: Product) => `./images/product-${product.id}.webp`;
const productFacts = (product: Product) => [product.category, product.roast && `تحميص ${product.roast}`, product.weight && `${product.weight} غرام`].filter(Boolean).join(' · ');
const productDescription = (product: Product) => {
  const notes = [];
  if (product.name.includes('بدون هيل')) notes.push('خيار بدون هيل');
  else if (product.name.includes('مع هيل')) notes.push('مع هيل');
  if (product.roast) notes.push(`تحميص ${product.roast}`);
  if (!notes.length) notes.push(product.category);
  return notes.join(' · ');
};

function readSelections(): Selection[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is Selection => item && typeof item.id === 'string' && products.some(product => product.id === item.id) && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 20);
  } catch { return []; }
}

function ProductCard({ product, onAdd, onDetails }: { product: Product; onAdd: (id: string) => void; onDetails: (product: Product, opener: HTMLButtonElement) => void }) {
  return <article className="product-card">
    <div className="product-image-wrap"><span className="product-type">{product.category}</span><img src={imagePath(product)} alt={product.name} loading="lazy" decoding="async" /></div>
    <h3>{product.name}</h3><p className="product-meta">{productFacts(product)}</p>
    <div className="card-actions"><button className="add-button" type="button" aria-label={`أضف ${product.name} لقائمة اختياراتك`} onClick={() => onAdd(product.id)}>أضف للقائمة</button>
      <button className="details-button" type="button" onClick={event => onDetails(product, event.currentTarget)}>تفاصيل</button></div>
  </article>;
}

function App() {
  const [selections, setSelections] = useState<Selection[]>(readSelections);
  const [category, setCategory] = useState('الكل');
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(() => { try { return localStorage.getItem(`${KEY}-branch`) || ''; } catch { return ''; } });
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const selectionButton = useRef<HTMLButtonElement>(null);
  const panelClose = useRef<HTMLButtonElement>(null);
  const panelWasOpen = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogOpener = useRef<HTMLButtonElement | null>(null);

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(selections)); } catch { /* Storage can be disabled; keep the current page usable. */ } }, [selections]);
  useEffect(() => { try { localStorage.setItem(`${KEY}-branch`, branches.includes(selectedBranch) ? selectedBranch : ''); } catch { /* Storage can be disabled; keep the current page usable. */ } }, [selectedBranch]);
  useEffect(() => {
    if (!panelOpen) return;
    panelClose.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setPanelOpen(false); return; }
      if (event.key !== 'Tab') return;
      const panel = document.querySelector('.selection-panel');
      const focusable = [...(panel?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],select,input') || [])].filter(item => item.offsetWidth || item.offsetHeight);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.classList.add('panel-open');
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.classList.remove('panel-open'); };
  }, [panelOpen]);
  useEffect(() => { if (activeProduct && dialog.current && !dialog.current.open) dialog.current.showModal(); }, [activeProduct]);
  useEffect(() => {
    if (!panelOpen && panelWasOpen.current) selectionButton.current?.focus();
    panelWasOpen.current = panelOpen;
  }, [panelOpen]);

  const addItem = (id: string) => setSelections(previous => {
    const found = previous.find(item => item.id === id);
    return found ? previous.map(item => item.id === id ? { ...item, quantity: Math.min(20, item.quantity + 1) } : item) : [...previous, { id, quantity: 1 }];
  });
  const changeQuantity = (id: string, delta: number) => setSelections(previous => previous.map(item => item.id === id ? { ...item, quantity: Math.max(0, Math.min(20, item.quantity + delta)) } : item).filter(item => item.quantity > 0));
  const openProduct = (product: Product, opener: HTMLButtonElement) => { dialogOpener.current = opener; setActiveProduct(product); };
  const visibleProducts = products.filter(product => (category === 'الكل' || product.category === category) && (!query.trim() || product.name.toLocaleLowerCase('ar').includes(query.trim().toLocaleLowerCase('ar'))));
  const totalItems = selections.reduce((sum, item) => sum + item.quantity, 0);
  const card = (product: Product) => <ProductCard key={product.id} product={product} onAdd={addItem} onDetails={openProduct} />;

  return <>
    <a className="skip-link" href="#main">انتقل للمحتوى</a>
    <header className="site-header">
      <a className="brand" href="#home" aria-label="بيت البن البرازيلي، الرئيسية"><img src="./images/logo.png" alt="بيت البن البرازيلي" /></a>
      <button ref={menuButton} className="menu-toggle" aria-expanded={menuOpen} aria-controls="main-nav" aria-label="افتح القائمة" onClick={() => setMenuOpen(value => !value)}><span></span><span></span></button>
      <nav id="main-nav" className={`main-nav${menuOpen ? ' open' : ''}`} aria-label="التنقل الرئيسي">{[['المتجر','#shop'],['التشكيلات','#collections'],['الحكاية','#story'],['الفروع','#branches']].map(([label,href]) => <a href={href} key={href} onClick={() => setMenuOpen(false)}>{label}</a>)}</nav>
      <button ref={selectionButton} className="selection-open" type="button" aria-controls="selection-panel" aria-expanded={panelOpen} onClick={() => setPanelOpen(true)}><span>اختياراتي</span><span className="selection-count">{totalItems}</span></button>
    </header>
    <main id="main">
      <section className="hero" id="home" aria-labelledby="hero-title">
        <div className="hero-copy"><p className="eyebrow"><span className="eyebrow-line"></span> بيت البن البرازيلي <span className="est">EST. 1955</span></p><h1 id="hero-title">القهوة الصَّح.<br /><em>على ذوقك.</em></h1><p className="hero-description">من أول فنجان بالصباح، لقعدة مع اللي بتحبّهم. اختَر قهوتك المفضّلة من بيت البن البرازيلي.</p><a className="button button-gold" href="#shop">اختَر قهوتك <span aria-hidden="true">←</span></a><p className="hero-footnote">بدأت الحكاية في الكويت عام ١٩٥٥، ووصل بيت البن البرازيلي إلى الأردن عام ١٩٩٥.</p></div>
        <div className="hero-scene" aria-label="مجموعة من منتجات بيت البن البرازيلي الأصلية"><div className="scene-glow"></div><div className="scene-beans" aria-hidden="true">✳</div><img className="hero-pack pack-back" src="./images/product-7.webp" alt="" fetchPriority="high" /><img className="hero-pack pack-left" src="./images/product-121.webp" alt="" /><img className="hero-pack pack-right" src="./images/product-109.webp" alt="" /><div className="scene-caption"><span>من أول فنجان</span><span className="caption-rule"></span><span>بتبلّش الحكاية</span></div><span className="scene-index">1955 <i>—</i> 1995</span></div>
        <a className="scroll-cue" href="#shop" aria-label="تصفّح المنتجات"><span></span> اكتشف التشكيلة</a>
      </section>
      <section className="shop-section section-pad" id="shop" aria-labelledby="shop-title"><div className="section-heading"><div><p className="kicker">اختيارك ببلّش من هون</p><h2 id="shop-title">شو قهوتك <em>المفضّلة؟</em></h2><p>مع هيل أو بدون، فاتح أو غامق. تشكيلة بتناسب طريقتك وذوقك.</p></div><a className="text-link" href="#all-products">تصفّح كل المنتجات <span>←</span></a></div><div className="product-grid" id="featured-products" aria-live="polite">{featuredIds.map(id => products.find(product => product.id === id)).filter((product): product is Product => Boolean(product)).map(card)}</div><div className="center-action"><a className="button button-outline" href="#all-products">شوف كل المنتجات <span aria-hidden="true">←</span></a></div></section>
      <section className="collections-section section-pad" id="collections" aria-labelledby="collections-title"><div className="section-heading section-heading-light"><div><p className="kicker">من أول رشفة</p><h2 id="collections-title">كل طريقة، <em>إلها قهوتها.</em></h2></div><p>اختَر التشكيلة اللي بتحبّها، وابدأ من ذوقك.</p></div><div className="collection-grid">{[['01','القهوة التركية','على طريقتك','تركية'],['02','القهوة العربية','للجمعة الحلوة','عربية'],['03','قهوة الفلتر','للحظات الهادية','فلتر'],['04','الإسبريسو','لرشفة مركّزة','إسبريسو']].map(([no,title,note,value]) => <a className="collection-card" href="#all-products" key={value} onClick={() => setCategory(value)}><span className="collection-no">{no}</span><span className="collection-title">{title}</span><span className="collection-arrow">←</span><span className="collection-note">{note}</span></a>)}</div></section>
      <section className="story-section section-pad" id="story" aria-labelledby="story-title"><div className="story-image"><img src="./images/category-0.webp" alt="قهوة من تشكيلة بيت البن البرازيلي" loading="lazy" /><span className="story-seal">حكاية<br />قهوة</span></div><div className="story-copy"><p className="kicker">من أول تحميصة، لآخر رشفة</p><h2 id="story-title">حكاية بلّشت<br /><em>من زمان.</em></h2><p>بدأت الحكاية مع «المطحنة الدولية» في الكويت سنة ١٩٥٥. وفي سنة ١٩٩٥ توسّعت للأردن، وبدأت حكاية بيت البن البرازيلي.</p><a className="text-link" href="https://www.braziliancoffeehouse.com/AboutUs" target="_blank" rel="noreferrer">اقرأ الحكاية من مصدرها <span>↗</span></a></div></section>
      <section className="branch-section section-pad" id="branches" aria-labelledby="branches-title"><div className="branch-intro"><p className="kicker">من عمّان لإربد</p><h2 id="branches-title">قهوتك <em>أقرب.</em></h2><p>مرّ على أقرب فرع، وخلي فنجانك المفضّل معك.</p><a className="button button-gold" href="https://www.braziliancoffeehouse.com/Locations" target="_blank" rel="noreferrer">كل الفروع على الموقع الرسمي <span>↗</span></a></div><div className="branch-list"><div><span className="branch-city">عمّان</span><p>سيتي مول <span>·</span> الصويفية <span>·</span> الجاردنز <span>·</span> مرج الحمام <span>·</span> أفينيو مول</p></div><div><span className="branch-city">محافظات</span><p>الفحيص <span>·</span> المفرق <span>·</span> إربد سيتي سنتر <span>·</span> إربد شارع الملك حسين <span>·</span> إربد شارع البتراء <span>·</span> إربد مجمع الباصات <span>·</span> إربد مول</p></div><a className="branch-contact" href="tel:+96262223330"><span>بدك تتأكد من التفاصيل؟</span><b>احكي معنا <span>06 222 3330</span></b></a></div></section>
      <section className="faq-section section-pad" id="faq" aria-labelledby="faq-title"><div className="section-heading"><div><p className="kicker">قبل ما تختار</p><h2 id="faq-title">أسئلة <em>بتخطر ببالك.</em></h2></div></div><div className="faq-list"><details><summary>شو الفرق بين درجات التحميص؟<span>+</span></summary><p>درجة التحميص بتختلف بين الفاتح والوسط والغامق. اختَر الدرجة المكتوبة على المنتج، وإذا محتار اسأل فريق الفرع عن الخيارات المتوفرة.</p></details><details><summary>وين بلاقي خيارات الهيل؟<span>+</span></summary><p>تصفّح أسماء المنتجات في المتجر؛ المنتج اللي فيه هيل أو بدون هيل مذكور هالشي باسمه.</p></details><details><summary>كيف أحافظ على البن بعد فتح العبوة؟<span>+</span></summary><p>سكّر العبوة بإحكام وخزّنها بمكان جاف وبارد بعيد عن الرطوبة والحرارة والروائح القوية.</p></details><details><summary>كيف أتأكد من السعر والتوفّر؟<span>+</span></summary><p>الأسعار والتوفّر مش معروضين بهالتصوّر. تواصل مع الفرع مباشرة للتأكد من التفاصيل الحالية.</p></details><details><summary>كيف أوصل لأقرب فرع؟<span>+</span></summary><p>شوف قائمة الفروع الرسمية أو اتصل على <a href="tel:+96262223330">06 222 3330</a> للتأكد من موقع الفرع.</p></details></div></section>
      <section className="all-products section-pad" id="all-products" aria-labelledby="all-title"><div className="section-heading"><div><p className="kicker">اختَر اللي بناسبك</p><h2 id="all-title">تشكيلة <em>بيت البن.</em></h2></div><label className="search-field"><span className="visually-hidden">ابحث عن قهوة</span><input id="product-search" type="search" placeholder="دَوّر على قهوتك" value={query} onChange={event => setQuery(event.target.value)} autoComplete="off" /><span aria-hidden="true">⌕</span></label></div><div className="filter-row" id="category-filters" role="group" aria-label="تصفية حسب نوع القهوة">{categories.map(value => <button key={value} type="button" className={`filter-chip${category === value ? ' active' : ''}`} aria-pressed={category === value} onClick={() => setCategory(value)}>{value}</button>)}</div><p className="results-count" id="results-count">{visibleProducts.length} منتج</p><div className="product-grid product-grid-all" id="all-product-grid" aria-live="polite">{visibleProducts.length ? visibleProducts.map(card) : <p className="no-results">ما لقينا نتيجة. جرّب كلمة ثانية.</p>}</div></section>
    </main>
    <footer className="site-footer"><div className="footer-main"><a href="#home"><img src="./images/logo-footer.png" alt="بيت البن البرازيلي" loading="lazy" /></a><p>القهوة الصَّح.<br />على ذوقك.</p><nav aria-label="روابط سريعة"><a href="#shop">المتجر</a><a href="#story">حكايتنا</a><a href="#branches">الفروع</a></nav><a className="footer-phone" href="tel:+96262223330">06 222 3330</a></div><div className="footer-bottom"><span>© بيت البن البرازيلي</span><a href="https://www.braziliancoffeehouse.com/" target="_blank" rel="noreferrer">الموقع الرسمي ↗</a><a className="mirai-credit" href="https://miraisolutions.net/" target="_blank" rel="noreferrer">Developed by Mirai Solutions</a></div><p className="concept-note">تصوّر مستقل من Mirai Solutions لتطوير متجر بيت البن البرازيلي.</p></footer>
    <div className="panel-scrim" hidden={!panelOpen} onClick={() => setPanelOpen(false)}></div>
    <aside className={`selection-panel${panelOpen ? ' open' : ''}`} id="selection-panel" role="dialog" aria-modal="true" aria-labelledby="selection-title" aria-hidden={!panelOpen} inert={!panelOpen}>
      <div className="panel-heading"><div><p className="kicker">اختياراتك</p><h2 id="selection-title">قائمة <em>قهوة.</em></h2></div><button ref={panelClose} className="icon-button panel-close" aria-label="إغلاق القائمة" onClick={() => setPanelOpen(false)}>×</button></div>
      <p className="local-note">هاي قائمة اختيارات محفوظة على جهازك، مش طلب مُرسل.</p><label className="branch-select-label" htmlFor="branch-select">الفرع اللي حاب تستفسر منه</label><select id="branch-select" value={selectedBranch} onChange={event => setSelectedBranch(event.target.value)}><option value="">اختَر فرعًا (اختياري)</option>{branches.map(branch => <option key={branch}>{branch}</option>)}</select>
      <div className="selection-items">{selections.length ? selections.map(item => { const product = products.find(p => p.id === item.id); if (!product) return null; return <div className="selection-row" key={item.id}><img src={imagePath(product)} alt="" /><div><strong>{product.name}</strong><div className="quantity-controls"><button aria-label={`قلل كمية ${product.name}`} onClick={() => changeQuantity(item.id,-1)}>−</button><span>{item.quantity}</span><button aria-label={`زِد كمية ${product.name}`} onClick={() => changeQuantity(item.id,1)}>+</button></div></div><button className="remove-item" aria-label={`احذف ${product.name}`} onClick={() => setSelections(previous => previous.filter(p => p.id !== item.id))}>×</button></div>; }) : <p className="empty-selection">لسّا ما أضفت قهوة لقائمتك.</p>}</div>
      <div className="panel-footer"><a className="button button-dark" href="tel:+96262223330">اتصل للاستفسار <span>↗</span></a><button className="clear-selection" type="button" onClick={() => setSelections([])}>مسح القائمة</button></div>
    </aside>
    <dialog className="product-dialog" ref={dialog} aria-labelledby="dialog-title" onClose={() => { setActiveProduct(null); dialogOpener.current?.focus(); }}><button className="icon-button dialog-close" aria-label="إغلاق التفاصيل" onClick={() => dialog.current?.close()}>×</button>{activeProduct && <div className="dialog-content"><img src={imagePath(activeProduct)} alt={activeProduct.name} /><div className="dialog-copy"><p className="kicker">{activeProduct.category}</p><h2 id="dialog-title">{activeProduct.name}</h2><p>{productDescription(activeProduct)}</p><p className="dialog-facts">{[activeProduct.weight && `الوزن المعلن: ${activeProduct.weight} غرام`, activeProduct.roast && `درجة التحميص: ${activeProduct.roast}`].filter(Boolean).join(' · ') || 'للتفاصيل الحالية، تواصل مع الفرع.'}</p><button className="button button-dark" onClick={() => { addItem(activeProduct.id); dialog.current?.close(); }}>أضف لقائمة الاختيارات</button></div></div>}</dialog>
  </>;
}

createRoot(document.getElementById('root')!).render(<App />);
