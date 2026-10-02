import { randomBytes, randomUUID } from 'node:crypto';
import { allProducts, getProduct, getSettings, orderView, transaction, audit } from './db.mjs';
import { digest } from './auth.mjs';
import { HttpError } from './schemas.mjs';

export function launchChecks(db, settings) {
  const products = allProducts(db).filter((p) => p.active);
  return [
    {
      label: 'منتج نشط واحد على الأقل ببيانات معتمدة',
      ok: products.length > 0 && products.every((p) => !p.demo),
    },
    {
      label: 'منطقة شحن فعلية واحدة على الأقل',
      ok: settings.shippingZones.some(
        (z) => z.enabled && z.id !== 'demo-zone' && !z.name.includes('تجريب'),
      ),
    },
    {
      label: 'وسيلة تواصل وسياسات الشحن والاستبدال والخصوصية',
      ok: !!(
        settings.contactPhone &&
        settings.shippingPolicy &&
        settings.returnsPolicy &&
        settings.privacyPolicy
      ),
    },
    { label: 'طريقة دفع مفعلة', ok: settings.codEnabled },
  ];
}

export function saveProduct(db, id, product, user) {
  return transaction(db, () => {
    const prior = db.prepare('SELECT * FROM products WHERE id=?').get(id);
    const now = Math.max(Date.now(), (prior?.updated_at || 0) + 1);
    if (prior && product.updatedAt !== prior.updated_at)
      throw new HttpError(
        409,
        'المنتج أو المخزون اتغير منذ فتح الصفحة. حدّث الصفحة وراجع البيانات قبل الحفظ.',
      );
    if (getSettings(db).mode === 'live' && product.active && product.demo)
      throw new HttpError(400, 'لا يمكن نشر بيانات تجريبية في متجر يستقبل طلبات فعلية.');
    if (
      product.variants.some(
        (v) =>
          v.id && !db.prepare('SELECT id FROM variants WHERE id=? AND product_id=?').get(v.id, id),
      )
    )
      throw new HttpError(400, 'وزن لا يتبع هذا المنتج.');
    db.prepare(
      `INSERT INTO products VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
      slug=excluded.slug,name=excluded.name,description=excluded.description,roast=excluded.roast,brew=excluded.brew,kind=excluded.kind,grinds=excluded.grinds,
      image=excluded.image,active=excluded.active,featured=excluded.featured,demo=excluded.demo,stock_mode=excluded.stock_mode,stock_grams=excluded.stock_grams,updated_at=excluded.updated_at`,
    ).run(
      id,
      product.slug,
      product.name,
      product.description,
      product.roast,
      JSON.stringify(product.brew),
      product.kind,
      JSON.stringify(product.grinds),
      product.image,
      Number(product.active),
      Number(product.featured),
      Number(product.demo),
      product.stockMode,
      product.stockGrams,
      prior?.created_at || now,
      now,
    );
    db.prepare('UPDATE variants SET active=0 WHERE product_id=?').run(id);
    for (const v of product.variants) {
      const old = v.id
        ? db.prepare('SELECT * FROM variants WHERE id=? AND product_id=?').get(v.id, id)
        : db.prepare('SELECT * FROM variants WHERE product_id=? AND weight=?').get(id, v.weight);
      if (old && old.weight !== v.weight)
        throw new HttpError(400, 'للتغيير إلى وزن مختلف، احذف صف الوزن القديم وأضف صفًا جديدًا.');
      db.prepare(
        'INSERT INTO variants VALUES(?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET price=excluded.price,stock=excluded.stock,active=1',
      ).run(old?.id || randomUUID(), id, v.weight, v.price, v.stock);
    }
    audit(db, user, prior ? 'product.updated' : 'product.created', id, { name: product.name });
    return getProduct(db, db.prepare('SELECT * FROM products WHERE id=?').get(id));
  });
}

export function placeOrder(db, input) {
  const hash = digest(JSON.stringify(input));
  return transaction(db, () => {
    const existing = db
      .prepare('SELECT * FROM orders WHERE idempotency_key=?')
      .get(input.idempotencyKey);
    if (existing) {
      if (existing.request_hash !== hash)
        throw new HttpError(409, 'تم استخدام مفتاح الطلب لبيانات مختلفة. ابدأ طلبًا جديدًا.');
      return { order: orderView(existing), repeated: true };
    }
    const settings = getSettings(db);
    const zone = settings.shippingZones.find((z) => z.id === input.zoneId && z.enabled);
    if (!zone) throw new HttpError(400, 'اختر منطقة توصيل متاحة.');
    if (!settings.codEnabled) throw new HttpError(400, 'الدفع عند الاستلام غير متاح حاليًا.');
    if (settings.mode === 'live' && !launchChecks(db, settings).every((c) => c.ok))
      throw new HttpError(503, 'استقبال الطلبات متوقف مؤقتًا.');
    if (settings.mode === 'live' && (zone.id === 'demo-zone' || zone.name.includes('تجريب')))
      throw new HttpError(400, 'منطقة الشحن تجريبية وغير متاحة للطلبات الفعلية.');
    const items = [];
    let subtotal = 0;
    for (const line of input.items) {
      const product = getProduct(
        db,
        db.prepare('SELECT * FROM products WHERE id=? AND active=1').get(line.productId),
      );
      const variant = product?.variants.find((v) => v.id === line.variantId);
      if (!product || !variant || (settings.mode === 'live' && product.demo))
        throw new HttpError(409, 'أحد المنتجات لم يعد متاحًا. راجع السلة.');
      if (!product.grinds.includes(line.grind))
        throw new HttpError(400, 'اختر طحنة متاحة لهذا المنتج.');
      // Each deduction runs inside the same transaction, including repeated lines with different grinds.
      const amount = product.stockMode === 'grams' ? variant.weight * line.quantity : line.quantity;
      const changed =
        product.stockMode === 'grams'
          ? db
              .prepare(
                'UPDATE products SET stock_grams=stock_grams-? WHERE id=? AND stock_grams>=?',
              )
              .run(amount, product.id, amount)
          : db
              .prepare('UPDATE variants SET stock=stock-? WHERE id=? AND active=1 AND stock>=?')
              .run(amount, variant.id, amount);
      if (!changed.changes)
        throw new HttpError(409, `الكمية المطلوبة غير متاحة من ${product.name}.`);
      db.prepare('UPDATE products SET updated_at=MAX(updated_at+1,?) WHERE id=?').run(
        Date.now(),
        product.id,
      );
      const total = variant.price * line.quantity;
      subtotal += total;
      items.push({
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        slug: product.slug,
        image: product.image,
        weight: variant.weight,
        price: variant.price,
        grind: line.grind,
        quantity: line.quantity,
        total,
        stockMode: product.stockMode,
      });
    }
    if (input.expectedTotal !== undefined && input.expectedTotal !== subtotal + zone.fee)
      throw new HttpError(
        409,
        'السعر أو تكلفة الشحن اتغيرت. راجع الإجمالي المحدّث وأكد الطلب مرة أخرى.',
      );
    const now = Date.now();
    const token = randomBytes(32).toString('hex');
    const reference = `DB-${new Date(now).toISOString().slice(2, 10).replaceAll('-', '')}-${randomBytes(4).toString('hex').toUpperCase()}`;
    const result = db
      .prepare(
        `INSERT INTO orders(token,reference,idempotency_key,request_hash,status,payment_status,payment_method,customer,items,zone,eta,subtotal,shipping,total,demo,created_at,updated_at)
      VALUES(?,?,?,?,'new','unpaid',?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        token,
        reference,
        input.idempotencyKey,
        hash,
        input.paymentMethod,
        JSON.stringify(input.customer),
        JSON.stringify(items),
        zone.name,
        zone.eta,
        subtotal,
        zone.fee,
        subtotal + zone.fee,
        Number(settings.mode !== 'live'),
        now,
        now,
      );
    return {
      order: orderView(db.prepare('SELECT * FROM orders WHERE id=?').get(result.lastInsertRowid)),
      repeated: false,
    };
  });
}

export const transitions = {
  new: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};
export function updateOrder(db, id, patch, user) {
  return transaction(db, () => {
    const row = db.prepare('SELECT * FROM orders WHERE id=?').get(id);
    if (!row) throw new HttpError(404, 'الطلب غير موجود.');
    const status = patch.status || row.status;
    const payment = patch.paymentStatus || row.payment_status;
    if (status !== row.status && !transitions[row.status].includes(status))
      throw new HttpError(409, 'انتقال حالة الطلب غير متاح.');
    if (
      payment !== row.payment_status &&
      !(row.payment_status === 'unpaid' && payment === 'paid') &&
      !(row.payment_status === 'paid' && payment === 'refunded')
    )
      throw new HttpError(409, 'انتقال حالة الدفع غير متاح.');
    if (status === 'cancelled' && payment === 'paid')
      throw new HttpError(400, 'سجل رد المبلغ أولًا قبل إلغاء طلب مدفوع.');
    if (status === 'cancelled' && row.status !== 'cancelled') {
      for (const item of JSON.parse(row.items)) {
        // Return to the inventory model captured at purchase, even if the product was edited later.
        if (item.stockMode === 'grams')
          db.prepare('UPDATE products SET stock_grams=stock_grams+? WHERE id=?').run(
            item.weight * item.quantity,
            item.productId,
          );
        else
          db.prepare('UPDATE variants SET stock=stock+? WHERE id=?').run(
            item.quantity,
            item.variantId,
          );
        db.prepare('UPDATE products SET updated_at=MAX(updated_at+1,?) WHERE id=?').run(
          Date.now(),
          item.productId,
        );
      }
    }
    db.prepare(
      'UPDATE orders SET status=?,payment_status=?,note=?,tracking=?,updated_at=? WHERE id=?',
    ).run(status, payment, patch.note ?? row.note, patch.tracking ?? row.tracking, Date.now(), id);
    audit(db, user, 'order.updated', id, { from: row.status, to: status, payment });
    return orderView(db.prepare('SELECT * FROM orders WHERE id=?').get(id), true);
  });
}
