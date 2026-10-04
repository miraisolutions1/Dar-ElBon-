// Offline integration test of the real Supabase-backed Pages bundle. Auth/RPC
// responses are routed fixtures; this does not test hosted SQL, RLS or deployment.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { openDatabase, allProducts, getSettings, orderView } from '../server/db.mjs';
import { createAdmin } from '../server/auth.mjs';
import { placeOrder, saveProduct, updateOrder } from '../server/store.mjs';

const output = '.local/supabase-pages-test';
execFileSync(process.execPath, ['scripts/build-supabase-pages.mjs'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_SUPABASE_URL: 'https://test-project.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'sb_publishable_test',
    SUPABASE_PAGES_OUT_DIR: output,
  },
});
const html = readFileSync(join(output, 'index.html'), 'utf8');
const email = 'owner@example.test';
const password = 'Synthetic-test-password-2394!';
assert(
  !html.includes(email) && !html.includes(password),
  'Credentials must not enter the static bundle',
);
const directory = mkdtempSync(join(tmpdir(), 'dar-supabase-browser-'));
const db = openDatabase(directory);
let browser;
try {
  const id = await createAdmin(db, {
    username: 'supabase.fixture',
    name: 'مدير الاختبار',
    password,
  });
  const profile = { id, username: email, name: 'مدير الاختبار', role: 'owner' };
  // Isolated package choices: the public migration adds the same SKU matrix.
  for (const template of allProducts(db).filter((p) => p.stockMode === 'units')) {
    for (const roast of ['فاتح', 'وسط', 'غامق'])
      for (const kind of ['سادة', 'محوج']) {
        if (
          allProducts(db).some(
            (p) => p.image === template.image && p.roast === roast && p.kind === kind,
          )
        )
          continue;
        saveProduct(
          db,
          randomUUID(),
          {
            ...template,
            id: undefined,
            slug: `fixture-${template.slug}-${['فاتح', 'وسط', 'غامق'].indexOf(roast)}-${kind === 'سادة' ? 'plain' : 'spiced'}`,
            name: `عبوة اختبار ${kind} ${roast}`,
            roast,
            kind,
            variants: template.variants.map(({ id, ...variant }) => variant),
          },
          profile,
        );
      }
  }

  const jwt =
    [
      { alg: 'HS256', typ: 'JWT' },
      {
        sub: id,
        aud: 'authenticated',
        role: 'authenticated',
        email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
    ]
      .map((part) => Buffer.from(JSON.stringify(part)).toString('base64url'))
      .join('.') + '.test-signature';
  const user = {
    id,
    aud: 'authenticated',
    role: 'authenticated',
    email,
    email_confirmed_at: new Date().toISOString(),
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const session = {
    access_token: jwt,
    refresh_token: 'fixture-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    user,
  };
  const calls = [];
  let inventoryBeforeOrder;
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true,
  });
  const context = await browser.newContext();
  context.setDefaultTimeout(12000);
  context.setDefaultNavigationTimeout(15000);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.routeWebSocket('wss://test-project.supabase.co/**', (socket) => socket.close());
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname === 'pages.example') {
      if (url.pathname === '/Dar-ElBon-/')
        return route.fulfill({ contentType: 'text/html', body: html });
      const path = resolve(output, '.' + url.pathname.replace(/^\/Dar-ElBon-/, ''));
      if (!path.startsWith(resolve(output) + '/') || !existsSync(path))
        return route.fulfill({ status: 404 });
      return route.fulfill({ path });
    }
    if (url.hostname !== 'test-project.supabase.co') return route.abort();
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    };
    const respond = (data, status = 200) =>
      route.fulfill({
        status,
        headers,
        contentType: 'application/json',
        body: JSON.stringify(data),
      });
    if (request.method() === 'OPTIONS') return respond({});
    const body = request.postDataJSON();
    if (url.pathname === '/auth/v1/token') {
      if (url.searchParams.get('grant_type') === 'refresh_token') return respond(session);
      return body.email === email && body.password === password
        ? respond(session)
        : respond({ message: 'Invalid login credentials', code: 'invalid_credentials' }, 400);
    }
    if (url.pathname === '/auth/v1/user') return respond(user);
    if (url.pathname === '/auth/v1/logout') return respond({});
    const name = url.pathname.split('/').pop();
    calls.push({ name, body, authorization: request.headers().authorization });
    try {
      if (name === 'dar_store')
        return respond({ settings: getSettings(db), products: allProducts(db, true) });
      if (name === 'dar_place_order') {
        inventoryBeforeOrder = new Map(
          allProducts(db).map((product) => [product.id, product.stockGrams]),
        );
        return respond(placeOrder(db, body.input).order);
      }
      if (name === 'dar_track_order')
        return respond(orderView(db.prepare('SELECT * FROM orders WHERE token=?').get(body.token)));
      if (name === 'dar_admin') {
        assert.equal(
          request.headers().authorization,
          `Bearer ${jwt}`,
          'Admin RPC requires the authenticated session token',
        );
        const { action, payload } = body;
        if (action === 'me') return respond(profile);
        if (action === 'GET /admin/settings') return respond(getSettings(db));
        if (action === 'PUT /admin/settings') {
          const { _query, ...settings } = payload;
          db.prepare('UPDATE settings SET value=? WHERE id=1').run(JSON.stringify(settings));
          return respond(settings);
        }
        if (action === 'POST /admin/products') {
          const { _query, ...product } = payload;
          return respond(saveProduct(db, randomUUID(), product, profile));
        }
        if (action.startsWith('PATCH /admin/orders/')) {
          const { _query, ...patch } = payload;
          return respond(updateOrder(db, Number(action.split('/').pop()), patch, profile));
        }
        if (action === 'GET /admin/products') return respond(allProducts(db));
        if (action.startsWith('PUT /admin/products/')) {
          const { _query, ...product } = payload;
          return respond(saveProduct(db, action.split('/').pop(), product, profile));
        }
        const orders = db
          .prepare('SELECT * FROM orders ORDER BY id DESC')
          .all()
          .map((row) => orderView(row, true));
        if (action === 'GET /admin/orders')
          return respond({ orders, total: orders.length, page: 1 });
        if (action.startsWith('GET /admin/orders/'))
          return respond(orders.find((order) => String(order.id) === action.split('/').pop()));
        if (action === 'GET /admin/dashboard')
          return respond({
            mode: 'preview',
            stats: {
              orders: orders.length,
              pending: orders.length,
              revenue: 0,
              products: allProducts(db).length,
              demoOrders: orders.length,
            },
            recentOrders: orders,
            lowStock: [],
            checks: [],
          });
      }
      return respond({ message: 'Unexpected fixture route' }, 404);
    } catch (error) {
      return respond({ message: error.message, code: 'P0001' }, 400);
    }
  });
  const site = 'https://pages.example/Dar-ElBon-/';
  await page.goto(site + '#/admin');
  await expect(page).toHaveURL(/#\/admin\/login$/);
  assert.equal(
    calls.filter((call) => call.name === 'dar_admin').length,
    0,
    'Signed-out visitors must not request privileged data',
  );
  await page.getByLabel('البريد الإلكتروني').fill(email);
  await page.getByLabel('كلمة المرور', { exact: true }).fill('Wrong-synthetic-password!');
  await page.getByRole('button', { name: 'دخول لوحة الإدارة' }).click();
  await expect(page.getByRole('alert')).toContainText('غير صحيحين');
  await page.getByLabel('كلمة المرور', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'دخول لوحة الإدارة' }).click();
  await expect(page.getByRole('heading', { name: 'صباح القهوة ☕' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'صباح القهوة ☕' })).toBeVisible();
  await page.getByRole('link', { name: 'المنتجات', exact: true }).click();
  await page.getByRole('link', { name: 'تعديل توليفة دار البن البرازيلي', exact: true }).click();
  await page.getByLabel('السعر (ج.م)', { exact: true }).first().fill('201');
  await page.getByRole('button', { name: 'حفظ المنتج', exact: true }).click();
  await expect(page).toHaveURL(/#\/admin\/products$/);
  const save = calls.find(
    (call) => call.name === 'dar_admin' && call.body.action.startsWith('PUT /admin/products/'),
  );
  assert.equal(save.body.payload.variants[0].price, 20100);
  // Creating a hidden product must not accidentally publish it to customers.
  await page.getByRole('link', { name: 'إضافة منتج', exact: true }).click();
  await page.getByLabel('اسم المنتج', { exact: true }).fill('منتج اختبار مخفي');
  await page.getByLabel('رابط المنتج').fill('fixture-hidden-package');
  await page.getByLabel('الوصف', { exact: true }).fill('وصف منتج في قاعدة بيانات الاختبار فقط.');
  await page.getByLabel('النوع').selectOption('سادة');
  await page.getByLabel('السعر (ج.م)', { exact: true }).fill('180');
  await page.getByRole('button', { name: 'حفظ المنتج', exact: true }).click();
  await expect(page).toHaveURL(/#\/admin\/products$/);
  const created = allProducts(db).find((product) => product.slug === 'fixture-hidden-package');
  assert(created && !created.active, 'A new product stays hidden until explicitly activated');
  await page.reload();
  await expect(page.getByRole('link', { name: 'تعديل منتج اختبار مخفي' })).toBeVisible();
  // Content changes persist through admin, refresh and the public storefront.
  await page.goto(site + '#/admin/content');
  await page.getByLabel('العنوان الرئيسي').fill('الحكاية في الفنجان.');
  await page.getByRole('button', { name: 'حفظ التغييرات', exact: true }).click();
  await expect(page.locator('.alert.success')).toContainText('تم حفظ');
  await page.reload();
  await expect(page.getByLabel('العنوان الرئيسي')).toHaveValue('الحكاية في الفنجان.');
  await page.goto(site);
  await expect(page.locator('.hero h1')).toHaveText('الحكاية في الفنجان.');
  await expect(page.locator('.package-card')).toHaveCount(8);
  await expect(page.locator('.home-featured')).toContainText('حكايتك تبدأ باختيارك');
  const layout = await page.evaluate(() => {
    const hero = document.querySelector('.hero').getBoundingClientRect();
    const header = document.querySelector('.site-header').getBoundingClientRect();
    const cards = [...document.querySelectorAll('.home-featured .package-card')];
    return {
      heroWidth: hero.width,
      width: innerWidth,
      bottom: hero.bottom,
      height: innerHeight,
      rows: new Set(cards.map((card) => Math.round(card.getBoundingClientRect().top))).size,
    };
  });
  assert.equal(layout.heroWidth, layout.width, 'Hero spans the viewport');
  assert(Math.abs(layout.bottom - layout.height) < 2, 'Hero fills the space below the header');
  assert.equal(layout.rows, 2, 'Desktop store preview has two rows');
  await expect(page.locator('.store-more a')).toHaveAttribute('href', '#/shop');
  await expect(page.locator('.brew-motion')).toHaveCount(0);
  await page.screenshot({ path: '.local/landing-packages-desktop.png', fullPage: false });
  await page.locator('.home-featured').screenshot({ path: '.local/premium-store-desktop.png' });
  await page.goto(site + '#/shop');
  await expect(page.locator('.package-card')).toHaveCount(4);
  await expect(page.locator('.package-grid')).not.toContainText('حبوب للتوليف');
  const card = page
    .locator('.package-card.pouch')
    .filter({ has: page.locator('h3 small', { hasText: '500 جم' }) });
  const displayedPrice = await card.locator('.package-bottom strong').textContent();
  await card.locator('.package-bottom a').click();
  await expect(page.locator('.detail-price')).toHaveText(displayedPrice);
  await page.getByLabel('الطحنة المناسبة').selectOption('حبوب كاملة');
  await page.getByRole('button', { name: 'غامق', exact: true }).click();
  await page.getByRole('button', { name: 'محوج', exact: true }).click();
  await expect(page.getByRole('button', { name: 'غامق', exact: true })).toHaveClass(/selected/);
  await expect(page.getByRole('button', { name: 'محوج', exact: true })).toHaveClass(/selected/);
  await expect(page.getByRole('button', { name: '500 جم', exact: true })).toHaveClass(/selected/);
  await expect(page.getByLabel('الطحنة المناسبة')).toHaveValue('حبوب كاملة');
  await page.reload();
  await expect(page.getByRole('button', { name: '500 جم', exact: true })).toHaveClass(/selected/);
  await expect(page.getByLabel('الطحنة المناسبة')).toHaveValue('حبوب كاملة');
  await page.getByRole('button', { name: 'أضف للسلة', exact: true }).click();
  await page.goto(site + '#/cart');
  await expect(page.locator('.cart-item')).toContainText('محوج غامق');
  await expect(page.locator('.cart-item')).toContainText('500 جم · حبوب كاملة');
  await page.reload();
  await expect(page.locator('.cart-item')).toContainText('محوج غامق');
  await expect(page.locator('.cart-item')).toContainText('500 جم · حبوب كاملة');
  // Reset only synthetic cart state before the independent blend scenario.
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage))
      if (key.includes('cart')) localStorage.removeItem(key);
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(site);
  await expect(page.locator('.package-card')).toHaveCount(8);
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    'Mobile landing must not overflow',
  );
  await page.screenshot({ path: '.local/landing-packages-mobile.png', fullPage: false });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(site + '#/blend');
  await expect(page.locator('.bb-origin')).toHaveCount(8);
  await expect(page.getByText(email, { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'زيادة كمية البن إثيوبي 50 جم' }).click();
  await page.getByRole('button', { name: 'أضف التوليفة للسلة', exact: true }).click();
  await page.getByRole('link', { name: 'كمّل الطلب', exact: true }).click();
  await page.reload();
  await expect(page.locator('.cart-item')).toContainText('إثيوبي 50 جم');
  await page.getByRole('link', { name: 'كمّل الطلب', exact: true }).click();
  await page.getByRole('radio', { name: 'استلام من الفرع', exact: true }).check();
  await page.getByLabel('الاسم بالكامل').fill('عميل التكامل');
  await page.getByLabel('رقم الموبايل').fill('01012345678');
  await page.getByLabel('فرع الاستلام').selectOption('1');
  await page.getByRole('button', { name: /تأكيد الطلب/ }).click();
  await expect(page).toHaveURL(/#\/order\/[a-f0-9]{64}$/);
  await expect(page.locator('.pickup-confirmation')).toContainText('مدينة نصر');
  await expect(page.locator('.checkout-line').first()).toContainText('إثيوبي 50 جم');
  const submitted = calls.find((call) => call.name === 'dar_place_order').body.input;
  assert.equal(submitted.fulfillment, 'pickup');
  assert.equal(submitted.pickupBranchIndex, 1);
  assert.equal(submitted.expectedTotal, 28000);
  assert.equal(submitted.items[0].type, 'blend');
  assert.deepEqual(
    submitted.items[0].components.map((component) => component.grams),
    [150, 100, 50],
  );
  const reference = (await page.locator('.order-success strong').textContent()).trim();
  await page.goto(site + '#/admin/orders');
  await page.getByRole('link', { name: reference, exact: true }).click();
  await expect(page.locator('.order-item')).toContainText('إثيوبي: 50 جم');
  await expect(page.getByRole('heading', { name: /الاستلام من فرع.*مدينة نصر/ })).toBeVisible();
  const orderToken = submitted
    ? db.prepare('SELECT token FROM orders ORDER BY id DESC LIMIT 1').get().token
    : '';
  // Admin state and private notes persist, while the customer sees only public tracking.
  await page.getByLabel('حالة الطلب').selectOption('confirmed');
  await page.getByLabel('ملاحظات داخلية').fill('ملاحظة سرية للاختبار');
  await page
    .getByLabel('معلومات متابعة الاستلام من الفرع', { exact: true })
    .fill('جاهز للاستلام بعد التأكيد');
  await page.getByRole('button', { name: 'حفظ التحديثات', exact: true }).click();
  await expect(page.locator('.alert.success')).toContainText('تم تحديث الطلب');
  await page.reload();
  await expect(page.getByLabel('حالة الطلب')).toHaveValue('confirmed');
  await expect(page.getByLabel('ملاحظات داخلية')).toHaveValue('ملاحظة سرية للاختبار');
  const adminOrderUrl = page.url();
  await page.goto(site + '#/order/' + orderToken);
  await expect(page.getByText('جاهز للاستلام بعد التأكيد')).toBeVisible();
  await expect(page.getByText('ملاحظة سرية للاختبار', { exact: true })).toHaveCount(0);
  await page.goto(adminOrderUrl);
  await page.getByLabel('حالة الدفع').selectOption('paid');
  await page.getByRole('button', { name: 'حفظ التحديثات', exact: true }).click();
  await expect(page.locator('.alert.success')).toContainText('تم تحديث الطلب');
  await expect(page.getByLabel('حالة الدفع')).toHaveValue('paid');
  await page.getByLabel('حالة الطلب').selectOption('cancelled');
  await page.getByRole('button', { name: 'حفظ التحديثات', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('رد المبلغ');
  assert.equal(
    db.prepare('SELECT status FROM orders ORDER BY id DESC LIMIT 1').get().status,
    'confirmed',
  );
  await page.getByLabel('حالة الدفع').selectOption('refunded');
  await page.getByRole('button', { name: 'حفظ التحديثات', exact: true }).click();
  await expect(page.locator('.alert.success')).toContainText('تم تحديث الطلب');
  await page.reload();
  await expect(page.getByLabel('حالة الطلب')).toHaveValue('cancelled');
  await expect(page.getByLabel('حالة الدفع')).toHaveValue('refunded');
  await expect(page.getByLabel('حالة الطلب').locator('option')).toHaveCount(1);
  for (const component of submitted.items[0].components) {
    const restored = allProducts(db).find((product) => product.id === component.productId);
    assert.equal(
      restored.stockGrams,
      inventoryBeforeOrder.get(component.productId),
      'Cancellation restores each ingredient stock exactly once',
    );
  }
  await page.goto(site + '#/admin/content');
  const raiseStory = page.getByRole('button', { name: 'رفع حكاية دار البن', exact: true });
  while (await raiseStory.isEnabled()) await raiseStory.click();
  await page.getByRole('button', { name: 'إخفاء اختبار اختيار الفنجان', exact: true }).click();
  await page.getByRole('button', { name: 'حفظ التغييرات', exact: true }).click();
  await expect(page.locator('.alert.success')).toContainText('تم حفظ');
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'إظهار اختبار اختيار الفنجان', exact: true }),
  ).toBeVisible();
  await expect(raiseStory).toBeDisabled();
  await page.goto(site);
  await expect(page.locator('.home-quiz-teaser')).toHaveCount(0);
  assert(
    await page.evaluate(
      () =>
        document.querySelector('.home-story').getBoundingClientRect().top >
        document.querySelector('.home-featured').getBoundingClientRect().top,
    ),
    'Store remains first when later sections are reordered',
  );
  assert(
    await page.evaluate(
      () =>
        document.querySelector('.home-story').getBoundingClientRect().top <
        document.querySelector('.drinks-menu').getBoundingClientRect().top,
    ),
    'Admin section order applies publicly',
  );
  await page.goto(adminOrderUrl);
  await page.getByRole('button', { name: 'تسجيل الخروج', exact: true }).click();
  await expect(page).toHaveURL(/#\/admin\/login$/);
  const adminCallsAfterLogout = calls.filter((call) => call.name === 'dar_admin').length;
  await page.goto(adminOrderUrl);
  await expect(page).toHaveURL(/#\/admin\/login$/);
  assert.equal(calls.filter((call) => call.name === 'dar_admin').length, adminCallsAfterLogout);
  assert.deepEqual(errors, []);
  console.log(
    'Supabase Pages offline browser integration passed: auth, session persistence, product creation/visibility, price/content persistence, blend pickup checkout, private-note isolation, payment/cancellation states with inventory restoration, section hiding/reordering and logout protection.',
  );
} finally {
  if (browser) await browser.close();
  db.close();
  rmSync(directory, { recursive: true, force: true });
}
