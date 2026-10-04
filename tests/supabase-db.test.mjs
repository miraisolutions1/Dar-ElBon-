import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
const container = process.env.SUPABASE_TEST_CONTAINER;
const enabled = Boolean(container && /^dar-supabase-[a-z0-9-]+$/.test(container));
const database = 'dar_supabase_validation';
const owner = '00000000-0000-4000-8000-000000000001',
  manager = '00000000-0000-4000-8000-000000000002',
  stranger = '00000000-0000-4000-8000-000000000003';
function sql(text, db = database) {
  return execFileSync(
    'docker',
    ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', '-Atq'],
    { input: text, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
  ).trim();
}
const literal = (v) => `'${JSON.stringify(v).replaceAll("'", "''")}'::jsonb`;
const as = (role, uid, statement) =>
  `SET ROLE ${role}; SELECT set_config('request.jwt.claim.sub','${uid || ''}',false); ${statement}`;
const rpc = (name, body, role = 'anon', uid = '') =>
  JSON.parse(
    sql(as(role, uid, `SELECT public.${name}(${literal(body)});`))
      .split('\n')
      .at(-1),
  );
let catalog, base, ingredients, body;
before(() => {
  if (!enabled) return;
  sql(`DROP DATABASE IF EXISTS ${database}; CREATE DATABASE ${database};`, 'postgres');
  sql(
    `CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text); ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; GRANT USAGE ON SCHEMA public,auth,storage TO anon,authenticated; GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO anon,authenticated;`,
  );
  sql(readFileSync('supabase/migrations/001_dar_store.sql', 'utf8'));
  sql(readFileSync('supabase/seed.sql', 'utf8'));
  sql(
    `INSERT INTO auth.users VALUES('${owner}','owner@example.invalid'),('${manager}','manager@example.invalid'),('${stranger}','stranger@example.invalid'); INSERT INTO public.dar_admin_profiles(user_id,name,role) VALUES('${owner}','Test Owner','owner'),('${manager}','Test Manager','manager');`,
  );
  catalog = JSON.parse(sql('SELECT public.dar_store();'));
  base = catalog.products.find((p) => p.slug === 'dar-blend-mahawag');
  ingredients = ['brazil', 'colombia', 'ethiopia'].map((id) =>
    catalog.products.find((p) => p.slug === `blend-origin-${id}`),
  );
  body = () => ({
    idempotencyKey: randomUUID(),
    customer: { name: 'عميل اختبار', phone: '01012345678', notes: '' },
    fulfillment: 'pickup',
    pickupBranchIndex: 1,
    paymentMethod: 'cod',
    expectedTotal: 28000,
    items: [
      {
        type: 'blend',
        components: ingredients.map((p, i) => ({ productId: p.id, grams: [150, 100, 50][i] })),
        grind: 'تركي ناعم',
        quantity: 1,
      },
    ],
  });
});
after(() => {
  if (enabled) sql(`DROP DATABASE ${database} WITH (FORCE);`, 'postgres');
});
const run = (name, fn) => test(name, { skip: !enabled }, fn);
run('Supabase SQL denies direct private table access and non-admin RPC calls', () => {
  for (const role of ['anon', 'authenticated'])
    for (const table of [
      'dar_orders',
      'dar_admin_profiles',
      'dar_products',
      'dar_settings',
      'dar_audit',
    ])
      assert.throws(
        () => sql(as(role, stranger, `SELECT * FROM public.${table};`)),
        /permission denied/,
      );
  assert.throws(
    () => sql(as('anon', '', `SELECT public.dar_admin('me','{}');`)),
    /permission denied/,
  );
  assert.throws(
    () => sql(as('authenticated', stranger, `SELECT public.dar_admin('me','{}');`)),
    /مصرح/,
  );
  assert.equal(catalog.products.length, 10);
  assert(!JSON.stringify(catalog).includes('owner@example'));
});
run('Supabase SQL admin read screens and repair preserve catalog and permissions', () => {
  const readAdmin = (action) =>
    JSON.parse(
      sql(as('authenticated', owner, `SELECT public.dar_admin('${action}','{}');`))
        .split('\n')
        .at(-1),
    );
  const before = JSON.parse(sql('SELECT public.dar_store();'));
  sql(readFileSync('supabase/fix-admin-queries.sql', 'utf8'));
  assert.deepEqual(JSON.parse(sql('SELECT public.dar_store();')), before);
  const dashboard = readAdmin('GET /admin/dashboard');
  assert.equal(dashboard.stats.products, 10);
  assert.equal(dashboard.stats.orders, 0);
  assert(Array.isArray(dashboard.lowStock));
  assert.equal(readAdmin('GET /admin/products').length, 10);
  assert.equal(readAdmin('GET /admin/settings').mode, 'preview');
  assert.deepEqual(readAdmin('GET /admin/orders').orders, []);
  assert.equal(readAdmin('GET /admin/users').length, 2);
  assert.deepEqual(readAdmin('GET /admin/audit'), []);
  assert.throws(
    () =>
      sql(as('authenticated', stranger, "SELECT public.dar_admin('GET /admin/dashboard','{}');")),
    /مصرح/,
  );
});
run(
  'Supabase SQL canonical blends persist, redact tracking, replay once and snapshot pickup branch',
  () => {
    const input = body(),
      order = rpc('dar_place_order', input);
    assert.equal(order.total, 28000);
    assert.equal(order.items[0].weight, 300);
    assert.equal(order.pickupBranch.name, 'مدينة نصر');
    assert.equal(order.customer.phone, undefined);
    assert.equal(order.customer.address, undefined);
    assert.equal(order.note, undefined);
    assert.match(order.token, /^[a-f0-9]{64}$/);
    assert.equal(rpc('dar_place_order', input).token, order.token);
    assert.throws(() => rpc('dar_place_order', { ...input, expectedTotal: 1 }), /مفتاح الطلب/);
    for (let i = 0; i < 3; i++)
      assert.equal(
        Number(
          sql(
            `SELECT (data->>'stockGrams')::integer FROM public.dar_products WHERE id='${ingredients[i].id}';`,
          ),
        ),
        5000 - [150, 100, 50][i],
      );
    const tracked = JSON.parse(
      sql(`SET ROLE anon; SELECT public.dar_track_order('${order.token}');`),
    );
    assert.equal(tracked.reference, order.reference);
    const saved = JSON.parse(
      sql(
        as(
          'authenticated',
          owner,
          `SELECT public.dar_admin('GET /admin/orders/${sql(`SELECT id FROM public.dar_orders WHERE token='${order.token}';`)}','{}');`,
        ),
      )
        .split('\n')
        .at(-1),
    );
    assert.equal(saved.customer.phone, input.customer.phone);
    assert.equal(saved.items[0].components.length, 3);
  },
);
run(
  'Supabase SQL rejects total tampering and shared ingredient overselling without partial writes',
  () => {
    const input = body();
    const before = sql(
      `SELECT data->>'stockGrams' FROM public.dar_products WHERE id='${ingredients[0].id}';`,
    );
    const count = sql('SELECT count(*) FROM public.dar_orders;');
    assert.throws(() => rpc('dar_place_order', { ...input, expectedTotal: 1 }), /السعر/);
    assert.equal(sql('SELECT count(*) FROM public.dar_orders;'), count);
    assert.equal(
      sql(`SELECT data->>'stockGrams' FROM public.dar_products WHERE id='${ingredients[0].id}';`),
      before,
    );
    assert.throws(
      () =>
        rpc('dar_place_order', {
          ...input,
          expectedTotal: undefined,
          items: [
            {
              productId: ingredients[0].id,
              variantId: ingredients[0].variants[0].id,
              grind: 'تركي ناعم',
              quantity: 30,
            },
            {
              type: 'blend',
              components: [{ productId: ingredients[0].id, grams: 1000 }],
              grind: 'تركي ناعم',
              quantity: 4,
            },
          ],
        }),
      /مخزون/,
    );
    assert.equal(
      sql(`SELECT data->>'stockGrams' FROM public.dar_products WHERE id='${ingredients[0].id}';`),
      before,
    );
  },
);
run(
  'Supabase SQL manager can edit price, owner-only settings stay protected and stale edits fail',
  () => {
    const p = JSON.parse(sql(`SELECT data FROM public.dar_products WHERE id='${base.id}';`));
    const edited = {
      ...p,
      variants: p.variants.map((v, i) => ({ ...v, price: i === 0 ? 20100 : v.price })),
    };
    const saved = JSON.parse(
      sql(
        as(
          'authenticated',
          manager,
          `SELECT public.dar_admin('PUT /admin/products/${p.id}',${literal(edited)});`,
        ),
      )
        .split('\n')
        .at(-1),
    );
    assert.equal(saved.variants[0].price, 20100);
    assert.throws(
      () =>
        sql(
          as(
            'authenticated',
            manager,
            `SELECT public.dar_admin('PUT /admin/settings',${literal(catalog.settings)});`,
          ),
        ),
      /مالك/,
    );
    assert.throws(
      () => sql(as('authenticated', manager, `SELECT public.dar_admin('GET /admin/users','{}');`)),
      /مالك/,
    );
    assert.throws(
      () =>
        sql(
          as(
            'authenticated',
            owner,
            `SELECT public.dar_admin('PUT /admin/products/${p.id}',${literal(edited)});`,
          ),
        ),
      /اتغير/,
    );
  },
);
run(
  'Supabase SQL cancellation restores every component once and historical removed weights',
  () => {
    const before = ingredients.map((p) =>
      Number(sql(`SELECT data->>'stockGrams' FROM public.dar_products WHERE id='${p.id}';`)),
    );
    const order = rpc('dar_place_order', body());
    const id = sql(`SELECT id FROM public.dar_orders WHERE token='${order.token}';`);
    for (let n = 0; n < 2; n++)
      sql(
        as(
          'authenticated',
          owner,
          `SELECT public.dar_admin('PATCH /admin/orders/${id}','{"status":"cancelled"}');`,
        ),
      );
    ingredients.forEach((p, i) =>
      assert.equal(
        Number(sql(`SELECT data->>'stockGrams' FROM public.dar_products WHERE id='${p.id}';`)),
        before[i],
      ),
    );
    const p = JSON.parse(sql(`SELECT data FROM public.dar_products WHERE id='${base.id}';`)),
      v = p.variants.find((v) => v.weight === 500);
    const normal = rpc('dar_place_order', {
      ...body(),
      expectedTotal: v.price,
      items: [{ productId: p.id, variantId: v.id, quantity: 1, grind: p.grinds[0] }],
    });
    const latest = JSON.parse(sql(`SELECT data FROM public.dar_products WHERE id='${base.id}';`));
    sql(
      as(
        'authenticated',
        owner,
        `SELECT public.dar_admin('PUT /admin/products/${p.id}',${literal({ ...latest, variants: latest.variants.filter((x) => x.id !== v.id) })});`,
      ),
    );
    const normalId = sql(`SELECT id FROM public.dar_orders WHERE token='${normal.token}';`);
    sql(
      as(
        'authenticated',
        owner,
        `SELECT public.dar_admin('PATCH /admin/orders/${normalId}','{"status":"cancelled"}');`,
      ),
    );
    const restored = JSON.parse(sql(`SELECT data FROM public.dar_products WHERE id='${p.id}';`));
    assert.equal(restored.retiredVariants.find((x) => x.id === v.id).stock, v.stock);
    const publicProduct = JSON.parse(sql('SELECT public.dar_store();')).products.find(
      (x) => x.id === p.id,
    );
    assert.equal(publicProduct.retiredVariants, undefined);
  },
);
run(
  'Supabase storage policies permit administrator image writes and reject anonymous or SVG writes',
  () => {
    assert.throws(
      () =>
        sql(
          as(
            'anon',
            '',
            "INSERT INTO storage.objects(bucket_id,name) VALUES('coffee-media','bad.png');",
          ),
        ),
      /row-level security/,
    );
    assert.throws(
      () =>
        sql(
          as(
            'authenticated',
            stranger,
            "INSERT INTO storage.objects(bucket_id,name) VALUES('coffee-media','bad.png');",
          ),
        ),
      /row-level security/,
    );
    assert.throws(
      () =>
        sql(
          as(
            'authenticated',
            owner,
            "INSERT INTO storage.objects(bucket_id,name) VALUES('coffee-media','bad.svg');",
          ),
        ),
      /row-level security/,
    );
    sql(
      as(
        'authenticated',
        owner,
        "INSERT INTO storage.objects(bucket_id,name) VALUES('coffee-media','owner/valid.webp');",
      ),
    );
    assert.equal(sql('SET ROLE anon; SELECT count(*) FROM storage.objects;'), '1');
  },
);

run(
  'Preview package matrix adds canonical roast/kind SKUs once without changing existing data',
  () => {
    const old = sql('SELECT jsonb_agg(data ORDER BY id) FROM public.dar_products;');
    const orders = sql('SELECT jsonb_agg(data ORDER BY id) FROM public.dar_orders;');
    sql(readFileSync('supabase/add-packaged-coffee-options.sql', 'utf8'));
    const products = JSON.parse(sql('SELECT public.dar_store();')).products;
    assert.equal(products.length, JSON.parse(old).length + 11);
    for (const image of ['/images/coffee-tin-studio.webp', '/images/coffee-sada-studio.webp']) {
      const pack = products.filter(
        (p) => p.image === image && ['فاتح', 'وسط', 'غامق'].includes(p.roast),
      );
      assert.equal(pack.length, 6);
      for (const roast of ['فاتح', 'وسط', 'غامق'])
        for (const kind of ['سادة', 'محوج'])
          assert(pack.some((p) => p.roast === roast && p.kind === kind));
    }
    for (const p of JSON.parse(old))
      assert.deepEqual(
        products.find((next) => next.id === p.id),
        (() => {
          const { retiredVariants, ...publicProduct } = p;
          return publicProduct;
        })(),
      );
    assert.equal(sql('SELECT jsonb_agg(data ORDER BY id) FROM public.dar_orders;'), orders);
    sql(readFileSync('supabase/add-packaged-coffee-options.sql', 'utf8'));
    assert.equal(JSON.parse(sql('SELECT public.dar_store();')).products.length, products.length);
    const p = products.find((p) => p.slug === 'dar-package-pouch-dark-spiced');
    const input = {
      idempotencyKey: randomUUID(),
      customer: { name: 'عميل عبوة', phone: '01098765432', notes: '' },
      fulfillment: 'pickup',
      pickupBranchIndex: 1,
      paymentMethod: 'cod',
      expectedTotal: p.variants[0].price,
      items: [{ productId: p.id, variantId: p.variants[0].id, grind: p.grinds[0], quantity: 1 }],
    };
    const order = rpc('dar_place_order', input);
    assert.equal(order.total, p.variants[0].price);
    assert(order.items[0].name.includes('محوج'));
    assert(order.items[0].name.includes('غامق'));
  },
);
