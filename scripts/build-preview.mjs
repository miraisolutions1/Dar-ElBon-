import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const catalog = await (await fetch('http://127.0.0.1:3000/api/store')).json();
if (catalog.settings.mode !== 'preview')
  throw new Error('Only demonstration data may be exported.');
// Inline each referenced public asset without changing which product uses it.
// This also supports the yellow hero, sada tin, branch drinks, and recipe sheet.
const assetCache = new Map();
function inlineAsset(path) {
  if (!path?.startsWith('/images/')) return path;
  if (path.includes('..') || path.includes('\\'))
    throw new Error('Unsafe public image path in preview catalog.');
  if (assetCache.has(path)) return assetCache.get(path);
  const mime = {
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
        /url\((['"]?)(\/images\/[^)'"\s]+)\1\)/g,
        (_, _quote, path) => `url(${inlineAsset(path)})`,
      )
      // JSX attributes need braces when their quoted URL becomes a data URL.
      .replace(
        /\b(src|poster)=(['"])(\/images\/[^'"<>]+)\2/g,
        (_, attribute, _quote, path) => `${attribute}={${json(inlineAsset(path))}}`,
      )
      // Constants and React style objects use ordinary JavaScript strings.
      .replace(/(['"])(\/images\/[^'"<>]+)\1/g, (_, _quote, path) => json(inlineAsset(path)))
  );
}

const entry = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import '@fontsource-variable/cairo';
import './src/styles.css';
import './src/storefront-theme.css';
import { StoreProvider, CartProvider } from './src/lib';
import { StoreLayout, Home, Shop, ProductPage, CartPage, Guide, About, BranchesPage, QuizPage, RecipesPage, Policy, NotFound } from './src/storefront';
const catalog = ${json(catalog)};
window.fetch = async (input) => {
  const path = new URL(String(input), 'https://preview.example').pathname;
  return new Response(JSON.stringify(path === '/api/store' ? catalog : {error:'هذه معاينة للتصميم فقط.'}), {
    status: path === '/api/store' ? 200 : 401,
    headers: {'content-type':'application/json'}
  });
};
function CheckoutPreview() {
  return <section className="section container" style={{minHeight:'45vh'}}>
    <p className="eyebrow">معاينة تفاعلية</p>
    <h1>دي تجربة لشكل المتجر.</h1>
    <p style={{margin:'1rem 0 2rem'}}>تقدر تختار الوزن والطحنة وتجرب السلة. إرسال الطلبات غير متاح في ملف المعاينة.</p>
    <Link className="btn" to="/shop">ارجع للمتجر</Link>
  </section>;
}
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
    <Route path="checkout" element={<CheckoutPreview />} />
    <Route path="guide" element={<Guide />} />
    <Route path="about" element={<About />} />
    <Route path="branches" element={<BranchesPage />} />
    <Route path="quiz" element={<QuizPage />} />
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
        builder.onLoad(
          { filter: /src\/(?:storefront|components|coffee-experience)\.tsx$/ },
          (args) => ({
            contents: inlineSourceImages(readFileSync(args.path, 'utf8')).replace(
              'المتجر في وضع المعاينة · الأسعار والطلبات تجريبية',
              'معاينة تفاعلية للتصميم · الأسعار توضيحية · لا يتم إرسال طلبات',
            ),
            loader: 'tsx',
          }),
        );
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
