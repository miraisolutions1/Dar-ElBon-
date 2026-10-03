import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID, randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { openDatabase, getSettings, orderView } from '../server/db.mjs';
import { createAdmin } from '../server/auth.mjs';
import { createApp } from '../server/app.mjs';

async function fixture(t, { rateLimits = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'dar-api-'));
  const db = openDatabase(dir);
  const password = randomBytes(24).toString('base64url');
  await createAdmin(db, { username: 'owner', name: 'Test Owner', password });
  await createAdmin(db, { username: 'manager', name: 'Test Manager', password, role: 'manager' });
  const { app } = createApp({ db, dataDir: dir, appOrigin: 'http://localhost:4173', rateLimits });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  async function request(path, { method = 'GET', body, cookie, headers = {} } = {}) {
    const response = await fetch(`${base}/api${path}`, {
      method,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(cookie ? { cookie } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    return {
      status: response.status,
      data,
      headers: response.headers,
      cookie: response.headers.get('set-cookie')?.split(';')[0],
    };
  }
  const login = await request('/auth/login', {
    method: 'POST',
    body: { username: 'owner', password },
  });
  assert.equal(login.status, 200);
  const catalog = (await request('/store')).data;
  const product = catalog.products[0];
  const order = () => ({
    idempotencyKey: randomUUID(),
    customer: {
      name: 'عميل اختبار',
      phone: '01012345678',
      city: 'مدينة الاختبار',
      address: 'شارع الاختبار، مبنى 10، الدور الأول',
      notes: 'تعليمات تجريبية',
    },
    zoneId: 'demo-zone',
    paymentMethod: 'cod',
    items: [
      {
        productId: product.id,
        variantId: product.variants[0].id,
        grind: product.grinds[0],
        quantity: 2,
      },
    ],
  });
  return { db, dir, base, password, request, cookie: login.cookie, login, product, order };
}

test('branch pickup validates selection, charges no delivery fee and preserves branch snapshot', async (t) => {
  const f = await fixture(t);
  const settings = getSettings(f.db);
  settings.shippingZones[0].fee = 6500;
  f.db.prepare('UPDATE settings SET value=? WHERE id=1').run(JSON.stringify(settings));
  const input = {
    ...f.order(),
    customer: { name: 'عميل الاستلام', phone: '01012345678' },
    fulfillment: 'pickup',
    pickupBranchIndex: 0,
    zoneId: undefined,
    expectedTotal: f.product.variants[0].price * 2,
    pickupBranch: { name: 'فرع مزيف', address: 'عنوان العميل غير الموثوق' },
  };
  const before = f.db
    .prepare('SELECT stock FROM variants WHERE id=?')
    .get(input.items[0].variantId).stock;
  for (const index of [undefined, -1, 1.5, 11]) {
    assert.equal(
      (await f.request('/orders', { method: 'POST', body: { ...input, pickupBranchIndex: index } }))
        .status,
      400,
    );
  }
  assert.equal(
    f.db.prepare('SELECT stock FROM variants WHERE id=?').get(input.items[0].variantId).stock,
    before,
  );
  const wrongTotal = await f.request('/orders', {
    method: 'POST',
    body: { ...input, expectedTotal: input.expectedTotal + 6500 },
  });
  assert.equal(wrongTotal.status, 409);
  assert.equal(
    f.db.prepare('SELECT stock FROM variants WHERE id=?').get(input.items[0].variantId).stock,
    before,
  );
  const result = await f.request('/orders', { method: 'POST', body: input });
  assert.equal(result.status, 201);
  assert.equal(result.data.fulfillment, 'pickup');
  assert.equal(result.data.shipping, 0);
  assert.equal(result.data.total, input.expectedTotal);
  const branch = { name: settings.branches[0].name, address: settings.branches[0].address };
  assert.deepEqual(result.data.pickupBranch, branch);
  const updated = {
    ...settings,
    branches: settings.branches.map((value, index) =>
      index === 0
        ? { ...value, name: 'الاسم الجديد', address: 'عنوان الفرع بعد تعديل الإدارة' }
        : value,
    ),
  };
  assert.equal(
    (await f.request('/admin/settings', { method: 'PUT', cookie: f.cookie, body: updated })).status,
    200,
  );
  assert.deepEqual((await f.request(`/orders/${result.data.token}`)).data.pickupBranch, branch);
  const orders = (await f.request('/admin/orders', { cookie: f.cookie })).data;
  const details = await f.request(`/admin/orders/${orders.orders[0].id}`, { cookie: f.cookie });
  assert.deepEqual(details.data.pickupBranch, branch);
  const repeat = await f.request('/orders', { method: 'POST', body: input });
  assert.equal(repeat.status, 200);
  assert.deepEqual(repeat.data.pickupBranch, branch);
  assert.equal(
    f.db.prepare('SELECT stock FROM variants WHERE id=?').get(input.items[0].variantId).stock,
    before - 2,
  );
  updated.branches[0].enabled = false;
  f.db.prepare('UPDATE settings SET value=? WHERE id=1').run(JSON.stringify(updated));
  assert.equal(
    (
      await f.request('/orders', {
        method: 'POST',
        body: { ...input, idempotencyKey: randomUUID() },
      })
    ).status,
    400,
  );
});

test('legacy delivery input and old order database migrate with delivery fulfillment', async (t) => {
  const f = await fixture(t);
  const input = f.order();
  const delivery = await f.request('/orders', { method: 'POST', body: input });
  assert.equal(delivery.status, 201);
  assert.equal(delivery.data.fulfillment, 'delivery');
  assert.equal(delivery.data.pickupBranch, null);
  assert.equal(
    (await f.request('/orders', { method: 'POST', body: { ...input, fulfillment: 'delivery' } }))
      .status,
    200,
  );
  assert.equal(
    (
      await f.request('/orders', {
        method: 'POST',
        body: { ...f.order(), customer: { name: 'عميل', phone: '01012345678' } },
      })
    ).status,
    400,
  );
  f.db.exec('ALTER TABLE orders DROP COLUMN fulfillment_json');
  const reopened = openDatabase(f.dir);
  try {
    const migrated = orderView(
      reopened.prepare('SELECT * FROM orders WHERE token=?').get(delivery.data.token),
    );
    assert.equal(migrated.fulfillment, 'delivery');
    assert.equal(migrated.pickupBranch, null);
    assert.equal(migrated.total, delivery.data.total);
    assert.equal(reopened.prepare('PRAGMA user_version').get().user_version, 2);
  } finally {
    reopened.close();
  }
});

test('private API, same-origin protection, role separation, and logout', async (t) => {
  const f = await fixture(t);
  assert.equal((await f.request('/admin/products')).status, 401);
  assert.equal(
    (
      await f.request('/auth/login', {
        method: 'POST',
        body: { username: 'owner', password: 'wrong' },
      })
    ).status,
    401,
  );
  assert.match(f.login.headers.get('set-cookie'), /HttpOnly/);
  assert.match(f.login.headers.get('set-cookie'), /SameSite=Strict/);
  assert.equal(
    (
      await f.request('/admin/settings', {
        method: 'PUT',
        cookie: f.cookie,
        headers: { origin: 'https://evil.example' },
        body: getSettings(f.db),
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await f.request('/orders', {
        method: 'POST',
        headers: { 'sec-fetch-site': 'cross-site' },
        body: f.order(),
      })
    ).status,
    403,
  );
  const manager = await f.request('/auth/login', {
    method: 'POST',
    body: { username: 'manager', password: f.password },
  });
  assert.equal((await f.request('/admin/products', { cookie: manager.cookie })).status, 200);
  assert.equal(
    (
      await f.request('/admin/settings', {
        method: 'PUT',
        cookie: manager.cookie,
        body: getSettings(f.db),
      })
    ).status,
    403,
  );
  assert.equal((await f.request('/admin/users', { cookie: manager.cookie })).status, 403);
  await f.request('/auth/logout', { method: 'POST', cookie: f.cookie });
  assert.equal((await f.request('/auth/me', { cookie: f.cookie })).status, 401);
});

test('orders use server prices, survive reopening the DB, and are idempotent without exposing customer contact', async (t) => {
  const f = await fixture(t);
  const input = { ...f.order(), total: 1, shipping: 0 };
  const created = await f.request('/orders', { method: 'POST', body: input });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  assert.equal(created.data.total, f.product.variants[0].price * 2);
  assert.equal(created.data.demo, true);
  assert.equal(created.data.customer.phone, undefined);
  assert.equal(created.data.customer.address, undefined);
  const duplicate = await f.request('/orders', { method: 'POST', body: input });
  assert.equal(duplicate.status, 200);
  assert.equal(duplicate.data.token, created.data.token);
  const other = await f.request('/orders', {
    method: 'POST',
    body: { ...input, customer: { ...input.customer, name: 'عميل آخر' } },
  });
  assert.equal(other.status, 409);
  const v = f.db.prepare('SELECT stock FROM variants WHERE id=?').get(f.product.variants[0].id);
  assert.equal(v.stock, f.product.variants[0].stock - 2);
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM orders').get().n, 1);
  const secondDb = openDatabase(f.dir);
  assert.equal(secondDb.prepare('SELECT total FROM orders').get().total, created.data.total);
  secondDb.close();
  const publicOrder = await f.request(`/orders/${created.data.token}`);
  assert.equal(publicOrder.status, 200);
  assert.equal(publicOrder.data.note, undefined);
  assert.equal((await f.request('/orders/1')).status, 404);
  const list = await f.request('/admin/orders', { cookie: f.cookie });
  assert.equal(list.data.orders[0].customer.phone, input.customer.phone);
});

test('duplicate cart lines cannot oversell; failing transactions roll back all deductions', async (t) => {
  const f = await fixture(t);
  const input = f.order();
  const line = input.items[0];
  input.items = [
    { ...line, quantity: 15 },
    { ...line, grind: f.product.grinds[1], quantity: 15 },
  ];
  const result = await f.request('/orders', { method: 'POST', body: input });
  assert.equal(result.status, 409);
  assert.equal(f.db.prepare('SELECT stock FROM variants WHERE id=?').get(line.variantId).stock, 20);
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM orders').get().n, 0);
  assert.equal(
    (
      await f.request('/orders', {
        method: 'POST',
        body: { ...f.order(), items: [{ ...line, quantity: -1 }] },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request('/orders', {
        method: 'POST',
        body: { ...f.order(), items: [{ ...line, grind: 'unsupported' }] },
      })
    ).status,
    400,
  );
  const results = await Promise.all(
    Array.from({ length: 3 }, () =>
      f.request('/orders', {
        method: 'POST',
        body: { ...f.order(), items: [{ ...line, quantity: 10 }] },
      }),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 201, 409]);
  assert.equal(f.db.prepare('SELECT stock FROM variants WHERE id=?').get(line.variantId).stock, 0);
});

test('cancellation restores stock once, restricts transitions, and preserves immutable order price snapshots', async (t) => {
  const f = await fixture(t);
  await f.request('/orders', { method: 'POST', body: f.order() });
  let row = f.db.prepare('SELECT * FROM orders').get();
  assert.equal(
    (
      await f.request(`/admin/orders/${row.id}`, {
        method: 'PATCH',
        cookie: f.cookie,
        body: { status: 'delivered' },
      })
    ).status,
    409,
  );
  await f.request(`/admin/orders/${row.id}`, {
    method: 'PATCH',
    cookie: f.cookie,
    body: { paymentStatus: 'paid' },
  });
  assert.equal(
    (
      await f.request(`/admin/orders/${row.id}`, {
        method: 'PATCH',
        cookie: f.cookie,
        body: { status: 'cancelled' },
      })
    ).status,
    400,
  );
  const cancel = await f.request(`/admin/orders/${row.id}`, {
    method: 'PATCH',
    cookie: f.cookie,
    body: { status: 'cancelled', paymentStatus: 'refunded', note: 'private note' },
  });
  assert.equal(cancel.status, 200);
  assert.equal(
    f.db.prepare('SELECT stock FROM variants WHERE id=?').get(f.product.variants[0].id).stock,
    20,
  );
  await f.request(`/admin/orders/${row.id}`, {
    method: 'PATCH',
    cookie: f.cookie,
    body: { status: 'cancelled' },
  });
  assert.equal(
    f.db.prepare('SELECT stock FROM variants WHERE id=?').get(f.product.variants[0].id).stock,
    20,
  );
  const current = (await f.request('/admin/products', { cookie: f.cookie })).data[0];
  const edited = {
    ...current,
    variants: current.variants.map((v) => ({ ...v, price: 50000, stock: 20 })),
  };
  assert.equal(
    (
      await f.request(`/admin/products/${f.product.id}`, {
        method: 'PUT',
        cookie: f.cookie,
        body: edited,
      })
    ).status,
    200,
  );
  row = f.db.prepare('SELECT * FROM orders').get();
  assert.equal(JSON.parse(row.items)[0].price, 18000);
  assert.equal((await f.request(`/orders/${row.token}`)).data.note, undefined);
  const fresh = await f.request('/orders', { method: 'POST', body: f.order() });
  const next = f.db.prepare('SELECT id FROM orders WHERE token=?').get(fresh.data.token);
  for (const status of ['confirmed', 'preparing', 'shipped'])
    assert.equal(
      (
        await f.request(`/admin/orders/${next.id}`, {
          method: 'PATCH',
          cookie: f.cookie,
          body: { status },
        })
      ).status,
      200,
    );
  assert.equal(
    (
      await f.request(`/admin/orders/${next.id}`, {
        method: 'PATCH',
        cookie: f.cookie,
        body: { status: 'cancelled' },
      })
    ).status,
    409,
  );
});

test('shared gram inventory accounts for all weights and is restored on cancellation', async (t) => {
  const f = await fixture(t);
  const edited = { ...f.product, stockMode: 'grams', stockGrams: 600 };
  assert.equal(
    (
      await f.request(`/admin/products/${f.product.id}`, {
        method: 'PUT',
        cookie: f.cookie,
        body: edited,
      })
    ).status,
    200,
  );
  const input = f.order();
  input.items[0].quantity = 1;
  assert.equal((await f.request('/orders', { method: 'POST', body: input })).status, 201);
  const second = f.order();
  second.items[0].quantity = 1;
  second.items[0].variantId = f.product.variants[1].id;
  assert.equal((await f.request('/orders', { method: 'POST', body: second })).status, 409);
  assert.equal(
    f.db.prepare('SELECT stock_grams AS stock FROM products WHERE id=?').get(f.product.id).stock,
    350,
  );
  const row = f.db.prepare('SELECT id FROM orders').get();
  await f.request(`/admin/orders/${row.id}`, {
    method: 'PATCH',
    cookie: f.cookie,
    body: { status: 'cancelled' },
  });
  assert.equal(
    f.db.prepare('SELECT stock_grams AS stock FROM products WHERE id=?').get(f.product.id).stock,
    600,
  );
});

test('uploads validate image bytes, reject SVG/script, and require authenticated access', async (t) => {
  const f = await fixture(t);
  function form(bytes, name, type) {
    const data = new FormData();
    data.append('image', new Blob([bytes], { type }), name);
    return data;
  }
  const malicious = form(
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    'fake.png',
    'image/png',
  );
  assert.equal(
    (
      await fetch(f.base + '/api/admin/upload', {
        method: 'POST',
        headers: { cookie: f.cookie },
        body: malicious,
      })
    ).status,
    400,
  );
  const png = readFileSync('public/images/coffee-hero.png');
  assert.equal(
    (
      await fetch(f.base + '/api/admin/upload', {
        method: 'POST',
        body: form(png, 'product.png', 'image/png'),
      })
    ).status,
    401,
  );
  const response = await fetch(f.base + '/api/admin/upload', {
    method: 'POST',
    headers: { cookie: f.cookie },
    body: form(png, 'product.png', 'image/png'),
  });
  assert.equal(response.status, 201, await response.clone().text());
  const result = await response.json();
  assert.match(result.url, /^\/uploads\/[a-f0-9-]+\.webp$/);
  assert.ok(existsSync(join(f.dir, result.url)));
  const image = await fetch(f.base + result.url);
  assert.equal(image.status, 200);
  assert.match(image.headers.get('content-type'), /image\/webp/);
});

test('live mode requires actual configuration, canonical shipping fees and no demo products', async (t) => {
  const f = await fixture(t);
  const settings = { ...getSettings(f.db), mode: 'live' };
  assert.equal(
    (await f.request('/admin/settings', { method: 'PUT', cookie: f.cookie, body: settings }))
      .status,
    400,
  );
  await f.request(`/admin/products/${f.product.id}`, {
    method: 'PUT',
    cookie: f.cookie,
    body: { ...f.product, demo: false },
  });
  Object.assign(settings, {
    contactPhone: '01000000000',
    shippingPolicy: 'Test shipping policy',
    returnsPolicy: 'Test returns policy',
    privacyPolicy: 'Test privacy policy',
    shippingZones: [
      { id: 'real-zone', name: 'القاهرة', fee: 6500, eta: '3 أيام عمل', enabled: true },
    ],
  });
  assert.equal(
    (await f.request('/admin/settings', { method: 'PUT', cookie: f.cookie, body: settings }))
      .status,
    400,
  );
  for (const product of (await f.request('/store')).data.products) {
    if (!product.demo) continue;
    const update = await f.request(`/admin/products/${product.id}`, {
      method: 'PUT',
      cookie: f.cookie,
      body: { ...product, demo: false },
    });
    assert.equal(update.status, 200);
  }
  assert.equal(
    (
      await f.request('/admin/settings', {
        method: 'PUT',
        cookie: f.cookie,
        body: settings,
      })
    ).status,
    200,
  );
  const input = { ...f.order(), zoneId: 'real-zone', shipping: 0 };
  const order = await f.request('/orders', { method: 'POST', body: input });
  assert.equal(order.status, 201);
  assert.equal(order.data.demo, false);
  assert.equal(order.data.shipping, 6500);
  assert.equal(
    (
      await f.request(`/admin/products/${f.product.id}`, {
        method: 'PUT',
        cookie: f.cookie,
        body: { ...(await f.request('/admin/products', { cookie: f.cookie })).data[0], demo: true },
      })
    ).status,
    400,
  );
  const invalid = await f.request('/orders', {
    method: 'POST',
    body: { ...f.order(), zoneId: 'does-not-exist' },
  });
  assert.equal(invalid.status, 400);
});

test('password change revokes previous sessions and login attempts are rate limited', async (t) => {
  const f = await fixture(t, { rateLimits: true });
  const nextPassword = randomBytes(24).toString('base64url');
  const changed = await f.request('/auth/password', {
    method: 'POST',
    cookie: f.cookie,
    body: { currentPassword: f.password, password: nextPassword },
  });
  assert.equal(changed.status, 200);
  assert.equal((await f.request('/auth/me', { cookie: f.cookie })).status, 401);
  assert.equal((await f.request('/auth/me', { cookie: changed.cookie })).status, 200);
  let result;
  for (let i = 0; i < 10; i++)
    result = await f.request('/auth/login', {
      method: 'POST',
      body: { username: 'owner', password: 'wrong' },
    });
  assert.equal(result.status, 429);
});

test('product edit preserves variants used by old orders; users and audit are persisted', async (t) => {
  const f = await fixture(t);
  const response = await f.request('/admin/users', {
    method: 'POST',
    cookie: f.cookie,
    body: {
      username: 'new.manager',
      name: 'New Manager',
      role: 'manager',
      password: randomBytes(24).toString('base64url'),
    },
  });
  assert.equal(response.status, 201);
  const order = await f.request('/orders', { method: 'POST', body: f.order() });
  assert.equal(order.status, 201);
  const current = (await f.request('/admin/products', { cookie: f.cookie })).data[0];
  const edited = { ...current, variants: [current.variants[1]] };
  assert.equal(
    (
      await f.request(`/admin/products/${f.product.id}`, {
        method: 'PUT',
        cookie: f.cookie,
        body: edited,
      })
    ).status,
    200,
  );
  assert.equal((await f.request('/store')).data.products[0].variants.length, 1);
  const publicOrder = await f.request('/orders/' + order.data.token);
  assert.equal(publicOrder.data.items[0].weight, 250);
  const audit = await f.request('/admin/audit', { cookie: f.cookie });
  assert.ok(audit.data.some((a) => a.action === 'product.updated'));
});

test('stale product edits cannot overwrite stock sales and checkout confirms the displayed total', async (t) => {
  const f = await fixture(t);
  const stale = f.product;
  const changedTotal = await f.request('/orders', {
    method: 'POST',
    body: { ...f.order(), expectedTotal: 1 },
  });
  assert.equal(changedTotal.status, 409);
  assert.equal(
    f.db.prepare('SELECT stock FROM variants WHERE id=?').get(stale.variants[0].id).stock,
    20,
  );
  const created = await f.request('/orders', {
    method: 'POST',
    body: { ...f.order(), expectedTotal: 36000 },
  });
  assert.equal(created.status, 201);
  const edit = await f.request(`/admin/products/${stale.id}`, {
    method: 'PUT',
    cookie: f.cookie,
    body: stale,
  });
  assert.equal(edit.status, 409);
  assert.equal(
    f.db.prepare('SELECT stock FROM variants WHERE id=?').get(stale.variants[0].id).stock,
    18,
  );
});

test('branch content persists, validates addresses and survives legacy settings saves', async (t) => {
  const f = await fixture(t);
  const settings = getSettings(f.db);
  const branches = [{ name: 'فرع اختبار', address: 'عنوان معتمد للاختبار', main: true }];
  const saved = await f.request('/admin/settings', {
    method: 'PUT',
    cookie: f.cookie,
    body: { ...settings, branches },
  });
  assert.equal(saved.status, 200);
  assert.deepEqual((await f.request('/store')).data.settings.branches, branches);
  const legacy = { ...settings };
  delete legacy.branches;
  assert.equal(
    (await f.request('/admin/settings', { method: 'PUT', cookie: f.cookie, body: legacy })).status,
    200,
  );
  assert.deepEqual(getSettings(f.db).branches, branches);
  assert.equal(
    (
      await f.request('/admin/settings', {
        method: 'PUT',
        cookie: f.cookie,
        body: { ...settings, branches: [{ ...branches[0], address: '' }] },
      })
    ).status,
    400,
  );
  assert.deepEqual(getSettings(f.db).branches, branches);
  assert.equal(
    (
      await f.request('/admin/settings', {
        method: 'PUT',
        cookie: f.cookie,
        body: { ...settings, branches: [] },
      })
    ).status,
    200,
  );
  assert.deepEqual((await f.request('/store')).data.settings.branches, []);
});
