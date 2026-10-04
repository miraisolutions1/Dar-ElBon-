import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Settings as SettingsIcon,
  Users,
  FileText,
  LogOut,
  ArrowUpLeft,
  Plus,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Pencil,
  Search,
  Trash2,
  Check,
  AlertCircle,
  ShieldCheck,
  Menu,
  X,
  Lock,
  ExternalLink,
  Save,
  Activity,
} from 'lucide-react';
import { Brand, Alert, Empty, Loading, Status, ImageUpload } from './components';
import {
  api,
  send,
  useAsync,
  useStore,
  money,
  date,
  statusLabels,
  statusSteps,
  type User,
  type Product,
  type Order,
  type Settings,
} from './lib';

function AdminHeading({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <div className="admin-heading">
      <div>
        <span className="eyebrow">إدارة دار البن</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
export function Login() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const location = useLocation();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(e.currentTarget);
    try {
      await send('/auth/login', 'POST', {
        username: f.get('username'),
        password: f.get('password'),
      });
      const next = location.state?.from;
      nav(typeof next === 'string' && next.startsWith('/admin') ? next : '/admin', {
        replace: true,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <div className="login-art">
        <img src="/images/coffee-hero.png" alt="عبوة دار البن" />
        <div>
          <Brand />
          <h2>
            ورا كل فنجان،
            <br />
            تفاصيل تستاهل.
          </h2>
        </div>
      </div>
      <div className="login-side">
        <Link to="/" className="text-link back-to-store">
          المتجر <ArrowUpLeft size={16} />
        </Link>
        <form className="login-form" onSubmit={submit}>
          <span className="login-lock">
            <Lock size={23} />
          </span>
          <span className="eyebrow">أهلًا برجوعك</span>
          <h1>إدارة دار البن</h1>
          <p>سجّل دخولك لمتابعة متجرك وطلباتك.</p>
          <Alert>{error}</Alert>
          <label className="field">
            اسم الدخول
            <input
              name="username"
              autoComplete="username"
              dir="ltr"
              required
              maxLength={40}
              autoFocus
            />
          </label>
          <label className="field">
            كلمة المرور
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              dir="ltr"
              required
              maxLength={128}
            />
          </label>
          <button className="btn full" disabled={busy}>
            {busy ? 'جاري الدخول…' : 'دخول لوحة الإدارة'}
            <ArrowLeft size={17} />
          </button>
          <p className="tiny muted">
            الدخول مخصص لفريق دار البن. تواصل مع مالك المتجر إذا فقدت بيانات حسابك.
          </p>
        </form>
      </div>
    </main>
  );
}

export function AdminShell() {
  const { data: user, error, loading } = useAsync(() => api<User>('/auth/me'));
  const [menu, setMenu] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  const { settings } = useStore();
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  if (loading) return <Loading />;
  if (error || !user) return <Navigate to="/admin/login" state={{ from: loc.pathname }} replace />;
  const links = [
    { path: '/admin', name: 'نظرة عامة', icon: LayoutDashboard },
    { path: '/admin/orders', name: 'الطلبات', icon: ShoppingBag },
    { path: '/admin/products', name: 'المنتجات', icon: Package },
    ...(user.role === 'owner'
      ? [
          { path: '/admin/content', name: 'محتوى الرئيسية', icon: FileText },
          { path: '/admin/settings', name: 'إعدادات المتجر', icon: SettingsIcon },
          { path: '/admin/users', name: 'الفريق والصلاحيات', icon: Users },
          { path: '/admin/audit', name: 'سجل النشاط', icon: Activity },
        ]
      : []),
    { path: '/admin/account', name: 'حسابي', icon: ShieldCheck },
  ];
  return (
    <div className="admin-app">
      <aside className={`admin-sidebar ${menu ? 'open' : ''}`}>
        <Link to="/" className="sidebar-brand">
          <Brand compact />
        </Link>
        <span className="sidebar-caption">مساحة الإدارة</span>
        <nav aria-label="أقسام لوحة الإدارة">
          {links.map(({ path, name, icon: Icon }) => (
            <NavLink to={path} end={path === '/admin'} key={path}>
              <Icon size={19} strokeWidth={1.6} />
              {name}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link to="/">
            زيارة المتجر <ExternalLink size={16} />
          </Link>
          <button
            onClick={async () => {
              try {
                await send('/auth/logout', 'POST');
              } finally {
                nav('/admin/login');
              }
            }}
          >
            <LogOut size={17} />
            تسجيل الخروج
          </button>
        </div>
      </aside>
      {menu && (
        <button className="admin-scrim" aria-label="إغلاق القائمة" onClick={() => setMenu(false)} />
      )}
      <div className="admin-body">
        <header className="admin-topbar">
          <div className="row gap">
            <button
              className="icon-button admin-menu"
              aria-label="قائمة الإدارة"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
            <span className="admin-mode">
              <i />
              {settings.mode === 'preview' ? 'المتجر في وضع المعاينة' : 'المتجر يستقبل الطلبات'}
            </span>
          </div>
          <div className="admin-user">
            <span className="avatar">{user.name.charAt(0)}</span>
            <div>
              <strong>{user.name}</strong>
              <small>{user.role === 'owner' ? 'مالك المتجر' : 'مدير العمليات'}</small>
            </div>
          </div>
        </header>
        <div className="admin-main">
          <Outlet context={{ user }} />
        </div>
      </div>
    </div>
  );
}

type DashboardData = {
  stats: { orders: number; pending: number; revenue: number; products: number; demoOrders: number };
  recentOrders: Order[];
  lowStock: Product[];
  checks: { label: string; ok: boolean }[];
  mode: string;
};
export function Dashboard() {
  const { data, error, loading } = useAsync(() => api<DashboardData>('/admin/dashboard'));
  if (loading) return <Loading />;
  if (error) return <Alert>{error}</Alert>;
  if (!data) return null;
  const metrics = [
    {
      label: 'طلبات جديدة',
      value: data.stats.pending,
      icon: ShoppingBag,
      detail: 'بانتظار مراجعتك',
    },
    {
      label: 'مبيعات مكتملة',
      value: money(data.stats.revenue),
      icon: Activity,
      detail: 'طلبات فعلية، مسلّمة ومدفوعة',
    },
    {
      label: 'منتجات نشطة',
      value: data.stats.products,
      icon: Package,
      detail: 'متاحة في كتالوج المتجر',
    },
    {
      label: 'إجمالي الطلبات',
      value: data.stats.orders,
      icon: FileText,
      detail: `منها ${data.stats.demoOrders} طلبات تجريبية`,
    },
  ];
  return (
    <>
      <AdminHeading title="صباح القهوة ☕" subtitle="كل تفاصيل متجرك، في مكان واحد.">
        <Link className="btn small" to="/admin/products/new">
          <Plus size={17} />
          إضافة منتج
        </Link>
      </AdminHeading>
      <div className="metrics">
        {metrics.map(({ label, value, icon: Icon, detail }) => (
          <div className="metric" key={label}>
            <div className="row between">
              <span>{label}</span>
              <Icon size={20} />
            </div>
            <strong>{value}</strong>
            <small>{detail}</small>
          </div>
        ))}
      </div>
      <div className="admin-two-col">
        <section className="panel">
          <div className="panel-heading">
            <h2>أحدث الطلبات</h2>
            <Link className="text-link" to="/admin/orders">
              كل الطلبات <ArrowLeft size={15} />
            </Link>
          </div>
          {data.recentOrders.length ? (
            <OrderTable orders={data.recentOrders} />
          ) : (
            <Empty
              title="أول طلب لسه في الطريق"
              description="طلبات المتجر هتظهر هنا بمجرد تسجيلها."
            />
          )}
        </section>
        <aside className="panel">
          <div className="panel-heading">
            <h2>{data.mode === 'preview' ? 'تجهيز الافتتاح' : 'حالة المتجر'}</h2>
            <ShieldCheck size={20} />
          </div>
          <p className="muted tiny">البيانات التجريبية لا تُحتسب كمبيعات فعلية.</p>
          <div className="checklist">
            {data.checks.map((c) => (
              <div key={c.label}>
                {c.ok ? <Check className="success-text" size={18} /> : <AlertCircle size={18} />}
                <span>{c.label}</span>
              </div>
            ))}
          </div>
          <Link className="btn secondary small full" to="/admin/settings">
            إعدادات المتجر <ArrowLeft size={15} />
          </Link>
        </aside>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>منتجات تحتاج متابعة المخزون</h2>
          <Package size={20} />
        </div>
        {data.lowStock.length ? (
          <div className="stock-alerts">
            {data.lowStock.map((p) => (
              <Link to={`/admin/products/${p.id}`} key={p.id}>
                <img src={p.image} alt="" />
                <span>
                  {p.name}
                  <small>
                    {p.stockMode === 'grams'
                      ? `${p.stockGrams} جرام متاح`
                      : p.variants.map((v) => `${v.weight} جم: ${v.stock} عبوة`).join(' · ')}
                  </small>
                </span>
                <Pencil size={16} />
              </Link>
            ))}
          </div>
        ) : (
          <p className="muted">لا توجد منتجات وصلت إلى حد التنبيه حاليًا.</p>
        )}
      </section>
    </>
  );
}

function OrderTable({ orders }: { orders: Order[] }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>الطلب</th>
            <th>العميل</th>
            <th>مكان الاستلام</th>
            <th>القيمة</th>
            <th>الحالة</th>
            <th>التاريخ</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>
                <Link className="table-link" to={`/admin/orders/${o.id}`} dir="ltr">
                  {o.reference}
                </Link>
                {o.demo && <span className="demo-badge">تجريبي</span>}
              </td>
              <td>{o.customer.name}</td>
              <td>
                {o.fulfillment === 'pickup' ? (
                  <>
                    استلام من الفرع
                    <small>{o.pickupBranch?.name || 'راجع تفاصيل الطلب'}</small>
                  </>
                ) : (
                  <>
                    توصيل للعنوان
                    <small>{[o.zone, o.customer.city].filter(Boolean).join(' — ')}</small>
                  </>
                )}
              </td>
              <td>{money(o.total)}</td>
              <td>
                <Status value={o.status} />
              </td>
              <td className="tiny muted">{date(o.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Orders() {
  const [params, setParams] = useSearchParams();
  const query = params.toString();
  const { data, error, loading } = useAsync(
    () => api<{ orders: Order[]; total: number; page: number }>(`/admin/orders?${query}`),
    [query],
  );
  function update(k: string, v: string) {
    const next = new URLSearchParams(params);
    v ? next.set(k, v) : next.delete(k);
    if (k !== 'page') next.delete('page');
    setParams(next, { replace: true });
  }
  return (
    <>
      <AdminHeading title="الطلبات" subtitle="تابع كل طلب، من التسجيل لحد التسليم." />
      <div className="admin-filter">
        <div className="search-input">
          <Search size={18} />
          <input
            placeholder="رقم الطلب، اسم العميل أو الموبايل"
            aria-label="البحث في الطلبات"
            value={params.get('q') || ''}
            onChange={(e) => update('q', e.target.value)}
          />
        </div>
        <select
          aria-label="فلترة حالة الطلب"
          value={params.get('status') || ''}
          onChange={(e) => update('status', e.target.value)}
        >
          <option value="">كل الحالات</option>
          {Object.keys(statusSteps).map((s) => (
            <option value={s} key={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>
      </div>
      <Alert>{error}</Alert>
      <section className="panel no-padding">
        {loading ? (
          <Loading />
        ) : data?.orders.length ? (
          <OrderTable orders={data.orders} />
        ) : (
          <Empty title="لا توجد طلبات" description="جرّب تغيير الفلتر أو ابحث باسم مختلف." />
        )}
      </section>
      {data && data.total > 25 && (
        <div className="row between">
          <button
            className="btn secondary small"
            disabled={data.page === 1}
            onClick={() => update('page', String(data.page - 1))}
          >
            السابق
          </button>
          <span>
            {data.page} / {Math.ceil(data.total / 25)}
          </span>
          <button
            className="btn secondary small"
            disabled={data.page * 25 >= data.total}
            onClick={() => update('page', String(data.page + 1))}
          >
            التالي
          </button>
        </div>
      )}
    </>
  );
}
export function OrderDetail() {
  const { id } = useParams();
  const {
    data: order,
    error,
    loading,
    reload,
  } = useAsync(() => api<Order>(`/admin/orders/${id}`), [id]);
  const [status, setStatus] = useState('');
  const [payment, setPayment] = useState('');
  const [note, setNote] = useState('');
  const [tracking, setTracking] = useState('');
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [busy, setBusy] = useState(false);
  const { refresh } = useStore();
  useEffect(() => {
    if (order) {
      setStatus(order.status);
      setPayment(order.paymentStatus);
      setNote(order.note || '');
      setTracking(order.tracking || '');
    }
  }, [order]);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaveError('');
    setMessage('');
    try {
      await send(`/admin/orders/${id}`, 'PATCH', {
        status,
        paymentStatus: payment,
        note,
        tracking,
      });
      setMessage('تم تحديث الطلب.');
      reload();
      void refresh().catch(() => {});
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading && !order) return <Loading />;
  if (error) return <Alert>{error}</Alert>;
  if (!order) return null;
  const pickup = order.fulfillment === 'pickup';
  return (
    <>
      <AdminHeading title={`طلب ${order.reference}`} subtitle={date(order.createdAt)}>
        <Link className="btn secondary small" to="/admin/orders">
          كل الطلبات <ArrowLeft size={16} />
        </Link>
      </AdminHeading>
      {order.demo && <Alert kind="info">طلب تجريبي — لا يُشحن ولا يُحتسب كمبيعات فعلية.</Alert>}
      <section className="panel">
        <h2>
          {pickup
            ? `الاستلام من فرع ${order.pickupBranch?.name || 'دار البن'}`
            : 'توصيل الطلب للعنوان'}
        </h2>
        <p>
          {pickup
            ? order.pickupBranch?.address || 'عنوان الفرع غير مسجل في هذا الطلب.'
            : [order.customer.address, order.customer.city, order.zone].filter(Boolean).join(' — ')}
        </p>
        <p className="tiny muted">
          {pickup
            ? 'الفرع والعنوان محفوظان كما كانا وقت إنشاء الطلب.'
            : 'راجع عنوان العميل قبل تجهيز الشحنة.'}
        </p>
      </section>
      <div className="admin-two-col">
        <section className="panel">
          <h2>محتويات الطلب</h2>
          {order.items.map((i, index) => (
            <div className="order-item" key={index}>
              <img src={i.image} alt="" />
              <div>
                <h3>{i.name}</h3>
                <p>
                  {i.weight} جم · {i.grind} · عدد {i.quantity}
                </p>
                {i.type === 'blend' && (
                  <small>{i.components.map((c) => `${c.name}: ${c.grams} جم`).join(' · ')}</small>
                )}
              </div>
              <strong>{money(i.total)}</strong>
            </div>
          ))}
          <div className="totals">
            <div>
              <span>المنتجات</span>
              <strong>{money(order.subtotal)}</strong>
            </div>
            {!pickup && (
              <div>
                <span>الشحن</span>
                <strong>{money(order.shipping)}</strong>
              </div>
            )}
            <div>
              <span>الإجمالي</span>
              <strong>{money(order.total)}</strong>
            </div>
          </div>
        </section>
        <section className="panel">
          <h2>بيانات العميل</h2>
          <dl className="customer-details">
            <dt>الاسم</dt>
            <dd>{order.customer.name}</dd>
            <dt>الموبايل</dt>
            <dd>
              <a dir="ltr" href={`tel:${order.customer.phone}`}>
                {order.customer.phone}
              </a>
            </dd>
            {!pickup && (
              <>
                <dt>المنطقة</dt>
                <dd>{[order.zone, order.customer.city].filter(Boolean).join(' — ')}</dd>
                <dt>عنوان التوصيل</dt>
                <dd>{order.customer.address}</dd>
              </>
            )}
            <dt>ملاحظات العميل</dt>
            <dd>{order.customer.notes || '—'}</dd>
            <dt>الدفع</dt>
            <dd>
              {pickup ? 'الدفع عند الاستلام من الفرع' : 'الدفع عند استلام التوصيل'} ·{' '}
              <Status value={order.paymentStatus} />
            </dd>
          </dl>
          <Link className="text-link" to={`/order/${order.token}`}>
            عرض صفحة متابعة العميل <ExternalLink size={14} />
          </Link>
        </section>
      </div>
      <form className="panel" onSubmit={save}>
        <h2>إدارة الطلب</h2>
        <div className="form-grid">
          <label className="field">
            حالة الطلب
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {[order.status, ...statusSteps[order.status]].map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            حالة الدفع
            <select value={payment} onChange={(e) => setPayment(e.target.value)}>
              {[
                order.paymentStatus,
                ...(order.paymentStatus === 'unpaid'
                  ? ['paid']
                  : order.paymentStatus === 'paid'
                    ? ['refunded']
                    : []),
              ].map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s]}
                </option>
              ))}
            </select>
            <small>تحديث السجل فقط؛ لا ينفذ تحصيلًا أو رد مبلغ إلكترونيًا.</small>
          </label>
          <label className="field full-span">
            {pickup ? 'معلومات متابعة الاستلام من الفرع' : 'رقم / معلومات متابعة الشحنة'}
            <input value={tracking} onChange={(e) => setTracking(e.target.value)} maxLength={300} />
          </label>
          <label className="field full-span">
            ملاحظات داخلية
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={3000} />
            <small>لا تظهر للعميل.</small>
          </label>
        </div>
        {status === 'cancelled' && order.status !== 'cancelled' && (
          <Alert kind="info">
            الإلغاء سيعيد كمية الطلب إلى المخزون. بعد الشحن لا يمكن الإلغاء من هذا المسار.
          </Alert>
        )}
        <Alert>{saveError}</Alert>
        <Alert kind="success">{message}</Alert>
        <button className="btn" disabled={busy}>
          <Save size={17} />
          {busy ? 'جاري الحفظ…' : 'حفظ التحديثات'}
        </button>
      </form>
    </>
  );
}

export function Products() {
  const { data, error, loading } = useAsync(() => api<Product[]>('/admin/products'));
  const [q, setQ] = useState('');
  const rows = data?.filter((p) => `${p.name} ${p.kind}`.includes(q)) || [];
  return (
    <>
      <AdminHeading title="المنتجات" subtitle="التوليفات، الأوزان، الأسعار والمخزون.">
        <Link className="btn small" to="/admin/products/new">
          <Plus size={17} />
          إضافة منتج
        </Link>
      </AdminHeading>
      <div className="admin-filter">
        <div className="search-input">
          <Search size={17} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم المنتج…"
            aria-label="بحث المنتجات"
          />
        </div>
        <span className="muted tiny">{rows.length} منتجات</span>
      </div>
      <Alert>{error}</Alert>
      <section className="panel no-padding">
        {loading ? (
          <Loading />
        ) : rows.length ? (
          <div className="table-scroll">
            <table className="products-table">
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>السعر يبدأ من</th>
                  <th>المخزون</th>
                  <th>الحالة</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link className="product-cell" to={`/admin/products/${p.id}`}>
                        <img src={p.image} alt="" />
                        <div>
                          <strong>{p.name}</strong>
                          <small>
                            {p.kind} · {p.roast}
                            {p.featured ? ' · مميز' : ''}
                          </small>
                        </div>
                      </Link>
                    </td>
                    <td>{money(p.variants[0]?.price || 0)}</td>
                    <td>
                      {p.stockMode === 'grams'
                        ? `${p.stockGrams} جم`
                        : p.variants.reduce((n, v) => n + v.stock, 0) + ' عبوة'}
                    </td>
                    <td>
                      <span className={`status ${p.active ? 'confirmed' : 'cancelled'}`}>
                        {p.active ? 'نشط' : 'مخفي'}
                      </span>
                      {p.demo && <span className="demo-badge">بيانات تجريبية</span>}
                    </td>
                    <td>
                      <Link
                        className="icon-button"
                        aria-label={`تعديل ${p.name}`}
                        to={`/admin/products/${p.id}`}
                      >
                        <Pencil size={17} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="لا توجد منتجات مطابقة" description="غيّر البحث أو أضف منتجًا جديدًا." />
        )}
      </section>
    </>
  );
}
const blankProduct = (): Product => ({
  id: '',
  slug: `coffee-${Date.now().toString(36)}`,
  name: '',
  description: '',
  roast: 'وسط',
  brew: ['تركي'],
  kind: 'سادة',
  grinds: ['تركي ناعم'],
  image: '/images/coffee-hero.png',
  active: false,
  featured: false,
  demo: true,
  stockMode: 'units',
  stockGrams: 0,
  variants: [{ weight: 250, price: 18000, stock: 0 }],
});
export function ProductEditor() {
  const { id } = useParams();
  const isNew = id === 'new';
  const [product, setProduct] = useState<Product | null>(isNew ? blankProduct() : null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const { refresh } = useStore();
  useEffect(() => {
    if (isNew) {
      setProduct(blankProduct());
      return;
    }
    api<Product[]>('/admin/products')
      .then((rows) => {
        const p = rows.find((p) => p.id === id);
        if (p) setProduct(p);
        else setError('المنتج غير موجود.');
      })
      .catch((e) => setError(e.message));
  }, [id, isNew]);
  function patch<K extends keyof Product>(key: K, value: Product[K]) {
    setProduct((p) => (p ? { ...p, [key]: value } : p));
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await send(
        isNew ? '/admin/products' : `/admin/products/${id}`,
        isNew ? 'POST' : 'PUT',
        product,
      );
      await refresh();
      nav('/admin/products');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!product) return error ? <Alert>{error}</Alert> : <Loading />;
  return (
    <>
      <AdminHeading
        title={isNew ? 'منتج جديد' : `تعديل ${product.name}`}
        subtitle="كل تغيير هنا يظهر في المتجر بعد الحفظ."
      >
        <Link className="btn secondary small" to="/admin/products">
          المنتجات <ArrowLeft size={16} />
        </Link>
      </AdminHeading>
      <form onSubmit={save}>
        <div className="admin-two-col">
          <div>
            <section className="panel">
              <h2>معلومات المنتج</h2>
              <label className="field">
                اسم المنتج
                <input
                  required
                  value={product.name}
                  maxLength={200}
                  onChange={(e) => patch('name', e.target.value)}
                />
              </label>
              <label className="field">
                رابط المنتج
                <input
                  required
                  dir="ltr"
                  value={product.slug}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  maxLength={100}
                  onChange={(e) => patch('slug', e.target.value)}
                />
                <small>حروف إنجليزية صغيرة وأرقام وشرطات.</small>
              </label>
              <label className="field">
                الوصف
                <textarea
                  required
                  rows={5}
                  value={product.description}
                  maxLength={4000}
                  onChange={(e) => patch('description', e.target.value)}
                />
              </label>
              <div className="form-grid">
                <label className="field">
                  النوع
                  <input
                    value={product.kind}
                    required
                    onChange={(e) => patch('kind', e.target.value)}
                    placeholder="سادة / محوج"
                  />
                </label>
                <label className="field">
                  التحميص
                  <select value={product.roast} onChange={(e) => patch('roast', e.target.value)}>
                    {['غير محدد', 'فاتح', 'وسط', 'غامق'].map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </label>
              </div>
              <fieldset>
                <legend>طرق التحضير</legend>
                <div className="row gap wrap">
                  {['تركي', 'إسبريسو', 'فلتر'].map((b) => (
                    <label className="check-label" key={b}>
                      <input
                        type="checkbox"
                        checked={product.brew.includes(b)}
                        onChange={(e) =>
                          patch(
                            'brew',
                            e.target.checked
                              ? [...product.brew, b]
                              : product.brew.filter((v) => v !== b),
                          )
                        }
                      />
                      {b}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="field">
                اختيارات الطحن
                <textarea
                  value={product.grinds.join('\n')}
                  onChange={(e) => patch('grinds', e.target.value.split('\n'))}
                />
                <small>اكتب كل طحنة في سطر مستقل؛ لا تترك سطورًا فارغة.</small>
              </label>
            </section>
            <section className="panel">
              <div className="panel-heading">
                <h2>الأوزان والأسعار</h2>
                <button
                  type="button"
                  className="btn secondary small"
                  onClick={() =>
                    patch('variants', [
                      ...product.variants,
                      { weight: 1000, price: 10000, stock: 0 },
                    ])
                  }
                >
                  <Plus size={15} />
                  إضافة وزن
                </button>
              </div>
              <label className="field">
                طريقة حساب المخزون
                <select
                  value={product.stockMode}
                  onChange={(e) => patch('stockMode', e.target.value as 'units' | 'grams')}
                >
                  <option value="units">عبوات جاهزة — مخزون مستقل لكل وزن</option>
                  <option value="grams">بن سائب — رصيد مشترك بالجرامات</option>
                </select>
              </label>
              {product.stockMode === 'grams' && (
                <label className="field">
                  إجمالي الرصيد بالجرام
                  <input
                    type="number"
                    min={0}
                    step={1}
                    required
                    value={product.stockGrams}
                    onChange={(e) => patch('stockGrams', Number(e.target.value))}
                  />
                  <small>مثال: 5 كيلو = 5000 جرام. يُخصم وزن الطلب من الرصيد المشترك.</small>
                </label>
              )}
              <div className="variant-rows">
                {product.variants.map((v, index) => (
                  <div className="variant-row" key={v.id || index}>
                    <label className="field">
                      الوزن (جم)
                      <input
                        type="number"
                        min={1}
                        max={10000}
                        required
                        disabled={!!v.id}
                        value={v.weight}
                        onChange={(e) =>
                          patch(
                            'variants',
                            product.variants.map((x, i) =>
                              i === index ? { ...x, weight: Number(e.target.value) } : x,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="field">
                      السعر (ج.م)
                      <input
                        type="number"
                        min={1}
                        step="0.01"
                        required
                        value={v.price / 100}
                        onChange={(e) =>
                          patch(
                            'variants',
                            product.variants.map((x, i) =>
                              i === index
                                ? { ...x, price: Math.round(Number(e.target.value) * 100) }
                                : x,
                            ),
                          )
                        }
                      />
                    </label>
                    {product.stockMode === 'units' && (
                      <label className="field">
                        عدد العبوات
                        <input
                          type="number"
                          min={0}
                          step={1}
                          required
                          value={v.stock}
                          onChange={(e) =>
                            patch(
                              'variants',
                              product.variants.map((x, i) =>
                                i === index ? { ...x, stock: Number(e.target.value) } : x,
                              ),
                            )
                          }
                        />
                      </label>
                    )}
                    <button
                      type="button"
                      className="icon-button danger-text"
                      aria-label="إزالة الوزن"
                      disabled={product.variants.length === 1}
                      onClick={() =>
                        patch(
                          'variants',
                          product.variants.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}
              </div>
              <small className="muted">
                تغيير الوزن المسجل يتطلب حذف صفه وإضافة وزن جديد. بيانات الطلبات السابقة تظل محفوظة.
              </small>
            </section>
          </div>
          <aside>
            <section className="panel">
              <h2>صورة المنتج</h2>
              <ImageUpload value={product.image} onChange={(url) => patch('image', url)} />
              {product.image.startsWith('/images/') && (
                <p className="tiny muted">
                  الصورة الأولية تصورية مستوحاة من العبوة المرفقة. استبدلها بالصورة الأصلية المعتمدة
                  قبل البيع.
                </p>
              )}
            </section>
            <section className="panel">
              <h2>الظهور والاعتماد</h2>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={product.active}
                  onChange={(e) => patch('active', e.target.checked)}
                />
                إظهار المنتج في المتجر
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={product.featured}
                  onChange={(e) => patch('featured', e.target.checked)}
                />
                منتج مميز على الرئيسية
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={product.demo}
                  onChange={(e) => patch('demo', e.target.checked)}
                />
                بيانات تجريبية لم تُعتمد بعد
              </label>
              <p className="tiny muted">
                ألغِ علامة البيانات التجريبية بعد اعتماد الصورة والسعر والوزن والتفاصيل الفعلية
                للمنتج.
              </p>
            </section>
          </aside>
        </div>
        <Alert>{error}</Alert>
        <div className="save-bar">
          <button className="btn" disabled={busy}>
            <Save size={17} />
            {busy ? 'جاري الحفظ…' : 'حفظ المنتج'}
          </button>
          <Link className="btn secondary" to="/admin/products">
            إلغاء
          </Link>
        </div>
      </form>
    </>
  );
}

export function SettingsPage({ contentOnly = false }: { contentOnly?: boolean }) {
  const { user } = useOutletContext<{ user: User }>();
  const { data, error, loading } = useAsync(() => api<Settings>('/admin/settings'));
  const [settings, setSettings] = useState<Settings | null>(null);
  const [tab, setTab] = useState('general');
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [message, setMessage] = useState('');
  const { refresh } = useStore();
  useEffect(() => {
    if (data) setSettings(data);
  }, [data]);
  if (user.role !== 'owner') return <Alert>إعدادات المتجر متاحة للمالك فقط.</Alert>;
  if (loading && !settings) return <Loading />;
  if (error) return <Alert>{error}</Alert>;
  if (!settings) return null;
  const s = settings;
  function patch<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
    setMessage('');
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaveError('');
    setMessage('');
    try {
      await send('/admin/settings', 'PUT', settings);
      await refresh();
      setMessage('تم حفظ الإعدادات وتحديث المتجر.');
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const sectionNames: Record<string, string> = {
    brewing: 'اختيار طريقة التحضير',
    quiz: 'اختبار اختيار الفنجان',
    recipes: 'كروت التحضير',
    experience: 'مشروبات الفروع',
    featured: 'المنتجات المميزة',
    story: 'حكاية دار البن',
    branches: 'فروع دار البن',
    guide: 'مساعدة اختيار القهوة',
  };
  return (
    <>
      <AdminHeading
        title={contentOnly ? 'محتوى الرئيسية' : 'إعدادات المتجر'}
        subtitle={
          contentOnly
            ? 'الكلمات والصور والأقسام اللي بتحكي قصة دار البن.'
            : 'بيانات المتجر، التوصيل وسياسات البيع.'
        }
      />
      <form onSubmit={save}>
        {contentOnly ? (
          <div className="admin-two-col">
            <div>
              <section className="panel">
                <h2>المساحة الافتتاحية</h2>
                <label className="field">
                  العنوان الرئيسي
                  <textarea
                    value={s.heroTitle}
                    onChange={(e) => patch('heroTitle', e.target.value)}
                    maxLength={200}
                    required
                  />
                </label>
                <label className="field">
                  الوصف المختصر
                  <textarea
                    value={s.heroSubtitle}
                    onChange={(e) => patch('heroSubtitle', e.target.value)}
                    maxLength={200}
                    required
                  />
                </label>
                <ImageUpload
                  value={s.heroImage}
                  onChange={(url) => {
                    setSettings((prev) =>
                      prev ? { ...prev, heroImage: url, heroVideo: '' } : prev,
                    );
                    setMessage('');
                  }}
                />
              </section>
              <section className="panel">
                <h2>حكاية دار البن</h2>
                <label className="field">
                  عنوان القسم
                  <textarea
                    value={s.storyTitle}
                    onChange={(e) => patch('storyTitle', e.target.value)}
                    maxLength={200}
                    required
                  />
                </label>
                <label className="field">
                  نص الحكاية
                  <textarea
                    rows={6}
                    value={s.storyText}
                    onChange={(e) => patch('storyText', e.target.value)}
                    maxLength={3000}
                  />
                </label>
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h2>فروع دار البن</h2>
                  <button
                    className="btn secondary small"
                    type="button"
                    disabled={(s.branches || []).length >= 12}
                    onClick={() =>
                      patch('branches', [
                        ...(s.branches || []),
                        { name: '', address: '', main: false, enabled: true },
                      ])
                    }
                  >
                    <Plus size={15} />
                    إضافة فرع
                  </button>
                </div>
                <p className="tiny muted">
                  العنوان يظهر للزوار، ورابط الخريطة يبحث عنه. أضف العناوين المعتمدة فقط.
                </p>
                {(s.branches || []).map((branch, index) => (
                  <fieldset className="branch-editor" key={index}>
                    <legend>الفرع {index + 1}</legend>
                    <label className="field">
                      اسم الفرع
                      <input
                        value={branch.name}
                        maxLength={80}
                        required
                        onChange={(e) =>
                          patch(
                            'branches',
                            s.branches.map((b, i) =>
                              i === index ? { ...b, name: e.target.value } : b,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="field">
                      عنوان الفرع
                      <textarea
                        value={branch.address}
                        maxLength={300}
                        required
                        onChange={(e) =>
                          patch(
                            'branches',
                            s.branches.map((b, i) =>
                              i === index ? { ...b, address: e.target.value } : b,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={branch.enabled !== false}
                        onChange={(e) =>
                          patch(
                            'branches',
                            s.branches.map((b, i) =>
                              i === index ? { ...b, enabled: e.target.checked } : b,
                            ),
                          )
                        }
                      />
                      متاح للاستلام
                    </label>
                    <p className="tiny muted">
                      إيقاف الاستلام لا يخفي عنوان الفرع، ولا يغيّر الطلبات المسجلة.
                    </p>
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={branch.main}
                        onChange={(e) =>
                          patch(
                            'branches',
                            s.branches.map((b, i) =>
                              i === index ? { ...b, main: e.target.checked } : b,
                            ),
                          )
                        }
                      />
                      الفرع الرئيسي
                    </label>
                    <button
                      type="button"
                      className="btn secondary small"
                      aria-label={`حذف الفرع ${index + 1}`}
                      onClick={() =>
                        patch(
                          'branches',
                          s.branches.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Trash2 size={15} />
                      حذف الفرع
                    </button>
                  </fieldset>
                ))}
              </section>
            </div>
            <aside className="panel self-start">
              <h2>ترتيب وإظهار الأقسام</h2>
              <p className="muted tiny">الترتيب من أعلى الصفحة إلى أسفلها.</p>
              {s.sections.map((key, index) => (
                <div className="section-control" key={key}>
                  <span>{sectionNames[key]}</span>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`رفع ${sectionNames[key]}`}
                    disabled={!index}
                    onClick={() => {
                      const a = [...s.sections];
                      [a[index - 1], a[index]] = [a[index], a[index - 1]];
                      patch('sections', a);
                    }}
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`خفض ${sectionNames[key]}`}
                    disabled={index === s.sections.length - 1}
                    onClick={() => {
                      const a = [...s.sections];
                      [a[index + 1], a[index]] = [a[index], a[index + 1]];
                      patch('sections', a);
                    }}
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`إخفاء ${sectionNames[key]}`}
                    onClick={() =>
                      patch(
                        'sections',
                        s.sections.filter((k) => k !== key),
                      )
                    }
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
              {Object.keys(sectionNames)
                .filter((key) => !s.sections.includes(key))
                .map((key) => (
                  <button
                    className="btn secondary small full"
                    type="button"
                    key={key}
                    onClick={() => patch('sections', [...s.sections, key])}
                  >
                    <Plus size={15} />
                    إظهار {sectionNames[key]}
                  </button>
                ))}
            </aside>
          </div>
        ) : (
          <>
            <div className="admin-tabs">
              {[
                ['general', 'المتجر والتواصل'],
                ['shipping', 'الشحن والدفع'],
                ['policies', 'السياسات'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={tab === key ? 'selected' : ''}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            {tab === 'general' && (
              <section className="panel">
                <h2>بيانات المتجر</h2>
                <div className="form-grid">
                  <label className="field">
                    اسم المتجر
                    <input
                      value={s.brand}
                      onChange={(e) => patch('brand', e.target.value)}
                      required
                    />
                  </label>
                  <label className="field">
                    وضع التشغيل
                    <select
                      value={s.mode}
                      onChange={(e) => patch('mode', e.target.value as 'preview' | 'live')}
                    >
                      <option value="preview">معاينة — طلبات تجريبية</option>
                      <option value="live">بيع فعلي — بيانات معتمدة</option>
                    </select>
                  </label>
                  <label className="field">
                    رقم التواصل
                    <input
                      dir="ltr"
                      value={s.contactPhone}
                      onChange={(e) => patch('contactPhone', e.target.value)}
                      maxLength={30}
                    />
                  </label>
                  <label className="field">
                    البريد الإلكتروني
                    <input
                      type="email"
                      dir="ltr"
                      value={s.contactEmail}
                      onChange={(e) => patch('contactEmail', e.target.value)}
                    />
                  </label>
                  <label className="field full-span">
                    العنوان
                    <input
                      value={s.address}
                      onChange={(e) => patch('address', e.target.value)}
                      maxLength={300}
                    />
                  </label>
                </div>
                <Alert kind="info">
                  البيع الفعلي يتطلب منتجات ببيانات معتمدة، منطقة شحن حقيقية، وبيانات تواصل وسياسات
                  مكتملة. النشر على الإنترنت يتم على خادم مستقل يدعم HTTPS وقرصًا دائمًا.
                </Alert>
              </section>
            )}
            {tab === 'shipping' && (
              <>
                <section className="panel">
                  <div className="panel-heading">
                    <h2>مناطق التوصيل</h2>
                    <button
                      type="button"
                      className="btn secondary small"
                      onClick={() =>
                        patch('shippingZones', [
                          ...s.shippingZones,
                          { id: crypto.randomUUID(), name: '', fee: 0, eta: '', enabled: true },
                        ])
                      }
                    >
                      <Plus size={15} />
                      إضافة منطقة
                    </button>
                  </div>
                  {s.shippingZones.map((zone, index) => {
                    const update = (value: Partial<typeof zone>) =>
                      patch(
                        'shippingZones',
                        s.shippingZones.map((z, i) => (i === index ? { ...z, ...value } : z)),
                      );
                    return (
                      <div className="shipping-row" key={zone.id}>
                        <label className="field">
                          المنطقة
                          <input
                            value={zone.name}
                            required
                            onChange={(e) => update({ name: e.target.value })}
                          />
                        </label>
                        <label className="field">
                          الشحن (ج.م)
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={zone.fee / 100}
                            required
                            onChange={(e) =>
                              update({ fee: Math.round(Number(e.target.value) * 100) })
                            }
                          />
                        </label>
                        <label className="field">
                          مدة التوصيل
                          <input
                            value={zone.eta}
                            required
                            placeholder="مثال: 2–4 أيام عمل"
                            onChange={(e) => update({ eta: e.target.value })}
                          />
                        </label>
                        <label className="check-label">
                          <input
                            type="checkbox"
                            checked={zone.enabled}
                            onChange={(e) => update({ enabled: e.target.checked })}
                          />
                          متاحة
                        </label>
                        <button
                          type="button"
                          className="icon-button danger-text"
                          aria-label="إزالة منطقة التوصيل"
                          onClick={() =>
                            patch(
                              'shippingZones',
                              s.shippingZones.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                  {!s.shippingZones.length && <p>أضف مناطق التوصيل التي تخدمها فعلًا.</p>}
                </section>
                <section className="panel">
                  <h2>طرق الدفع</h2>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={s.codEnabled}
                      onChange={(e) => patch('codEnabled', e.target.checked)}
                    />
                    تفعيل الدفع عند الاستلام
                  </label>
                  <p className="muted">
                    المدفوعات الإلكترونية تحتاج مزوّد دفع معتمد وربطًا منفصلًا؛ لا يتم تحصيل أي مبلغ
                    إلكتروني في هذه النسخة.
                  </p>
                </section>
              </>
            )}
            {tab === 'policies' && (
              <section className="panel">
                <h2>سياسات المتجر</h2>
                {(
                  [
                    ['shippingPolicy', 'الشحن والتوصيل'],
                    ['returnsPolicy', 'الاستبدال والاسترجاع'],
                    ['privacyPolicy', 'الخصوصية واستخدام البيانات'],
                  ] as const
                ).map(([key, label]) => (
                  <label className="field" key={key}>
                    {label}
                    <textarea
                      rows={7}
                      value={s[key]}
                      onChange={(e) => patch(key, e.target.value)}
                      maxLength={8000}
                    />
                  </label>
                ))}
                <p className="tiny muted">
                  تظهر النصوص كما كتبتها على صفحات السياسات. أدخل السياسات الفعلية المعتمدة لنشاطك.
                </p>
              </section>
            )}
          </>
        )}
        <Alert>{saveError}</Alert>
        <Alert kind="success">{message}</Alert>
        <div className="save-bar">
          <button className="btn" disabled={busy}>
            <Save size={17} />
            {busy ? 'جاري الحفظ…' : 'حفظ التغييرات'}
          </button>
        </div>
      </form>
    </>
  );
}

export function UsersPage() {
  const { user } = useOutletContext<{ user: User }>();
  const { data, error, loading, reload } = useAsync(() => api<User[]>('/admin/users'));
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user.role !== 'owner') return <Alert>هذا القسم لمالك المتجر فقط.</Alert>;
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true);
    setSaveError('');
    setMessage('');
    try {
      await send('/admin/users', 'POST', Object.fromEntries(f));
      form.reset();
      reload();
      setMessage('تم إنشاء الحساب. شارك بيانات دخوله مع صاحبه بطريقة آمنة.');
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <AdminHeading
        title="الفريق والصلاحيات"
        subtitle="حساب مستقل لكل شخص، ومسؤولية واضحة لكل تعديل."
      />
      <Alert>{error}</Alert>
      <div className="admin-two-col">
        <section className="panel">
          <h2>أعضاء الفريق</h2>
          {loading ? (
            <Loading />
          ) : (
            data?.map((u) => (
              <div className="team-row" key={u.id}>
                <span className="avatar">{u.name.charAt(0)}</span>
                <div>
                  <strong>{u.name}</strong>
                  <small dir="ltr">{u.username}</small>
                </div>
                <span className="status">{u.role === 'owner' ? 'مالك' : 'مدير عمليات'}</span>
                {u.id !== user.id && (
                  <button
                    className="icon-button danger-text"
                    aria-label={`حذف حساب ${u.name}`}
                    onClick={async () => {
                      if (!window.confirm(`حذف حساب ${u.name} وإنهاء جلساته؟`)) return;
                      try {
                        await send(`/admin/users/${u.id}`, 'DELETE');
                        reload();
                      } catch (err) {
                        setSaveError((err as Error).message);
                      }
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))
          )}
        </section>
        <form className="panel" onSubmit={add}>
          <h2>إضافة عضو</h2>
          <label className="field">
            الاسم
            <input name="name" required minLength={2} maxLength={80} />
          </label>
          <label className="field">
            اسم الدخول
            <input
              name="username"
              dir="ltr"
              required
              pattern="[a-zA-Z0-9._\-]{3,40}"
              autoComplete="off"
            />
          </label>
          <label className="field">
            كلمة المرور
            <input
              name="password"
              type="password"
              dir="ltr"
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
            />
            <small>12 حرفًا على الأقل.</small>
          </label>
          <label className="field">
            الصلاحية
            <select name="role">
              <option value="manager">مدير عمليات — منتجات وطلبات</option>
              <option value="owner">مالك — جميع الإعدادات والصلاحيات</option>
            </select>
          </label>
          <Alert>{saveError}</Alert>
          <Alert kind="success">{message}</Alert>
          <button className="btn" disabled={busy}>
            <Plus size={16} />
            {busy ? 'جاري الإنشاء…' : 'إنشاء الحساب'}
          </button>
        </form>
      </div>
    </>
  );
}
const auditLabels: Record<string, string> = {
  'auth.login': 'تسجيل دخول',
  'auth.password_changed': 'تغيير كلمة المرور',
  'product.created': 'إضافة منتج',
  'product.updated': 'تعديل منتج',
  'order.updated': 'تحديث طلب',
  'settings.updated': 'تعديل إعدادات المتجر',
  'admin.created': 'إضافة عضو',
  'admin.deleted': 'حذف عضو',
  'media.uploaded': 'رفع صورة',
};
export function AuditPage() {
  const { data, error, loading } = useAsync(() =>
    api<{ id: number; user: string; action: string; entity: string; createdAt: number }[]>(
      '/admin/audit',
    ),
  );
  return (
    <>
      <AdminHeading title="سجل النشاط" subtitle="آخر 100 عملية إدارية مسجّلة على الخادم." />
      <Alert>{error}</Alert>
      <section className="panel no-padding">
        {loading ? (
          <Loading />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>العملية</th>
                  <th>المستخدم</th>
                  <th>التوقيت</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((a) => (
                  <tr key={a.id}>
                    <td>{auditLabels[a.action] || a.action}</td>
                    <td>{a.user || 'حساب محذوف'}</td>
                    <td>{date(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
export function AccountPage() {
  const { user } = useOutletContext<{ user: User }>();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setError('');
    setMessage('');
    if (f.get('password') !== f.get('confirm')) {
      setError('تأكيد كلمة المرور غير متطابق.');
      return;
    }
    setBusy(true);
    try {
      await send('/auth/password', 'POST', {
        currentPassword: f.get('currentPassword'),
        password: f.get('password'),
      });
      setMessage('تم تغيير كلمة المرور وإنهاء الجلسات الأخرى.');
      form.reset();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <AdminHeading title="حسابي" subtitle={`${user.name} · ${user.username}`} />
      <form className="panel account-panel" onSubmit={submit}>
        <h2>تغيير كلمة المرور</h2>
        <label className="field">
          كلمة المرور الحالية
          <input
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            dir="ltr"
          />
        </label>
        <label className="field">
          كلمة المرور الجديدة
          <input
            name="password"
            type="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
            dir="ltr"
          />
        </label>
        <label className="field">
          تأكيد كلمة المرور
          <input
            name="confirm"
            type="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
            dir="ltr"
          />
        </label>
        <Alert>{error}</Alert>
        <Alert kind="success">{message}</Alert>
        <button className="btn" disabled={busy}>
          <ShieldCheck size={17} />
          {busy ? 'جاري الحفظ…' : 'تغيير كلمة المرور'}
        </button>
      </form>
    </>
  );
}
