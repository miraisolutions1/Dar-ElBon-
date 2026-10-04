import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import sharp from 'sharp';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID, randomBytes } from 'node:crypto';
import { z } from 'zod';
import {
  openDatabase,
  getSettings,
  allProducts,
  getProduct,
  orderView,
  audit,
  transaction,
} from './db.mjs';
import {
  sessionUser,
  verifyPassword,
  hashPassword,
  issueSession,
  digest,
  cookieOptions,
  createAdmin,
} from './auth.mjs';
import {
  HttpError,
  parse,
  productSchema,
  settingsSchema,
  orderSchema,
  orderUpdateSchema,
} from './schemas.mjs';
import { saveProduct, placeOrder, updateOrder, launchChecks } from './store.mjs';

export function createApp({
  db = openDatabase(),
  dataDir = process.env.DATA_DIR || './data',
  appOrigin = process.env.APP_ORIGIN || 'http://localhost:3000',
  rateLimits = true,
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'img-src': ["'self'", 'data:', 'blob:'],
          'upgrade-insecure-requests': process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );
  app.use(express.json({ limit: '128kb' }));
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.get('origin');
      if ((origin && origin !== appOrigin) || req.get('sec-fetch-site') === 'cross-site')
        return res.status(403).json({ error: 'طلب من مصدر غير مسموح.' });
    }
    next();
  });
  const limited = (max, windowMs) =>
    rateLimits
      ? rateLimit({
          limit: max,
          windowMs,
          standardHeaders: 'draft-7',
          legacyHeaders: false,
          message: { error: 'محاولات كثيرة. حاول مرة أخرى لاحقًا.' },
        })
      : (_req, _res, next) => next();
  const auth = (req, res, next) => {
    req.user = sessionUser(db, req);
    if (!req.user) return res.status(401).json({ error: 'سجل الدخول للمتابعة.' });
    next();
  };
  const owner = (req, res, next) => {
    if (req.user.role !== 'owner')
      return res.status(403).json({ error: 'هذه العملية لمالك المتجر فقط.' });
    next();
  };
  const dummyPassword = hashPassword(randomBytes(24).toString('hex'));
  const uploadDir = resolve(dataDir, 'uploads');
  mkdirSync(uploadDir, { recursive: true, mode: 0o700 });

  app.get('/api/health', (_req, res) =>
    res.json({ status: 'ok', database: !!db.prepare('SELECT 1 AS ok').get().ok }),
  );
  app.get('/api/store', (_req, res) => {
    const settings = getSettings(db);
    res.json({
      settings: {
        ...settings,
        shippingZones: settings.shippingZones.filter(
          (z) =>
            z.enabled &&
            (settings.mode === 'preview' || (z.id !== 'demo-zone' && !z.name.includes('تجريب'))),
        ),
      },
      products: allProducts(db, true).filter((p) => settings.mode === 'preview' || !p.demo),
    });
  });
  app.post('/api/orders', limited(20, 15 * 60 * 1000), (req, res) => {
    const result = placeOrder(db, parse(orderSchema, req.body));
    res.status(result.repeated ? 200 : 201).json(result.order);
  });
  app.get('/api/orders/:token', limited(100, 15 * 60 * 1000), (req, res) => {
    if (!/^[a-f0-9]{64}$/.test(req.params.token)) throw new HttpError(404, 'الطلب غير موجود.');
    const order = orderView(db.prepare('SELECT * FROM orders WHERE token=?').get(req.params.token));
    if (!order) throw new HttpError(404, 'الطلب غير موجود.');
    res.json(order);
  });

  app.post('/api/auth/login', limited(10, 15 * 60 * 1000), async (req, res) => {
    const input = parse(
      z.object({
        username: z.string().trim().min(1).max(40),
        password: z.string().min(1).max(128),
      }),
      req.body,
    );
    const user = db
      .prepare('SELECT * FROM admins WHERE username=?')
      .get(input.username.toLowerCase());
    const valid = await verifyPassword(
      input.password,
      user?.password_hash || (await dummyPassword),
    );
    if (!user || !valid) throw new HttpError(401, 'اسم الدخول أو كلمة المرور غير صحيحة.');
    issueSession(db, user, res);
    audit(db, user, 'auth.login', user.id);
    res.json({ id: user.id, username: user.username, name: user.name, role: user.role });
  });
  app.get('/api/auth/me', auth, (req, res) => res.json(req.user));
  app.post('/api/auth/logout', auth, (req, res) => {
    const raw = (req.headers.cookie || '')
      .split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith('dar_session='))
      ?.slice(12);
    if (raw) db.prepare('DELETE FROM sessions WHERE id=?').run(digest(raw));
    res.clearCookie('dar_session', cookieOptions).json({ ok: true });
  });
  app.post('/api/auth/password', limited(10, 15 * 60 * 1000), auth, async (req, res) => {
    const input = parse(
      z.object({ currentPassword: z.string().max(128), password: z.string().min(12).max(128) }),
      req.body,
    );
    const user = db.prepare('SELECT * FROM admins WHERE id=?').get(req.user.id);
    if (!(await verifyPassword(input.currentPassword, user.password_hash)))
      throw new HttpError(400, 'كلمة المرور الحالية غير صحيحة.');
    const hash = await hashPassword(input.password);
    transaction(db, () => {
      db.prepare('UPDATE admins SET password_hash=? WHERE id=?').run(hash, user.id);
      db.prepare('DELETE FROM sessions WHERE admin_id=?').run(user.id);
      audit(db, req.user, 'auth.password_changed', user.id);
    });
    issueSession(db, user, res);
    res.json({ ok: true });
  });
  app.use('/api/admin', auth);
  app.get('/api/admin/dashboard', (req, res) => {
    const stats = db
      .prepare(
        `SELECT COUNT(*) AS orders,COALESCE(SUM(CASE WHEN status='new' THEN 1 ELSE 0 END),0) AS pending,
      COALESCE(SUM(CASE WHEN status='delivered' AND payment_status='paid' AND demo=0 THEN total ELSE 0 END),0) AS revenue,
      COALESCE(SUM(CASE WHEN demo=1 THEN 1 ELSE 0 END),0) AS demoOrders FROM orders`,
      )
      .get();
    const products = allProducts(db);
    const lowStock = products.filter(
      (p) =>
        p.active &&
        (p.stockMode === 'grams' ? p.stockGrams < 1000 : p.variants.some((v) => v.stock < 5)),
    );
    res.json({
      stats: { ...stats, products: products.filter((p) => p.active).length },
      recentOrders: db
        .prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 6')
        .all()
        .map((o) => orderView(o, true)),
      lowStock,
      checks: launchChecks(db, getSettings(db)),
      mode: getSettings(db).mode,
    });
  });
  app.get('/api/admin/products', (_req, res) => res.json(allProducts(db)));
  app.post('/api/admin/products', (req, res) =>
    res.status(201).json(saveProduct(db, randomUUID(), parse(productSchema, req.body), req.user)),
  );
  app.put('/api/admin/products/:id', (req, res) => {
    if (!db.prepare('SELECT id FROM products WHERE id=?').get(req.params.id))
      throw new HttpError(404, 'المنتج غير موجود.');
    res.json(saveProduct(db, req.params.id, parse(productSchema, req.body), req.user));
  });
  app.get('/api/admin/orders', (req, res) => {
    const input = parse(
      z.object({
        q: z.string().max(100).default(''),
        status: z
          .enum(['', 'new', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'])
          .default(''),
        page: z.coerce.number().int().min(1).max(100000).default(1),
      }),
      req.query,
    );
    const pattern = `%${input.q.replace(/[\\%_]/g, '\\$&')}%`;
    const where =
      "WHERE (reference LIKE ? ESCAPE '\\' OR customer LIKE ? ESCAPE '\\') AND (?='' OR status=?)";
    const params = [pattern, pattern, input.status, input.status];
    const total = db.prepare(`SELECT COUNT(*) AS count FROM orders ${where}`).get(...params).count;
    const rows = db
      .prepare(`SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT 25 OFFSET ?`)
      .all(...params, (input.page - 1) * 25);
    res.json({ orders: rows.map((o) => orderView(o, true)), total, page: input.page });
  });
  app.get('/api/admin/orders/:id', (req, res) => {
    const order = orderView(db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id), true);
    if (!order) throw new HttpError(404, 'الطلب غير موجود.');
    res.json(order);
  });
  app.patch('/api/admin/orders/:id', (req, res) =>
    res.json(updateOrder(db, req.params.id, parse(orderUpdateSchema, req.body), req.user)),
  );
  app.get('/api/admin/settings', (_req, res) => res.json(getSettings(db)));
  app.put('/api/admin/settings', owner, (req, res) => {
    const settings = parse(settingsSchema, req.body);
    if (settings.branches === undefined) settings.branches = getSettings(db).branches;
    if (settings.mode === 'live' && settings.codEnabled) {
      const missing = launchChecks(db, settings).filter((c) => !c.ok);
      if (missing.length)
        throw new HttpError(400, 'قبل تفعيل البيع: ' + missing.map((c) => c.label).join('، '));
    }
    transaction(db, () => {
      db.prepare('UPDATE settings SET value=? WHERE id=1').run(JSON.stringify(settings));
      audit(db, req.user, 'settings.updated', 'store', { mode: settings.mode });
    });
    res.json(settings);
  });
  app.get('/api/admin/users', owner, (_req, res) =>
    res.json(
      db
        .prepare(
          'SELECT id,username,name,role,created_at AS createdAt FROM admins ORDER BY created_at',
        )
        .all(),
    ),
  );
  app.post('/api/admin/users', owner, async (req, res) => {
    const input = parse(
      z.object({
        username: z.string().regex(/^[a-zA-Z0-9._-]{3,40}$/),
        name: z.string().trim().min(2).max(80),
        password: z.string().min(12).max(128),
        role: z.enum(['owner', 'manager']),
      }),
      req.body,
    );
    const id = await createAdmin(db, input);
    audit(db, req.user, 'admin.created', id, { username: input.username, role: input.role });
    res.status(201).json({ id });
  });
  app.delete('/api/admin/users/:id', owner, (req, res) => {
    if (req.params.id === req.user.id)
      throw new HttpError(400, 'لا يمكن حذف حسابك أثناء استخدامه.');
    const changed = db.prepare('DELETE FROM admins WHERE id=?').run(req.params.id);
    if (!changed.changes) throw new HttpError(404, 'المستخدم غير موجود.');
    audit(db, req.user, 'admin.deleted', req.params.id);
    res.json({ ok: true });
  });
  app.get('/api/admin/audit', owner, (_req, res) =>
    res.json(
      db
        .prepare(
          'SELECT a.id,a.action,a.entity,a.details,a.created_at AS createdAt,u.name AS user FROM audit a LEFT JOIN admins u ON a.admin_id=u.id ORDER BY a.created_at DESC LIMIT 100',
        )
        .all()
        .map((a) => ({ ...a, details: JSON.parse(a.details) })),
    ),
  );
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 0 },
  });
  app.post(
    '/api/admin/upload',
    limited(30, 15 * 60 * 1000),
    upload.single('image'),
    async (req, res) => {
      if (!req.file) throw new HttpError(400, 'اختر صورة.');
      try {
        const processor = sharp(req.file.buffer, { limitInputPixels: 24000000, failOn: 'error' });
        const meta = await processor.metadata();
        if (!['jpeg', 'png', 'webp'].includes(meta.format)) throw new Error('Unsupported format');
        const filename = `${randomUUID()}.webp`;
        await processor
          .rotate()
          .resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85 })
          .toFile(resolve(uploadDir, filename));
        audit(db, req.user, 'media.uploaded', filename);
        res.status(201).json({ url: `/uploads/${filename}` });
      } catch {
        throw new HttpError(400, 'الصورة غير صالحة. استخدم JPG أو PNG أو WebP حتى 8 ميجابايت.');
      }
    },
  );
  app.use('/api', (_req, res) => res.status(404).json({ error: 'المسار غير موجود.' }));
  app.use(
    '/uploads',
    express.static(uploadDir, { dotfiles: 'deny', immutable: true, maxAge: '1y' }),
  );
  const dist = resolve('dist');
  if (existsSync(resolve(dist, 'index.html'))) {
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.get('/{*path}', (_req, res) => res.sendFile(resolve(dist, 'index.html')));
  }
  app.use((error, _req, res, _next) => {
    if (error.code === 'LIMIT_FILE_SIZE')
      return res.status(400).json({ error: 'الصورة أكبر من 8 ميجابايت.' });
    if (error.code?.startsWith('LIMIT_'))
      return res.status(400).json({ error: 'ملف الرفع غير صالح.' });
    if (error.type === 'entity.too.large')
      return res.status(413).json({ error: 'البيانات أكبر من الحد المسموح.' });
    if (error instanceof SyntaxError && error.status === 400)
      return res.status(400).json({ error: 'صيغة البيانات غير صالحة.' });
    if (error.code === 'ERR_SQLITE_ERROR' && /UNIQUE constraint/.test(error.message))
      return res.status(409).json({ error: 'اسم الدخول أو رابط المنتج أو الوزن مستخدم بالفعل.' });
    if (!error.status) console.error('Request failed:', error.code || error.name, error.message);
    res
      .status(error.status || 500)
      .json({ error: error.status ? error.message : 'تعذر إتمام العملية. حاول مرة أخرى.' });
  });
  return { app, db };
}
