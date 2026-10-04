import copy from '../content/site-copy-ar.json' with { type: 'json' };
import experienceCopy from '../content/coffee-experience-ar.json' with { type: 'json' };
import blendOrigins from '../content/blend-origins.json' with { type: 'json' };
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

export const defaults = {
  brand: 'دار البن البرازيلي',
  mode: 'preview',
  heroTitle: copy.hero.title,
  heroSubtitle: copy.hero.subtitle,
  heroImage: '/images/coffee-duo-hero.webp',
  heroVideo: '/media/coffee-duo-loop.mp4',
  storyTitle: copy.story.title,
  storyText: copy.story.shortText,
  contactPhone: '',
  contactEmail: '',
  address: '',
  shippingPolicy: '',
  returnsPolicy: '',
  privacyPolicy: '',
  codEnabled: true,
  sections: ['featured', 'quiz', 'recipes', 'experience', 'story', 'branches', 'guide', 'brewing'],
  branches: [
    { name: 'جسر السويس — ألف مسكن', address: 'شارع جسر السويس، ألف مسكن', main: true },
    { name: 'مدينة نصر', address: 'شارع الطيران، بجوار كوك دور', main: false },
    { name: 'المقطم', address: 'شارع ٩، داخل بنزينة شيل أوت، بجوار جمعية رسالة', main: false },
    { name: 'العبور', address: 'المنطقة التاسعة، داخل مول أفينيو', main: false },
  ],
  shippingZones: [
    { id: 'demo-zone', name: 'منطقة تجريبية', fee: 0, eta: 'للتجربة فقط', enabled: true },
  ],
};

export function openDatabase(directory = process.env.DATA_DIR || './data') {
  const dir = resolve(directory);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(resolve(dir, 'dar-coffee.sqlite'));
  db.exec(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS admins (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('owner','manager')), password_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT NOT NULL,
      roast TEXT NOT NULL, brew TEXT NOT NULL, kind TEXT NOT NULL, grinds TEXT NOT NULL,
      image TEXT NOT NULL, active INTEGER NOT NULL, featured INTEGER NOT NULL, demo INTEGER NOT NULL,
      stock_mode TEXT NOT NULL CHECK(stock_mode IN ('units','grams')), stock_grams INTEGER NOT NULL CHECK(stock_grams>=0),
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS variants (
      id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id), weight INTEGER NOT NULL CHECK(weight>0),
      price INTEGER NOT NULL CHECK(price>0), stock INTEGER NOT NULL CHECK(stock>=0), active INTEGER NOT NULL DEFAULT 1,
      UNIQUE(product_id, weight)
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT, token TEXT NOT NULL UNIQUE, reference TEXT NOT NULL UNIQUE,
      idempotency_key TEXT NOT NULL UNIQUE, request_hash TEXT NOT NULL,
      status TEXT NOT NULL, payment_status TEXT NOT NULL, payment_method TEXT NOT NULL,
      customer TEXT NOT NULL, items TEXT NOT NULL, zone TEXT NOT NULL, eta TEXT NOT NULL,
      subtotal INTEGER NOT NULL, shipping INTEGER NOT NULL, total INTEGER NOT NULL,
      note TEXT NOT NULL DEFAULT '', tracking TEXT NOT NULL DEFAULT '', demo INTEGER NOT NULL,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS orders_date ON orders(created_at);
    CREATE INDEX IF NOT EXISTS orders_status ON orders(status);
    CREATE TABLE IF NOT EXISTS audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT, admin_id TEXT, action TEXT NOT NULL, entity TEXT NOT NULL,
      details TEXT NOT NULL, created_at INTEGER NOT NULL
    );
  `);
  if (
    !db
      .prepare('PRAGMA table_info(orders)')
      .all()
      .some((column) => column.name === 'fulfillment_json')
  ) {
    db.exec(
      `ALTER TABLE orders ADD COLUMN fulfillment_json TEXT NOT NULL DEFAULT '{"type":"delivery","branch":null}'`,
    );
  }
  db.exec('PRAGMA user_version = 2');
  db.prepare('INSERT OR IGNORE INTO settings(id,value) VALUES(1,?)').run(JSON.stringify(defaults));
  if (!db.prepare('SELECT id FROM products LIMIT 1').get()) {
    const id = randomUUID();
    const now = Date.now();
    db.prepare(`INSERT INTO products VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      id,
      'dar-blend-mahawag',
      'توليفة دار البن البرازيلي',
      copy.product.description + ' ' + copy.product.demoNotice,
      'وسط',
      JSON.stringify(['تركي']),
      'محوج',
      JSON.stringify(['تركي ناعم', 'حبوب كاملة']),
      '/images/coffee-tin-studio.webp',
      1,
      1,
      1,
      'units',
      0,
      now,
      now,
    );
    db.prepare('INSERT INTO variants VALUES(?,?,?,?,?,1)').run(randomUUID(), id, 250, 18000, 20);
    db.prepare('INSERT INTO variants VALUES(?,?,?,?,?,1)').run(randomUUID(), id, 500, 34000, 10);
    seedPreviewSada(db);
    seedBlendIngredients(db);
  }
  return db;
}

export function seedBlendIngredients(db) {
  return transaction(db, () => {
    const missing = blendOrigins.filter(
      (origin) => !db.prepare('SELECT id FROM products WHERE slug=?').get(origin.slug),
    );
    if (missing.length && getSettings(db).mode !== 'preview')
      throw new Error('لا يمكن إضافة مكونات تجريبية في وضع البيع الفعلي.');
    const created = [];
    for (const origin of missing) {
      const id = randomUUID();
      const now = Date.now();
      db.prepare('INSERT INTO products VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
        id,
        origin.slug,
        `بن ${origin.name}`,
        `${origin.note} مثال عام قابل للاختلاف حسب الحبوب والتحميص والمعالجة. المنشأ والنوع والأسعار والمخزون بيانات معاينة، وليست قائمة معتمدة لدار البن.`,
        origin.sampleRoast,
        JSON.stringify(['تركي', 'إسبريسو', 'فلتر']),
        'حبوب للتوليف',
        JSON.stringify(['تركي ناعم', 'إسبريسو ناعم', 'فلتر متوسط', 'حبوب كاملة']),
        `/images/beans-${origin.id}.webp`,
        1,
        0,
        1,
        'grams',
        5000,
        now,
        now,
      );
      db.prepare('INSERT INTO variants VALUES(?,?,?,?,?,1)').run(
        randomUUID(),
        id,
        50,
        origin.pricePer100 / 2,
        0,
      );
      created.push(id);
    }
    return {
      created: created.length,
      products: allProducts(db).filter((product) =>
        blendOrigins.some((origin) => origin.slug === product.slug),
      ),
    };
  });
}

// Explicit preview seed: called for a fresh catalog or manually after a backup.
// Existing products, prices, stock and admin edits are never overwritten.
export function seedPreviewSada(db) {
  return transaction(db, () => {
    const existing = db.prepare('SELECT * FROM products WHERE slug=?').get('dar-blend-sada');
    if (existing) return { created: false, product: getProduct(db, existing) };
    if (getSettings(db).mode !== 'preview')
      throw new Error('لا يمكن إضافة منتج المعاينة السادة إلى متجر في وضع البيع الفعلي.');
    const id = randomUUID();
    const now = Date.now();
    db.prepare('INSERT INTO products VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
      id,
      'dar-blend-sada',
      experienceCopy.plainProduct.name,
      experienceCopy.plainProduct.description + ' ' + copy.product.demoNotice,
      'غير محدد',
      JSON.stringify(['تركي']),
      'سادة',
      JSON.stringify(['تركي ناعم', 'حبوب كاملة']),
      '/images/coffee-sada-studio.webp',
      1,
      1,
      1,
      'units',
      0,
      now,
      now,
    );
    db.prepare('INSERT INTO variants VALUES(?,?,?,?,?,1)').run(randomUUID(), id, 250, 18000, 20);
    db.prepare('INSERT INTO variants VALUES(?,?,?,?,?,1)').run(randomUUID(), id, 500, 34000, 10);
    return {
      created: true,
      product: getProduct(db, db.prepare('SELECT * FROM products WHERE id=?').get(id)),
    };
  });
}

export function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
export function getSettings(db) {
  const saved = JSON.parse(db.prepare('SELECT value FROM settings WHERE id=1').get().value);
  return {
    ...defaults,
    ...saved,
    heroVideo:
      saved.heroVideo ?? (saved.heroImage === defaults.heroImage ? defaults.heroVideo : ''),
  };
}
export function getProduct(db, row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    roast: row.roast,
    brew: JSON.parse(row.brew),
    kind: row.kind,
    grinds: JSON.parse(row.grinds),
    image: row.image,
    active: !!row.active,
    featured: !!row.featured,
    demo: !!row.demo,
    stockMode: row.stock_mode,
    stockGrams: row.stock_grams,
    variants: db
      .prepare(
        'SELECT id,weight,price,stock FROM variants WHERE product_id=? AND active=1 ORDER BY weight',
      )
      .all(row.id),
    updatedAt: row.updated_at,
  };
}
export function allProducts(db, publicOnly = false) {
  return db
    .prepare(
      `SELECT * FROM products ${publicOnly ? 'WHERE active=1' : ''} ORDER BY created_at DESC`,
    )
    .all()
    .map((p) => getProduct(db, p));
}
export function orderView(row, privateView = false) {
  if (!row) return null;
  const customer = JSON.parse(row.customer);
  const fulfillment = row.fulfillment_json
    ? JSON.parse(row.fulfillment_json)
    : { type: 'delivery', branch: null };
  return {
    id: privateView ? row.id : undefined,
    token: row.token,
    reference: row.reference,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    fulfillment: fulfillment.type,
    pickupBranch: fulfillment.type === 'pickup' ? fulfillment.branch : null,
    customer: privateView ? customer : { name: customer.name, city: customer.city },
    items: JSON.parse(row.items),
    zone: row.zone,
    eta: row.eta,
    subtotal: row.subtotal,
    shipping: row.shipping,
    total: row.total,
    demo: !!row.demo,
    note: privateView ? row.note : undefined,
    tracking: row.tracking,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
export function audit(db, user, action, entity, details = {}) {
  db.prepare('INSERT INTO audit(admin_id,action,entity,details,created_at) VALUES(?,?,?,?,?)').run(
    user?.id || null,
    action,
    String(entity),
    JSON.stringify(details),
    Date.now(),
  );
}
