import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { ArrowLeft, ArrowUp, ArrowDown, Plus, Trash2, Save, ExternalLink } from 'lucide-react';
import { Alert, ImageUpload, Loading } from './components';
import { api, send, useAsync, useStore, type Settings, type User } from './lib';
import { resolveSiteContent, type SiteContent } from './site-content';

const labels: Record<string, string> = {
  brand: 'العلامة التجارية',
  navigation: 'القائمة والتنقل',
  hero: 'المساحة الافتتاحية',
  ritual: 'خطوات الطلب',
  brewing: 'طرق التحضير',
  featured: 'المتجر',
  product: 'صفحة المنتج',
  story: 'حكاية دار البن',
  journey: 'رحلة البن',
  guide: 'دليل الاختيار',
  faq: 'الأسئلة الشائعة',
  branches: 'الفروع',
  social: 'التواصل الاجتماعي',
  shop: 'صفحة المتجر',
  imageAlt: 'وصف الصور',
  header: 'الهيدر',
  quiz: 'اختبار اختيار القهوة',
  recipes: 'وصفات التحضير',
  branchExperience: 'تجربة الفروع',
  plainProduct: 'البن السادة',
  name: 'الاسم',
  tagline: 'الشعار',
  headerNote: 'جملة الهيدر',
  footerText: 'نص الفوتر',
  home: 'الرئيسية',
  about: 'الحكاية',
  searchPlaceholder: 'تلميح البحث',
  cart: 'السلة',
  eyebrow: 'العنوان الصغير',
  title: 'العنوان',
  subtitle: 'الوصف المختصر',
  description: 'الوصف',
  intro: 'المقدمة',
  text: 'النص',
  primaryCta: 'نص الزر الرئيسي',
  primaryHref: 'وجهة الزر الرئيسي',
  secondaryCta: 'نص الزر الثاني',
  secondaryHref: 'وجهة الزر الثاني',
  detail: 'الجملة الختامية',
  lead: 'بداية الجملة',
  emphasis: 'الكلمة المميزة',
  cta: 'نص الزر',
  items: 'الكروت',
  guideText: 'شرح الطريقة',
  allCta: 'زر عرض الكل',
  emptyTitle: 'عنوان الحالة الفارغة',
  emptyText: 'شرح الحالة الفارغة',
  shortDescription: 'وصف قصير',
  demoNotice: 'ملاحظة الاعتماد',
  weightLabel: 'عنوان الوزن',
  grindLabel: 'عنوان الطحنة',
  selectCta: 'زر الاختيار',
  addCta: 'زر الإضافة',
  careTitle: 'عنوان حفظ البن',
  careText: 'إرشادات حفظ البن',
  shortText: 'النص المختصر',
  longParagraphs: 'فقرات الحكاية',
  bannerTitle: 'عنوان الشريط',
  bannerText: 'نص الشريط',
  brewStep: 'عنوان خطوة التحضير',
  brewHelp: 'شرح خطوة التحضير',
  roastStep: 'عنوان خطوة التحميص',
  roastHelp: 'شرح خطوة التحميص',
  resetCta: 'زر البدء من جديد',
  tipsTitle: 'عنوان النصائح',
  tips: 'النصائح',
  question: 'السؤال',
  answer: 'الإجابة',
  mapCta: 'زر الخريطة',
  mainLabel: 'اسم الفرع الرئيسي',
  address: 'العنوان',
  main: 'فرع رئيسي',
  facebookLabel: 'زر فيسبوك',
  instagramLabel: 'زر إنستجرام',
  harvest: 'القطف',
  roasting: 'التحميص',
  note: 'الملاحظة',
  quizCta: 'زر اختبار القهوة',
  startCta: 'زر البداية',
  nextCta: 'زر التالي',
  backCta: 'زر السابق',
  resultCta: 'زر النتيجة',
  restartCta: 'زر إعادة الاختبار',
  progressLabel: 'نص التقدم',
  questions: 'الأسئلة',
  help: 'شرح السؤال',
  options: 'الاختيارات',
  label: 'اسم الاختيار',
  result: 'النتيجة',
  results: 'النتائج',
  matchTitle: 'عنوان الترشيح',
  matchText: 'شرح الترشيح',
  noMatchTitle: 'عنوان عدم وجود ترشيح',
  noMatchText: 'شرح عدم وجود ترشيح',
  openCta: 'زر فتح الخطوات',
  closeCta: 'زر إغلاق الخطوات',
  ingredientsLabel: 'عنوان المقادير',
  stepsLabel: 'عنوان الخطوات',
  tipLabel: 'عنوان النصيحة',
  brew: 'طريقة التحضير',
  yield: 'الكمية الناتجة',
  grind: 'الطحنة',
  ingredients: 'المقادير',
  steps: 'خطوات التحضير',
  tip: 'النصيحة',
  imageCaption: 'تعليق الصورة',
  generatedImageCaption: 'تعليق الصورة التوضيحية',
  unavailableCta: 'زر عدم الإتاحة',
  storeTitle: 'عنوان المتجر',
  storeDescription: 'وصف المتجر',
  storeCta: 'زر تصفّح المنتجات',
  quizTitle: 'عنوان اختيار القهوة',
  quizDescription: 'وصف اختيار القهوة',
  learnTitle: 'عنوان التحضير',
  learnDescription: 'وصف التحضير',
  learnCta: 'زر دليل التحضير',
  storyImage: 'صورة الحكاية',
  quizImage: 'صورة اختيار القهوة',
  recipesImage: 'صورة كروت التحضير',
  journeyImage: 'صورة رحلة البن',
  brewingImage: 'صورة طرق التحضير',
  accent: 'لون البراند والأزرار',
  background: 'لون خلفية الموقع',
  logo: 'شعار الموقع',
  facebook: 'رابط فيسبوك',
  instagram: 'رابط إنستجرام',
  whatsapp: 'رابط واتساب',
  href: 'وجهة الرابط',
  resultTitle: 'عنوان النتيجة',
  resultHelp: 'شرح النتيجة',
  summaryLabel: 'عنوان ملخص الاختيارات',
  chooseCta: 'زر اختيار المنتج',
  shopCta: 'زر المتجر',
  emptyHelp: 'مساعدة الحالة الفارغة',
  weightAdvice: 'نصيحة الوزن',
  grindsAdvice: 'نصيحة الطحن',
  alternativeCtaTemplate: 'نص زر الاختيار البديل',
  alternativeExplanation: 'شرح الاختيار البديل',
  alternativeLabel: 'عنوان الاختيار البديل',
  dailyWeightExplanation: 'شرح وزن الاستخدام اليومي',
  editCta: 'زر تعديل الاختيارات',
  empty: 'الحالة الفارغة',
  guideCta: 'زر الدليل',
  matchedExplanation: 'شرح تطابق الترشيح',
  multipleTitle: 'عنوان الترشيحات المتعددة',
  openKindExplanation: 'شرح الاختيار المفتوح',
  shareWeightExplanation: 'شرح وزن المشاركة',
  tryWeightExplanation: 'شرح وزن التجربة',
};
const technicalKeys = new Set(['id', 'slug', 'value']);
type TreePath = (string | number)[];
function changeTree<T>(source: T, path: TreePath, value: unknown): T {
  const next = structuredClone(source);
  let node = next as unknown as Record<string | number, unknown>;
  for (const key of path.slice(0, -1)) node = node[key] as Record<string | number, unknown>;
  node[path[path.length - 1]] = value;
  return next;
}
function caption(key: string) {
  return /^\d+$/.test(key) ? `النص ${Number(key) + 1}` : labels[key] || key;
}
function TextTree({
  value,
  path,
  update,
}: {
  value: unknown;
  path: TreePath;
  update: (path: TreePath, value: unknown) => void;
}): ReactNode {
  const key = String(path[path.length - 1]);
  if (technicalKeys.has(key)) return null;
  if (
    path[0] === 'siteCopy' &&
    ((path[1] === 'story' && ['title', 'shortText'].includes(key)) ||
      (path[1] === 'brand' && key === 'headerNote'))
  )
    return null;
  if (path[0] === 'siteCopy' && path[1] === 'brewing' && path[2] === 'items' && key === 'name')
    return (
      <p className="tiny muted">طريقة التحضير: {String(value)} — الاسم مرتبط بفلترة المنتجات.</p>
    );
  if (typeof value === 'string') {
    if (/image$|^image$/i.test(key))
      return (
        <div className="field">
          <span>{caption(key)}</span>
          <ImageUpload value={value} onChange={(url) => update(path, url)} />
        </div>
      );
    const link = /href|url$/i.test(key);
    return (
      <label className="field">
        {caption(key)}
        {link ? (
          <input
            dir="ltr"
            value={value}
            maxLength={500}
            onChange={(e) => update(path, e.target.value)}
            placeholder="/shop أو https://..."
          />
        ) : (
          <textarea
            rows={value.length > 120 ? 4 : 2}
            value={value}
            maxLength={8000}
            onChange={(e) => update(path, e.target.value)}
          />
        )}
      </label>
    );
  }
  if (typeof value === 'boolean')
    return (
      <label className="check-label">
        <input type="checkbox" checked={value} onChange={(e) => update(path, e.target.checked)} />
        {caption(key)}
      </label>
    );
  if (typeof value === 'number')
    return (
      <label className="field">
        {caption(key)}
        <input type="number" value={value} onChange={(e) => update(path, Number(e.target.value))} />
      </label>
    );
  if (Array.isArray(value))
    return (
      <fieldset>
        <legend>{caption(key)}</legend>
        {path.join('.') === 'siteCopy.faq.items' && (
          <button
            type="button"
            className="btn secondary small"
            disabled={value.length >= 30}
            onClick={() => update(path, [...value, { question: '', answer: '' }])}
          >
            <Plus size={15} />
            إضافة سؤال
          </button>
        )}
        {value.map((item, index) => (
          <div className="panel" key={index}>
            <h3>{`${caption(key)} ${index + 1}`}</h3>
            <TextTree value={item} path={[...path, index]} update={update} />
            {path.join('.') === 'siteCopy.faq.items' && (
              <button
                type="button"
                className="btn secondary small"
                aria-label={`حذف السؤال ${index + 1}`}
                onClick={() => {
                  if (window.confirm('حذف السؤال؟ التغيير يُطبق بعد الحفظ.'))
                    update(
                      path,
                      value.filter((_, itemIndex) => itemIndex !== index),
                    );
                }}
              >
                <Trash2 size={15} />
                حذف السؤال
              </button>
            )}
          </div>
        ))}
      </fieldset>
    );
  if (value && typeof value === 'object')
    return (
      <>
        {Object.entries(value).map(([child, item]) => (
          <TextTree key={child} value={item} path={[...path, child]} update={update} />
        ))}
      </>
    );
  return null;
}
const tabs = [
  ['home', 'الرئيسية'],
  ['copy', 'نصوص الموقع'],
  ['experience', 'التجربة والدليل'],
  ['drinks', 'منيو المشروبات'],
  ['identity', 'الهوية والتواصل'],
] as const;
export function SiteAdmin() {
  const { user } = useOutletContext<{ user: User }>();
  const { data, error, loading } = useAsync(() => api<Settings>('/admin/settings'));
  const [settings, setSettings] = useState<Settings | null>(null);
  const [cms, setCms] = useState<SiteContent | null>(null);
  const [tab, setTab] = useState<string>('home');
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [message, setMessage] = useState('');
  const { refresh } = useStore();
  useEffect(() => {
    if (data) {
      setSettings(data);
      setCms(resolveSiteContent(data));
    }
  }, [data]);
  if (user.role !== 'owner') return <Alert>التحكم في محتوى الموقع متاح للمالك فقط.</Alert>;
  if (loading || !settings || !cms) return error ? <Alert>{error}</Alert> : <Loading />;
  const content = cms;
  function update(path: TreePath, value: unknown) {
    setCms((previous) => (previous ? changeTree(previous, path, value) : previous));
    setMessage('');
  }
  function moveDrink(index: number, direction: number) {
    const next = [...content.drinks];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    update(['drinks'], next);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setSaveError('');
    setMessage('');
    if (content.siteCopy.faq.items.some((item) => !item.question.trim() || !item.answer.trim())) {
      setSaveError('اكتب السؤال والإجابة لكل كارت في الأسئلة الشائعة، أو احذف الكارت الفارغ.');
      setTab('copy');
      return;
    }
    if (new Set(content.drinks.map((drink) => drink.id)).size !== content.drinks.length) {
      setSaveError('معرّفات المشروبات متكررة. احذف الكارت المكرر وأضف مشروبًا جديدًا.');
      return;
    }
    if (
      content.drinks.some(
        (drink) =>
          !drink.name.trim() ||
          !drink.description.trim() ||
          !drink.image ||
          (drink.price !== null && (!Number.isInteger(drink.price) || drink.price < 0)),
      )
    ) {
      setSaveError('راجع اسم ووصف وصورة كل مشروب، والسعر إن كان مضافًا.');
      setTab('drinks');
      return;
    }
    setBusy(true);
    try {
      // Re-read before saving to preserve operational settings changed from another admin page.
      const latest = await api<Settings>('/admin/settings');
      const saved = await send<Settings>('/admin/settings', 'PUT', {
        ...latest,
        cms: content,
        brand:
          content.siteCopy.brand.name !== settings?.brand
            ? content.siteCopy.brand.name
            : latest.brand,
        heroTitle:
          content.siteCopy.hero.title !== settings?.heroTitle
            ? content.siteCopy.hero.title
            : latest.heroTitle,
        heroSubtitle:
          content.siteCopy.hero.subtitle !== settings?.heroSubtitle
            ? content.siteCopy.hero.subtitle
            : latest.heroSubtitle,
      });
      setSettings(saved);
      setCms(resolveSiteContent(saved));
      await refresh();
      setMessage('تم حفظ المحتوى وتحديث الموقع.');
    } catch (failure) {
      setSaveError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">إدارة دار البن</span>
          <h1>التحكم في الموقع</h1>
          <p>النصوص، الصور، المشروبات والهوية، من مكان واحد.</p>
        </div>
        <Link to="/" className="btn secondary small">
          افتح الموقع <ExternalLink size={16} />
        </Link>
      </div>
      <Alert>{error}</Alert>
      <form onSubmit={save}>
        <div className="admin-tabs">
          {tabs.map(([key, label]) => (
            <button
              type="button"
              key={key}
              className={tab === key ? 'selected' : ''}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === 'home' && (
          <>
            <section className="panel">
              <h2>العناوين والأزرار الرئيسية</h2>
              <TextTree value={content.home} path={['home']} update={update} />
            </section>
            <section className="panel">
              <h2>خطوات الطلب تحت الافتتاحية</h2>
              {content.ritual.map((item, index) => (
                <fieldset key={index}>
                  <legend>الخطوة {index + 1}</legend>
                  <TextTree value={item} path={['ritual', index]} update={update} />
                </fieldset>
              ))}
            </section>
            <section className="panel">
              <h2>الصورة الافتتاحية والفروع وترتيب الأقسام</h2>
              <p className="muted">
                العنوان الافتتاحي وصورته والفروع وترتيب الأقسام متاحة في «محتوى الرئيسية». بيانات
                التشغيل والأسعار متاحة في أقسامها.
              </p>
              <Link className="text-link" to="/admin/content">
                محتوى الرئيسية <ArrowLeft size={15} />
              </Link>
            </section>
          </>
        )}
        {tab === 'experience' && (
          <section className="panel">
            <p className="tiny muted">
              أسماء وصور مشروبات الفروع تُدار من تبويب «منيو المشروبات»، والبن السادة من{' '}
              <Link className="text-link" to="/admin/products">
                المنتجات
              </Link>
              .
            </p>
          </section>
        )}
        {(tab === 'copy' || tab === 'experience') &&
          Object.entries(tab === 'copy' ? content.siteCopy : content.experience)
            .filter(([group]) =>
              tab === 'copy'
                ? !['ritual', 'featured'].includes(group)
                : !['branchExperience', 'plainProduct'].includes(group),
            )
            .map(([group, value]) => (
              <details className="panel" key={group}>
                <summary>
                  <strong>{caption(group)}</strong>
                </summary>
                <div style={{ marginTop: 20 }}>
                  {tab === 'copy' && group === 'story' && (
                    <p className="tiny muted">
                      عنوان ونص الحكاية في الرئيسية يُعدّلان من{' '}
                      <Link className="text-link" to="/admin/content">
                        محتوى الرئيسية
                      </Link>
                      . هنا فقرات صفحة الحكاية والنصوص الإضافية.
                    </p>
                  )}
                  {tab === 'copy' && group === 'product' && (
                    <p className="tiny muted">
                      أسماء المنتجات وأوصافها وأسعارها تُدار من{' '}
                      <Link className="text-link" to="/admin/products">
                        المنتجات
                      </Link>
                      . هنا نصوص الأزرار وإرشادات حفظ البن.
                    </p>
                  )}
                  {tab === 'copy' && group === 'branches' && (
                    <p className="tiny muted">
                      أسماء وعناوين الفروع وحالة الاستلام تُدار من{' '}
                      <Link className="text-link" to="/admin/content">
                        محتوى الرئيسية
                      </Link>
                      .
                    </p>
                  )}
                  <TextTree
                    value={
                      tab === 'copy' && group === 'product'
                        ? Object.fromEntries(
                            Object.entries(value as Record<string, unknown>).filter(([key]) =>
                              [
                                'weightLabel',
                                'grindLabel',
                                'selectCta',
                                'addCta',
                                'careTitle',
                                'careText',
                              ].includes(key),
                            ),
                          )
                        : tab === 'copy' && group === 'branches'
                          ? Object.fromEntries(
                              Object.entries(value as Record<string, unknown>).filter(
                                ([key]) => key !== 'items',
                              ),
                            )
                          : value
                    }
                    path={[tab === 'copy' ? 'siteCopy' : 'experience', group]}
                    update={update}
                  />
                </div>
              </details>
            ))}
        {tab === 'drinks' && (
          <>
            <section className="panel">
              <div className="panel-heading">
                <h2>منيو المشروبات</h2>
                <button
                  type="button"
                  className="btn secondary small"
                  onClick={() =>
                    update(
                      ['drinks'],
                      [
                        ...content.drinks,
                        {
                          id: `drink-${crypto.randomUUID()}`,
                          name: '',
                          category: 'hot',
                          description: '',
                          image: '/images/coffee-duo-hero.webp',
                          price: null,
                          active: false,
                        },
                      ],
                    )
                  }
                >
                  <Plus size={16} />
                  إضافة مشروب
                </button>
              </div>
              <p className="tiny muted">
                المشروبات تعرض في المنيو وترتيبها حسب الكروت هنا. سعر فارغ يعرض المنيو من غير سعر؛
                السعر بالجنيه المصري.
              </p>
            </section>
            {content.drinks.map((drink, index) => (
              <section className="panel" key={drink.id}>
                <div className="panel-heading">
                  <h2>{drink.name || `مشروب جديد ${index + 1}`}</h2>
                  <div className="row gap">
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`رفع ${drink.name || 'المشروب'}`}
                      disabled={index === 0}
                      onClick={() => moveDrink(index, -1)}
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`خفض ${drink.name || 'المشروب'}`}
                      disabled={index === content.drinks.length - 1}
                      onClick={() => moveDrink(index, 1)}
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-button danger-text"
                      aria-label={`حذف ${drink.name || 'المشروب'}`}
                      onClick={() => {
                        if (
                          window.confirm(
                            `حذف ${drink.name || 'المشروب'} من القائمة؟ التغيير يُطبق بعد الحفظ.`,
                          )
                        )
                          update(
                            ['drinks'],
                            content.drinks.filter((_, itemIndex) => itemIndex !== index),
                          );
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="admin-two-col">
                  <div>
                    <label className="field">
                      اسم المشروب
                      <input
                        value={drink.name}
                        maxLength={200}
                        required
                        onChange={(e) => update(['drinks', index, 'name'], e.target.value)}
                      />
                    </label>
                    <label className="field">
                      القسم
                      <select
                        value={drink.category}
                        onChange={(e) => update(['drinks', index, 'category'], e.target.value)}
                      >
                        <option value="hot">مشروبات ساخنة</option>
                        <option value="cold">مشروبات باردة</option>
                      </select>
                    </label>
                    <label className="field">
                      الوصف
                      <textarea
                        value={drink.description}
                        rows={3}
                        required
                        maxLength={2000}
                        onChange={(e) => update(['drinks', index, 'description'], e.target.value)}
                      />
                    </label>
                    <label className="field">
                      السعر (ج.م) — اختياري
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={drink.price === null ? '' : drink.price / 100}
                        onChange={(e) =>
                          update(
                            ['drinks', index, 'price'],
                            e.target.value === '' ? null : Math.round(Number(e.target.value) * 100),
                          )
                        }
                      />
                    </label>
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={drink.active}
                        onChange={(e) => update(['drinks', index, 'active'], e.target.checked)}
                      />
                      إظهار المشروب في المنيو
                    </label>
                  </div>
                  <div>
                    <ImageUpload
                      value={drink.image}
                      onChange={(url) => update(['drinks', index, 'image'], url)}
                    />
                  </div>
                </div>
              </section>
            ))}
          </>
        )}
        {tab === 'identity' && (
          <>
            <section className="panel">
              <h2>ألوان وشعار الموقع</h2>
              <div className="form-grid">
                {(['accent', 'background', 'text'] as const).map((key) => (
                  <label className="field" key={key}>
                    {key === 'text' ? 'لون النصوص' : caption(key)}
                    <input
                      type="color"
                      value={content.appearance[key]}
                      onChange={(e) => update(['appearance', key], e.target.value)}
                    />
                    <small dir="ltr">{content.appearance[key]}</small>
                  </label>
                ))}
              </div>
              <label className="field">الشعار</label>
              <ImageUpload
                value={content.appearance.logo}
                onChange={(url) => update(['appearance', 'logo'], url)}
              />
              <p className="tiny muted">
                اختار نصًا غامقًا مع خلفية فاتحة، وحافظ على وضوح الأزرار. راجع الموقع على الكمبيوتر
                والموبايل بعد تغيير الألوان.
              </p>
            </section>
            <section className="panel">
              <h2>روابط التواصل</h2>
              {(['facebook', 'instagram', 'whatsapp'] as const).map((key) => (
                <label className="field" key={key}>
                  {caption(key)}
                  <input
                    type="url"
                    dir="ltr"
                    value={content.social[key]}
                    maxLength={500}
                    placeholder="https://..."
                    onChange={(e) => update(['social', key], e.target.value)}
                  />
                  <small>اترك الرابط فارغًا لإخفاء الزر.</small>
                </label>
              ))}
            </section>
          </>
        )}
        <Alert>{saveError}</Alert>
        <Alert kind="success">{message}</Alert>
        <div className="save-bar">
          <button className="btn" disabled={busy}>
            <Save size={17} />
            {busy ? 'جاري الحفظ…' : 'حفظ محتوى الموقع'}
          </button>
        </div>
      </form>
    </>
  );
}
