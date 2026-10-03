import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type Variant = { id?: string; weight: number; price: number; stock: number };
export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  roast: string;
  brew: string[];
  kind: string;
  grinds: string[];
  image: string;
  active: boolean;
  featured: boolean;
  demo: boolean;
  stockMode: 'units' | 'grams';
  stockGrams: number;
  variants: Variant[];
  updatedAt?: number;
};
export type Settings = {
  brand: string;
  mode: 'preview' | 'live';
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  storyTitle: string;
  storyText: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  shippingPolicy: string;
  returnsPolicy: string;
  privacyPolicy: string;
  codEnabled: boolean;
  sections: string[];
  branches: { name: string; address: string; main: boolean }[];
  shippingZones: { id: string; name: string; fee: number; eta: string; enabled: boolean }[];
};
export type CartLine = { productId: string; variantId: string; grind: string; quantity: number };
export type Order = {
  id: number;
  token: string;
  reference: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  customer: { name: string; phone: string; city: string; address: string; notes: string };
  items: (CartLine & {
    name: string;
    image: string;
    weight: number;
    price: number;
    total: number;
  })[];
  zone: string;
  eta: string;
  subtotal: number;
  shipping: number;
  total: number;
  demo: boolean;
  note: string;
  tracking: string;
  createdAt: number;
  updatedAt: number;
};
export type User = { id: string; username: string; name: string; role: 'owner' | 'manager' };
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${url}`, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new ApiError(data.error || 'تعذر إتمام الطلب.', response.status);
  return data;
}
export const send = <T,>(url: string, method: string, value?: unknown) =>
  api<T>(url, { method, body: value === undefined ? undefined : JSON.stringify(value) });
export const money = (amount: number) =>
  new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(amount / 100) + ' ج.م';
export const date = (value: number) =>
  new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Cairo',
  }).format(value);
export const statusLabels: Record<string, string> = {
  new: 'جديد',
  confirmed: 'مؤكد',
  preparing: 'قيد التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
  unpaid: 'لم يُدفع',
  paid: 'مدفوع',
  refunded: 'تم رد المبلغ',
};
export const statusSteps: Record<string, string[]> = {
  new: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};
export const stock = (product: Product, variant: Variant) =>
  product.stockMode === 'grams' ? Math.floor(product.stockGrams / variant.weight) : variant.stock;
export function startingVariant(product: Product) {
  const available = product.variants.filter((variant) => stock(product, variant) > 0);
  return [...(available.length ? available : product.variants)].sort(
    (a, b) => a.price - b.price,
  )[0];
}
export const lineKey = (line: CartLine) => `${line.productId}/${line.variantId}/${line.grind}`;

const StoreContext = createContext<{
  settings: Settings;
  products: Product[];
  refresh: () => Promise<void>;
} | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<{ settings: Settings; products: Product[] } | null>(null);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      const data = await api<{ settings: Settings; products: Product[] }>('/store');
      setValue(data);
      setError('');
    } catch (e) {
      setError((e as Error).message);
      throw e;
    }
  }, []);
  useEffect(() => {
    void refresh().catch(() => {});
  }, [refresh]);
  if (!value)
    return (
      <main className="loading-page">
        <div className="brand-mark">د</div>
        <h1>دار البن البرازيلي</h1>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button className="btn" onClick={() => void refresh().catch(() => {})}>
              حاول مرة أخرى
            </button>
          </>
        ) : (
          <p>بنجهّز لك القهوة…</p>
        )}
      </main>
    );
  return <StoreContext.Provider value={{ ...value, refresh }}>{children}</StoreContext.Provider>;
}
export function useStore() {
  return useContext(StoreContext)!;
}
const CartContext = createContext<{
  lines: CartLine[];
  add: (line: CartLine) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  count: number;
} | null>(null);
export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => {
    try {
      const data = JSON.parse(localStorage.getItem('dar-cart-v2') || '[]');
      return Array.isArray(data)
        ? data
            .filter(
              (l) =>
                l &&
                typeof l.productId === 'string' &&
                typeof l.variantId === 'string' &&
                typeof l.grind === 'string' &&
                Number.isInteger(l.quantity) &&
                l.quantity > 0 &&
                l.quantity <= 30,
            )
            .slice(0, 30)
        : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('dar-cart-v2', JSON.stringify(lines));
    } catch {
      /* Cart still works without persistent browser storage. */
    }
  }, [lines]);
  return (
    <CartContext.Provider
      value={{
        lines,
        count: lines.reduce((n, l) => n + l.quantity, 0),
        add: (line) =>
          setLines((old) => {
            const match = old.find((l) => lineKey(l) === lineKey(line));
            return match
              ? old.map((l) =>
                  l === match ? { ...l, quantity: Math.min(30, l.quantity + line.quantity) } : l,
                )
              : [...old, line].slice(0, 30);
          }),
        setQuantity: (key, quantity) =>
          setLines((old) =>
            old.map((l) =>
              lineKey(l) === key ? { ...l, quantity: Math.min(30, Math.max(1, quantity)) } : l,
            ),
          ),
        remove: (key) => setLines((old) => old.filter((l) => lineKey(l) !== key)),
        clear: () => setLines([]),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
export function useCart() {
  return useContext(CartContext)!;
}
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    loader()
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [...deps, version]);
  return { data, error, loading, reload: () => setVersion((v) => v + 1), setData };
}
