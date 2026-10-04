import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const catalog = await (await fetch('http://127.0.0.1:3000/api/store')).json();
if (catalog.settings.mode !== 'preview')
  throw new Error('Only demonstration data may be exported.');
// Inline each referenced public asset without changing which product uses it.
// This also supports the yellow hero, sada tin, branch drinks, and recipe sheet.
const assetCache = new Map();
function inlineAsset(path) {
  if (!path?.startsWith('/images/') && !path?.startsWith('/media/')) return path;
  if (path.includes('..') || path.includes('\\'))
    throw new Error('Unsafe public image path in preview catalog.');
  if (assetCache.has(path)) return assetCache.get(path);
  const mime = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    gif: 'image/gif',
    webp: 'image/webp',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    svg: 'image/svg+xml',
  }[path.split('.').pop()?.toLowerCase()];
  if (!mime) throw new Error(`Unsupported preview image: ${path}`);
  const data = `data:${mime};base64,${readFileSync('public' + path).toString('base64')}`;
  assetCache.set(path, data);
  return data;
}
catalog.settings.heroImage = inlineAsset(catalog.settings.heroImage);
catalog.settings.heroVideo = inlineAsset(catalog.settings.heroVideo);
catalog.products.forEach((product) => {
  product.image = inlineAsset(product.image);
});
const logo = inlineAsset('/images/dar-logo.webp');
const admin = existsSync('.local/screenshots/admin-desktop.png')
  ? 'data:image/png;base64,' +
    readFileSync('.local/screenshots/admin-desktop.png').toString('base64')
  : '';
const json = (value) => JSON.stringify(value).replaceAll('<', '\\u003c');
function inlineSourceImages(source) {
  return (
    source
      // Background-image strings need their URL embedded too.
      .replace(
        /url\((['"]?)(\/(?:images|media)\/[^)'"\s]+)\1\)/g,
        (_, _quote, path) => `url(${inlineAsset(path)})`,
      )
      // JSX attributes need braces when their quoted URL becomes a data URL.
      .replace(
        /\b(src|poster)=(['"])(\/(?:images|media)\/[^'"<>]+)\2/g,
        (_, attribute, _quote, path) => `${attribute}={${json(inlineAsset(path))}}`,
      )
      // Constants and React style objects use ordinary JavaScript strings.
      .replace(/(['"])(\/(?:images|media)\/[^'"<>]+)\1/g, (_, _quote, path) =>
        json(inlineAsset(path)),
      )
  );
}

// These orders stay in this browser. The deployed Node API remains responsible
// for actual authentication, stock transactions, and shared administration.
function createPreviewApi(catalog) {
  const storageKey = 'dar-preview-orders-v1';
  const reply = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  const fail = (message, status = 400) => {
    throw Object.assign(new Error(message), { status });
  };
  const load = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  };
  // Reconstruct demo reservations after a refresh without storing a duplicate
  // of the catalog or its embedded image payloads in localStorage.
  for (const entry of load()) {
    for (const item of entry.order?.items || []) {
      const components =
        item.type === 'blend'
          ? item.components.map((component) => ({
              ...component,
              amount: component.grams * item.quantity,
            }))
          : [
              {
                productId: item.productId,
                variantId: item.variantId,
                amount: item.stockMode === 'grams' ? item.weight * item.quantity : item.quantity,
              },
            ];
      for (const component of components) {
        const product = catalog.products.find((candidate) => candidate.id === component.productId);
        if (!product) continue;
        if (product.stockMode === 'grams')
          product.stockGrams = Math.max(0, product.stockGrams - component.amount);
        else {
          const variant = product.variants.find(
            (candidate) => candidate.id === component.variantId,
          );
          if (variant) variant.stock = Math.max(0, variant.stock - component.amount);
        }
      }
    }
  }
  return async (input, options = {}) => {
    const path = new URL(typeof input === 'string' ? input : input.url, location.href).pathname;
    const method = (options.method || input.method || 'GET').toUpperCase();
    try {
      if (path === '/api/store' && method === 'GET') return reply(catalog);
      if (path.startsWith('/api/orders/') && method === 'GET') {
        const token = path.slice('/api/orders/'.length);
        const found = load().find((entry) => entry.order.token === token);
        return found
          ? reply(found.order)
          : reply({ error: 'الطلب التجريبي غير موجود في هذا المتصفح.' }, 404);
      }
      if (path !== '/api/orders' || method !== 'POST')
        return reply({ error: 'الخدمة متاحة في نسخة المتجر المنشورة على الخادم.' }, 401);
      const body = JSON.parse(options.body || '{}');
      const saved = load();
      const request = JSON.stringify(body);
      const old = saved.find((entry) => entry.key === body.idempotencyKey);
      if (old) {
        if (old.request !== request)
          fail('بدأ طلب مختلف بنفس مفتاح التأكيد. ابدأ طلبًا جديدًا.', 409);
        return reply(old.order);
      }
      if (typeof body.idempotencyKey !== 'string' || body.idempotencyKey.length < 8)
        fail('تعذر تأكيد الطلب. أعد فتح صفحة إتمام الطلب.');
      if (!Array.isArray(body.items) || !body.items.length || body.items.length > 30)
        fail('راجع المنتجات الموجودة في السلة.');
      if (!body.customer?.name || !body.customer?.phone) fail('أدخل اسمك ورقم الموبايل.');
      const pickup = body.fulfillment === 'pickup';
      const branch = pickup ? catalog.settings.branches[body.pickupBranchIndex] : null;
      if (
        pickup &&
        (!Number.isInteger(body.pickupBranchIndex) || !branch || branch.enabled === false)
      )
        fail('اختار فرع استلام متاح.');
      const zone = pickup
        ? { name: branch.name, fee: 0, eta: 'ده طلب تجريبي لا يُرسل للفرع.' }
        : catalog.settings.shippingZones.find((entry) => entry.id === body.zoneId && entry.enabled);
      if (!zone) fail('اختار منطقة شحن متاحة.');
      if (!pickup && (!body.customer.city || String(body.customer.address || '').length < 8))
        fail('أدخل المدينة والعنوان بالتفصيل.');
      if (!catalog.settings.codEnabled || body.paymentMethod !== 'cod')
        fail('طريقة الدفع غير متاحة.');
      const reserved = new Map();
      // Reserve against the same catalog so normal products and blend components
      // cannot collectively exceed the ingredient stock in a single order.
      function reserve(product, variant, amount) {
        const key = product.stockMode === 'grams' ? product.id : variant.id;
        const stock = product.stockMode === 'grams' ? product.stockGrams : variant.stock;
        const next = (reserved.get(key) || 0) + amount;
        if (next > stock) fail('الكمية المطلوبة غير متاحة من ' + product.name + '.', 409);
        reserved.set(key, next);
      }
      const items = body.items.map((line) => {
        if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 30)
          fail('اختار كمية صحيحة للمنتج.');
        if (line.type === 'blend') {
          if (
            !Array.isArray(line.components) ||
            !line.components.length ||
            line.components.length > 8
          )
            fail('اختار مكونات التوليفة.');
          const ids = new Set();
          const components = line.components.map((component) => {
            if (ids.has(component.productId)) fail('نوع البن مكرر في التوليفة.');
            ids.add(component.productId);
            if (
              !Number.isInteger(component.grams) ||
              component.grams < 50 ||
              component.grams > 1000 ||
              component.grams % 50
            )
              fail('كمية كل نوع تكون من ٥٠ إلى ١٠٠٠ جم، بخطوات ٥٠ جم.');
            const product = catalog.products.find(
              (entry) => entry.id === component.productId && entry.active,
            );
            const variant = product?.variants.find((entry) => entry.weight === 50);
            if (
              !product ||
              product.kind !== 'حبوب للتوليف' ||
              product.stockMode !== 'grams' ||
              !variant
            )
              fail('أحد أنواع البن غير متاح.', 409);
            if (!product.grinds.includes(line.grind))
              fail('اختار طحنة مناسبة لكل مكونات التوليفة.');
            reserve(product, variant, component.grams * line.quantity);
            return {
              productId: product.id,
              name: product.name,
              grams: component.grams,
              pricePer50: variant.price,
              unitPrice: (variant.price * component.grams) / 50,
              stockMode: 'grams',
            };
          });
          const weight = components.reduce((sum, component) => sum + component.grams, 0);
          if (weight > 3000) fail('الوزن الإجمالي للتوليفة بحد أقصى ٣ كيلو.');
          const price = components.reduce((sum, component) => sum + component.unitPrice, 0);
          return {
            type: 'blend',
            name: 'توليفتك الخاصة',
            image: '',
            components,
            weight,
            price,
            grind: line.grind,
            quantity: line.quantity,
            total: price * line.quantity,
          };
        }
        const product = catalog.products.find(
          (entry) => entry.id === line.productId && entry.active,
        );
        const variant = product?.variants.find((entry) => entry.id === line.variantId);
        if (!product || !variant) fail('أحد المنتجات لم يعد متاحًا.', 409);
        if (!product.grinds.includes(line.grind)) fail('اختار طحنة متاحة للمنتج.');
        reserve(
          product,
          variant,
          product.stockMode === 'grams' ? variant.weight * line.quantity : line.quantity,
        );
        return {
          productId: product.id,
          variantId: variant.id,
          name: product.name,
          image: product.image,
          weight: variant.weight,
          price: variant.price,
          quantity: line.quantity,
          grind: line.grind,
          total: variant.price * line.quantity,
          stockMode: product.stockMode,
        };
      });
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      if (body.expectedTotal !== subtotal + zone.fee)
        fail('السعر اتغير. راجع الإجمالي وأكد الطلب مرة تانية.', 409);
      const now = Date.now();
      const token = [...crypto.getRandomValues(new Uint8Array(32))]
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
      const order = {
        id: now,
        token,
        reference: 'DEMO-' + token.slice(0, 8).toUpperCase(),
        status: 'new',
        paymentStatus: 'unpaid',
        paymentMethod: 'cod',
        customer: body.customer,
        items: items.map((item) => ({ ...item, image: '' })),
        fulfillment: pickup ? 'pickup' : 'delivery',
        pickupBranch: pickup ? { name: branch.name, address: branch.address } : null,
        zone: zone.name,
        eta: zone.eta,
        subtotal,
        shipping: zone.fee,
        total: subtotal + zone.fee,
        demo: true,
        note: 'طلب تجريبي محفوظ في هذا المتصفح فقط، لا يُرسل للفرع أو لوحة الإدارة.',
        tracking: '',
        createdAt: now,
        updatedAt: now,
      };
      // Write before returning success; storage denial must not pretend an order
      // was saved. Keep this data separate from real application orders.
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify([...saved, { key: body.idempotencyKey, request, order }]),
        );
      } catch {
        fail('المتصفح منع حفظ الطلب التجريبي. اسمح بالتخزين المحلي وجرب تاني.', 503);
      }
      for (const product of catalog.products) {
        if (product.stockMode === 'grams') product.stockGrams -= reserved.get(product.id) || 0;
        else for (const variant of product.variants) variant.stock -= reserved.get(variant.id) || 0;
      }
      return reply(order, 201);
    } catch (error) {
      return reply(
        { error: error.status ? error.message : 'تعذر إتمام الطلب التجريبي.' },
        error.status || 400,
      );
    }
  };
}

const entry = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import '@fontsource-variable/cairo';
import './src/styles.css';
import './src/storefront-theme.css';
import './src/header-theme.css';
import { StoreProvider, CartProvider } from './src/lib';
import { DrinksMenu } from './src/drinks-menu';
import { StoreLayout, Home, Shop, ProductPage, CartPage, Checkout, OrderPage, Guide, About, BranchesPage, QuizPage, RecipesPage, BlendPage, Policy, NotFound } from './src/storefront';
const catalog = ${json(catalog)};
window.fetch = (${createPreviewApi.toString()})(catalog);
function AdminPreview() {
  return <section className="section container">
    <h1>معاينة لوحة الإدارة</h1>
    <p style={{margin:'1rem 0 2rem'}}>لقطة من لوحة الإدارة الفعلية ببيانات اختبار. الأزرار داخل الصورة للعرض فقط.</p>
    ${admin ? `<img src=${json(admin)} alt="لوحة إدارة دار البن ببيانات اختبار" style={{width:'100%',height:'auto',borderRadius:16}} />` : `<p>لوحة الإدارة تتوفر في نسخة المتجر الكاملة.</p>`}
  </section>;
}
document.addEventListener('click', event => {
  if (event.target.closest?.('.skip-link')) {
    event.preventDefault(); document.getElementById('main')?.focus();
  }
});
createRoot(document.getElementById('root')).render(
  <HashRouter><StoreProvider><CartProvider><Routes><Route element={<StoreLayout />}>
    <Route index element={<Home />} />
    <Route path="shop" element={<Shop />} />
    <Route path="products/:slug" element={<ProductPage />} />
    <Route path="cart" element={<CartPage />} />
    <Route path="checkout" element={<Checkout />} />
    <Route path="order/:token" element={<OrderPage />} />
    <Route path="guide" element={<Guide />} />
    <Route path="about" element={<About />} />
    <Route path="branches" element={<BranchesPage />} />
    <Route path="menu" element={<DrinksMenu />} />
    <Route path="quiz" element={<QuizPage />} />
    <Route path="blend" element={<BlendPage />} />
    <Route path="learn" element={<RecipesPage />} />
    <Route path="policies/:type" element={<Policy />} />
    <Route path="admin/*" element={<AdminPreview />} />
    <Route path="*" element={<NotFound />} />
  </Route></Routes></CartProvider></StoreProvider></HashRouter>
);
`;
const result = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), sourcefile: 'preview.tsx', loader: 'tsx' },
  bundle: true,
  minify: true,
  write: false,
  outdir: '.local/offline-build',
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.woff2': 'dataurl', '.woff': 'dataurl' },
  plugins: [
    {
      name: 'preview-copy',
      setup(builder) {
        builder.onLoad({ filter: /src\/.*\.tsx$/ }, (args) => {
          if (args.path.endsWith('/lib.tsx')) return;
          return {
            contents: inlineSourceImages(readFileSync(args.path, 'utf8'))
              .replace(
                'ده طلب تجريبي، لا يتم تحصيل مبالغ أو إرسال شحنة.',
                'دي تجربة للطلب على جهازك فقط. البيانات بتتحفظ في المتصفح، ولا تُرسل للفرع أو لوحة الإدارة.',
              )
              .replace(
                'الطلب محفوظ للتجربة في النظام. لن تتم عملية شحن أو تحصيل.',
                'الطلب التجريبي محفوظ في متصفحك فقط. لا يُرسل للفرع أو لوحة الإدارة، ولا يتم شحن أو تحصيل.',
              ),
            loader: 'tsx',
          };
        });
        builder.onLoad({ filter: /src\/.*\.css$/ }, (args) => ({
          contents: inlineSourceImages(readFileSync(args.path, 'utf8')),
          loader: 'css',
        }));
        builder.onLoad({ filter: /content\/.*\.json$/ }, (args) => ({
          contents: inlineSourceImages(readFileSync(args.path, 'utf8')),
          loader: 'json',
        }));
        builder.onLoad({ filter: /src\/lib\.tsx$/ }, (args) => ({
          contents: readFileSync(args.path, 'utf8').replaceAll(
            'dar-cart-v2',
            'dar-offline-preview-cart',
          ),
          loader: 'tsx',
        }));
      },
    },
  ],
});
const js = result.outputFiles
  .find((file) => file.path.endsWith('.js'))
  .text.replaceAll('</script', '<\\/script');
const css = result.outputFiles.find((file) => file.path.endsWith('.css')).text;
const favicon = logo;
const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>دار البن البرازيلي — الحكاية في الفنجان | معاينة</title><link rel="icon" href="${favicon}"><style>${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`;
const dir = 'docs';
mkdirSync(dir, { recursive: true });
writeFileSync(dir + '/index.html', html);
console.log(
  'Created self-contained preview:',
  dir + '/index.html',
  Buffer.byteLength(html),
  'bytes',
);
