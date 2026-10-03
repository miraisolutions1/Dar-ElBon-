import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const catalog = await (await fetch('http://127.0.0.1:3000/api/store')).json();
if (catalog.settings.mode !== 'preview')
  throw new Error('Only demonstration data may be exported.');
const hero =
  'data:image/webp;base64,' +
  readFileSync('public/images/coffee-tin-studio.webp').toString('base64');
const cinematic =
  'data:image/webp;base64,' +
  readFileSync('public/images/coffee-cinematic.webp').toString('base64');
const coffeeSheet =
  'data:image/webp;base64,' + readFileSync('public/images/brewing-methods.webp').toString('base64');
const story =
  'data:image/webp;base64,' + readFileSync('public/images/coffee-story.webp').toString('base64');
const journey =
  'data:image/webp;base64,' + readFileSync('public/images/coffee-journey.webp').toString('base64');
const logo =
  'data:image/webp;base64,' + readFileSync('public/images/dar-logo.webp').toString('base64');
const admin = existsSync('.local/screenshots/admin-desktop.png')
  ? 'data:image/png;base64,' +
    readFileSync('.local/screenshots/admin-desktop.png').toString('base64')
  : '';
const json = (value) => JSON.stringify(value).replaceAll('<', '\\u003c');
const entry = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import '@fontsource-variable/cairo';
import './src/styles.css';
import './src/storefront-theme.css';
import { StoreProvider, CartProvider } from './src/lib';
import { StoreLayout, Home, Shop, ProductPage, CartPage, Guide, About, BranchesPage, Policy, NotFound } from './src/storefront';
const catalog = ${json(catalog)};
const hero = ${json(hero)};
catalog.settings.heroImage = ${json(cinematic)};
catalog.products.forEach(product => product.image = hero);
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
        builder.onLoad({ filter: /src\/storefront\.tsx$/ }, (args) => ({
          contents: readFileSync(args.path, 'utf8')
            .replace(
              'المتجر في وضع المعاينة · الأسعار والطلبات تجريبية',
              'معاينة تفاعلية للتصميم · الأسعار توضيحية · لا يتم إرسال طلبات',
            )
            .replace("'/images/brewing-methods.webp'", json(coffeeSheet))
            .replace('src="/images/coffee-story.webp"', 'src={' + json(story) + '}')
            .replace('src="/images/coffee-journey.webp"', 'src={' + json(journey) + '}'),
          loader: 'tsx',
        }));
        builder.onLoad({ filter: /src\/components\.tsx$/ }, (args) => ({
          contents: readFileSync(args.path, 'utf8').replace(
            'src="/images/dar-logo.webp"',
            'src={' + json(logo) + '}',
          ),
          loader: 'tsx',
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
