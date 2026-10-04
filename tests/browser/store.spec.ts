import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

test('desktop purchase persists, appears in admin, and follows fulfillment updates', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /الحكاية/, level: 1 })).toBeVisible();
  await page.screenshot({ path: '.local/screenshots/home-desktop.png', fullPage: true });
  await page.getByRole('link', { name: 'اختار قهوتك', exact: true }).click();
  await expect(page).toHaveURL(/\/shop$/);
  await page.getByRole('link', { name: 'اختيار توليفة دار البن البرازيلي', exact: true }).click();
  await page.getByRole('button', { name: 'أضف للسلة', exact: true }).click();
  await page.getByRole('link', { name: /راجع السلة/ }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'توليفة دار البن البرازيلي' })).toBeVisible();
  await page.getByRole('link', { name: 'كمّل الطلب', exact: true }).click();
  await page.getByLabel('الاسم بالكامل').fill('عميل المتصفح');
  await page.getByLabel('رقم الموبايل').fill('01012345678');
  await page.getByLabel('منطقة الشحن').selectOption('demo-zone');
  await page.getByLabel('المدينة / الحي').fill('مدينة الاختبار');
  await page.getByLabel('العنوان بالتفصيل').fill('شارع الاختبار، مبنى 15، الدور الثاني');
  await page.getByRole('button', { name: 'تأكيد الطلب التجريبي' }).click();
  await expect(page).toHaveURL(/\/order\/[a-f0-9]{64}$/);
  const orderUrl = page.url();
  await expect(page.getByRole('heading', { name: 'اتسجّل طلبك التجريبي.' })).toBeVisible();
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel('اسم الدخول').fill('browser.tester');
  await page.getByLabel('كلمة المرور', { exact: true }).fill('Browser-test-only-3948!');
  await page.getByRole('button', { name: 'دخول لوحة الإدارة' }).click();
  await expect(page.getByRole('heading', { name: 'صباح القهوة ☕' })).toBeVisible();
  await page.screenshot({ path: '.local/screenshots/admin-desktop.png', fullPage: true });
  await page.getByRole('link', { name: /^DB-/ }).first().click();
  await expect(page.getByText('عميل المتصفح', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'حالة الطلب', exact: true }).selectOption('confirmed');
  await page.getByRole('button', { name: 'حفظ التحديثات' }).click();
  await expect(page.getByText('تم تحديث الطلب.')).toBeVisible();
  await page.goto(orderUrl);
  await expect(page.getByText('مؤكد', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('mobile browsing, filters and cart remain usable without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('heading', { name: /الحكاية/, level: 1 })).toBeVisible();
  const checkOverflow = async () =>
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  await checkOverflow();
  await page.screenshot({ path: '.local/screenshots/home-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'فتح القائمة' }).click();
  await page.getByRole('link', { name: 'المتجر', exact: true }).click();
  await page.getByLabel('طريقة التحضير', { exact: true }).selectOption('فلتر');
  await expect(page.locator('.product-grid .product-card')).toHaveCount(8);
  await expect(page.getByRole('link', { name: /^اختيار (بن )?برازيلي$/ })).toBeVisible();
  await page.getByLabel('طريقة التحضير', { exact: true }).selectOption('');
  await page.getByRole('link', { name: 'اختيار توليفة دار البن البرازيلي', exact: true }).click();
  await page.getByRole('button', { name: '500 جم', exact: true }).click();
  await page.getByLabel('الطحنة المناسبة').selectOption('حبوب كاملة');
  await page.getByRole('button', { name: 'أضف للسلة', exact: true }).click();
  await checkOverflow();
  await page.getByRole('link', { name: /راجع السلة/ }).click();
  await checkOverflow();
  await expect(page.getByText('500 جم · حبوب كاملة')).toBeVisible();
  await page.getByRole('button', { name: 'إزالة من السلة' }).click();
  await expect(page.getByRole('heading', { name: 'السلة مستنية قهوتك' })).toBeVisible();
});

test('admin updates product pricing and content and mobile admin navigation works', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/admin/login');
  await page.getByLabel('اسم الدخول').fill('browser.tester');
  await page.getByLabel('كلمة المرور', { exact: true }).fill('Browser-test-only-3948!');
  await page.getByRole('button', { name: 'دخول لوحة الإدارة' }).click();
  await page.getByRole('link', { name: 'المنتجات', exact: true }).click();
  await page.getByRole('link', { name: 'تعديل توليفة دار البن البرازيلي' }).click();
  await page.getByLabel('السعر (ج.م)', { exact: true }).first().fill('199');
  await page.getByRole('button', { name: 'حفظ المنتج' }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
  await page.getByRole('link', { name: 'محتوى الرئيسية', exact: true }).click();
  await page.getByLabel('العنوان الرئيسي').fill('قهوة على مزاجك، كل يوم.');
  await page
    .getByRole('textbox', { name: 'عنوان الفرع', exact: true })
    .first()
    .fill('عنوان الفرع من اختبار المتصفح');
  await page.getByRole('button', { name: 'حفظ التغييرات' }).click();
  await expect(page.getByText('تم حفظ الإعدادات وتحديث المتجر.')).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'قهوة على مزاجك، كل يوم.' })).toBeVisible();
  await expect(page.getByText('عنوان الفرع من اختبار المتصفح', { exact: true })).toBeVisible();
  await page.goto('/products/dar-blend-mahawag');
  await expect(page.locator('.detail-price')).toContainText('١٩٩');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin');
  await page.getByRole('button', { name: 'قائمة الإدارة' }).click();
  await page.getByRole('link', { name: 'الطلبات', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'الطلبات', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.local/screenshots/admin-mobile.png', fullPage: true });
});

test('homepage weight choice survives reload and adds the selected weight to cart', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('link', { name: 'اختيار توليفة دار البن البرازيلي — 500 جم', exact: true })
    .click();
  await expect(page).toHaveURL(/variant=/);
  await page.reload();
  await expect(page.getByRole('button', { name: '500 جم', exact: true })).toHaveClass(/selected/);
  await page.getByRole('button', { name: 'أضف للسلة', exact: true }).click();
  await page.getByRole('link', { name: /راجع السلة/ }).click();
  await expect(page.getByText('500 جم · تركي ناعم')).toBeVisible();
});

test('header search and mobile navigation keep the active panel consistent', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.locator('.site-header .brand-logo')).toBeVisible();
  expect(
    await page
      .locator('.site-header .brand-logo')
      .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
  ).toBe(true);
  await expect(page.locator('.preview-bar')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'إدارة المتجر' })).toHaveCount(0);
  await expect(page.locator('.developer-credit')).toContainText('Mirai Solutions');
  await page.getByRole('button', { name: 'البحث في القهوة' }).click();
  await page.getByLabel('كلمة البحث').fill('محوج');
  await page.getByRole('button', { name: 'بحث', exact: true }).click();
  await expect(page).toHaveURL(/shop\?q=/);
  await expect(
    page.getByRole('link', { name: 'اختيار توليفة دار البن البرازيلي', exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'فتح القائمة' }).click();
  await expect(page.getByRole('navigation', { name: 'القائمة الرئيسية' })).toBeVisible();
  await page.getByRole('button', { name: 'البحث في القهوة' }).click();
  await expect(page.getByRole('navigation', { name: 'القائمة الرئيسية' })).toBeHidden();
  await page.getByLabel('كلمة البحث').fill('تركي');
  await page.getByRole('button', { name: 'بحث', exact: true }).click();
  await expect(page.getByLabel('كلمة البحث')).toHaveCount(0);
  await page.getByRole('button', { name: 'فتح القائمة' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'فتح القائمة' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
});

test('home separates branch visits from buying beans and opens the beans for a preparation method', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('.hero-secondary').click();
  await expect(page).toHaveURL(/\/branches$/);
  await expect(page.locator('.branch-card')).toHaveCount(4);
  await page.goto('/');
  await page
    .locator('.brew-card')
    .filter({ has: page.getByRole('heading', { name: 'إسبريسو', exact: true }) })
    .click();
  await expect(page).toHaveURL(/\/shop\?brew=/);
  await expect(page.getByLabel('طريقة التحضير', { exact: true })).toHaveValue('إسبريسو');
  await expect(page.getByRole('link', { name: /^اختيار (بن )?برازيلي$/ })).toBeVisible();
});

test('coffee quiz matches available beans, preserves answers, and opens the recommended weight', async ({
  page,
}) => {
  await page.goto('/quiz');
  const next = page.getByRole('button', { name: 'التالي' });
  await expect(next).toBeDisabled();
  await page.getByRole('radio', { name: /كنكة/ }).check();
  await next.click();
  await page.getByRole('radio', { name: /^سادة/ }).check();
  await page.getByRole('button', { name: 'رجوع' }).click();
  await expect(page.getByRole('radio', { name: /كنكة/ })).toBeChecked();
  await next.click();
  await expect(page.getByRole('radio', { name: /^سادة/ })).toBeChecked();
  await next.click();
  await page.getByRole('radio', { name: /القهوة للّمة/ }).check();
  await page.getByRole('button', { name: 'شوف الترشيح' }).click();
  await expect(page.locator('.quiz-result .product-card')).toHaveCount(1);
  await expect(page.locator('.quiz-result')).toContainText('سادة');
  await page.getByRole('link', { name: /اختيار بن دار البن البرازيلي — سادة — 500 جم/ }).click();
  await expect(page).toHaveURL(/dar-blend-sada\?variant=/);
  await expect(page.getByRole('button', { name: '500 جم', exact: true })).toHaveClass(/selected/);
});

test('unavailable quiz method has no false recommendation and preparation cards work on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/quiz');
  await page.getByRole('radio', { name: /ماكينة إسبريسو/ }).check();
  await page.getByRole('button', { name: 'التالي' }).click();
  await page.getByRole('radio', { name: /^سادة/ }).check();
  await page.getByRole('button', { name: 'التالي' }).click();
  await page.getByRole('radio', { name: /بجرّب التوليفة/ }).check();
  await page.getByRole('button', { name: 'شوف الترشيح' }).click();
  await expect(page.locator('.quiz-result .product-card')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'لسه مفيش توليفة تجمع اختياراتك' })).toBeVisible();
  await page.getByRole('button', { name: 'ابدأ من جديد' }).click();
  await expect(page.getByRole('button', { name: 'التالي' })).toBeDisabled();
  await page.goto('/learn');
  await expect(page.locator('.recipe-card')).toHaveCount(3);
  const recipe = page.locator('.recipe-card').first();
  await recipe.locator('summary').click();
  await expect(recipe.locator('details')).toHaveAttribute('open', '');
  await expect(recipe.getByRole('list')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/branches');
  await expect(page.locator('.drinks-menu-card')).toHaveCount(8);
  await expect(page.locator('.drinks-menu-card .product-select')).toHaveCount(0);
});

test('quiz groups the question, selected answer, and stable navigation on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/quiz');
  await expect(page.getByRole('heading', { level: 1, name: 'إيه فنجانك النهارده؟' })).toBeVisible();
  const next = page.getByRole('button', { name: 'التالي', exact: true });
  const initial = await next.boundingBox();
  expect(initial!.y + initial!.height).toBeLessThanOrEqual(844);
  await page.getByRole('radio', { name: /كنكة/ }).check();
  await next.click();
  await expect(page.locator('.quiz-answer-chip')).toContainText('كنكة');
  const after = await next.boundingBox();
  expect(Math.abs(after!.y - initial!.y)).toBeLessThan(45);
  await expect(page.getByRole('button', { name: 'رجوع', exact: true })).toBeVisible();
  await expect(page.locator('.quiz-stepper [aria-current="step"]')).toContainText('نوع البن');
});

test('blend calculator updates weight, price, shares, and saves a preview without creating an order', async ({
  page,
}) => {
  await page.goto('/shop');
  await page.locator('.blend-shop-banner').click();
  await expect(page).toHaveURL(/\/blend$/);
  await expect(
    page.getByRole('heading', { name: 'كوّن توليفتك', exact: true, level: 1 }),
  ).toBeVisible();
  const quantity = (name: string) => page.getByRole('spinbutton', { name: `كمية ${name} بالجرام` });
  await expect(quantity('برازيلي')).toHaveValue('150');
  await page.getByRole('button', { name: 'زيادة كمية البن إثيوبي 50 جم' }).click();
  await expect(quantity('إثيوبي')).toHaveValue('50');
  await expect(page.locator('.bb-totals')).toContainText('300');
  await expect(page.locator('.bb-totals')).toContainText('٢٨٠');
  await page.getByRole('button', { name: /^احفظ/ }).click();
  await expect(page.getByRole('status')).toContainText('اتحفظت');
  const recipe = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('dar-coffee-preview-blend')!),
  );
  expect(recipe.amounts).toEqual({
    brazil: 150,
    colombia: 100,
    ethiopia: 50,
    guatemala: 0,
    kenya: 0,
    indonesia: 0,
    yemen: 0,
    india: 0,
  });
  await page.reload();
  await page.getByRole('button', { name: 'حمّل الوصفة المحفوظة' }).click();
  await expect(quantity('إثيوبي')).toHaveValue('50');
  for (const name of ['برازيلي', 'كولومبي', 'إثيوبي']) await quantity(name).fill('0');
  await quantity('إثيوبي').blur();
  await expect(page.getByRole('button', { name: /^احفظ/ })).toBeDisabled();
  await expect(page.locator('.bb-empty')).toBeVisible();
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('pickup checkout stores the selected branch and shows it in the secure admin account', async ({
  page,
}) => {
  await page.goto('/shop');
  await page.getByRole('link', { name: 'اختيار توليفة دار البن البرازيلي', exact: true }).click();
  await page.getByRole('button', { name: 'أضف للسلة', exact: true }).click();
  await page.getByRole('link', { name: /راجع السلة/ }).click();
  await page.getByRole('link', { name: 'كمّل الطلب', exact: true }).click();
  await page.getByRole('radio', { name: 'استلام من الفرع', exact: true }).check();
  await expect(page.getByLabel('العنوان بالتفصيل')).toHaveCount(0);
  await page.getByLabel('الاسم بالكامل').fill('عميل استلام الفرع');
  await page.getByLabel('رقم الموبايل').fill('01012345678');
  await page.getByLabel('فرع الاستلام').selectOption('1');
  await page.getByRole('button', { name: 'تأكيد الطلب التجريبي' }).click();
  await expect(page).toHaveURL(/\/order\/[a-f0-9]{64}$/);
  await expect(page.locator('.pickup-confirmation')).toContainText('مدينة نصر');
  const reference = await page.locator('.order-success strong').textContent();
  await page.goto('/admin/login');
  await page.getByLabel('اسم الدخول').fill('browser.tester');
  await page.getByLabel('كلمة المرور', { exact: true }).fill('Browser-test-only-3948!');
  await page.getByRole('button', { name: 'دخول لوحة الإدارة' }).click();
  await page.getByRole('link', { name: reference!.trim(), exact: true }).click();
  await expect(page.getByRole('heading', { name: /الاستلام من فرع.*مدينة نصر/ })).toBeVisible();
  await expect(page.getByText('شارع الطيران، بجوار كوك دور', { exact: true })).toBeVisible();
});

test('hero motion can be paused and respects the reduced-motion preference', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.hero-motion')).toBeVisible();
  await page.getByRole('button', { name: 'إيقاف حركة الصورة' }).click();
  await expect(page.getByRole('button', { name: 'تشغيل حركة الصورة' })).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.hero-motion')).toHaveCount(0);
});

test('custom blend survives a cart reload and stores every ingredient in the pickup order and admin', async ({
  page,
}) => {
  await page.goto('/blend');
  await expect(page.locator('.bb-origin')).toHaveCount(8);
  await expect(page.getByRole('spinbutton', { name: 'كمية برازيلي بالجرام' })).toHaveValue('150');
  await expect(page.getByRole('spinbutton', { name: 'كمية كولومبي بالجرام' })).toHaveValue('100');
  await page.getByRole('button', { name: 'زيادة كمية البن إثيوبي 50 جم' }).click();
  await page.getByRole('button', { name: 'أضف التوليفة للسلة', exact: true }).click();
  await page.getByRole('link', { name: 'كمّل الطلب', exact: true }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await page.reload();
  const cartItem = page.locator('.cart-item');
  await expect(cartItem.getByRole('heading', { name: 'توليفتك الخاصة' })).toBeVisible();
  await expect(cartItem).toContainText('300 جم');
  for (const ingredient of ['برازيلي 150 جم', 'كولومبي 100 جم', 'إثيوبي 50 جم'])
    await expect(cartItem).toContainText(ingredient);
  await expect(cartItem).toContainText('٢٨٠');
  await page.getByRole('link', { name: 'كمّل الطلب', exact: true }).click();
  await page.getByRole('radio', { name: 'استلام من الفرع', exact: true }).check();
  await page.getByLabel('الاسم بالكامل').fill('عميل التوليفة الخاصة');
  await page.getByLabel('رقم الموبايل').fill('01012345678');
  await page.getByLabel('فرع الاستلام').selectOption('2');
  await page.getByRole('button', { name: 'تأكيد الطلب التجريبي' }).click();
  await expect(page).toHaveURL(/\/order\/[a-f0-9]{64}$/);
  const orderUrl = page.url();
  await expect(page.locator('.pickup-confirmation')).toContainText('المقطم');
  const orderLine = page.locator('.checkout-line').filter({ hasText: 'توليفتك الخاصة' });
  for (const ingredient of ['برازيلي 150 جم', 'كولومبي 100 جم', 'إثيوبي 50 جم'])
    await expect(orderLine).toContainText(ingredient);
  const reference = await page.locator('.order-success strong').textContent();
  await page.reload();
  await expect(page).toHaveURL(orderUrl);
  await expect(orderLine).toContainText('300 جم');
  await page.goto('/admin/login');
  await page.getByLabel('اسم الدخول').fill('browser.tester');
  await page.getByLabel('كلمة المرور', { exact: true }).fill('Browser-test-only-3948!');
  await page.getByRole('button', { name: 'دخول لوحة الإدارة' }).click();
  await page.getByRole('link', { name: reference!.trim(), exact: true }).click();
  await expect(page.getByRole('heading', { name: /الاستلام من فرع.*المقطم/ })).toBeVisible();
  const adminItem = page.locator('.order-item').filter({ hasText: 'توليفتك الخاصة' });
  for (const ingredient of ['برازيلي: 150 جم', 'كولومبي: 100 جم', 'إثيوبي: 50 جم'])
    await expect(adminItem).toContainText(ingredient);
  await expect(adminItem).toContainText('٢٨٠');
});

test('homepage leads with the store, credits link to Mirai, and menu filters hot and cold drinks', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const firstContentSection = await page.locator('.hero').evaluate((hero) => {
    let element = hero.nextElementSibling;
    while (element) {
      const section = element.matches('section') ? element : element.querySelector('section');
      if (section) return section.className;
      element = element.nextElementSibling;
    }
    return '';
  });
  expect(firstContentSection).toContain('home-featured');
  await expect(page.locator('.home-featured h2')).toContainText('متجر دار البن');
  await expect(page.locator('.developer-credit a')).toHaveAttribute(
    'href',
    'https://miraisolutions.net/',
  );
  await expect(page.getByText('بنّك للبيت', { exact: true })).toHaveCount(0);
  await page.goto('/menu');
  await expect(page.locator('.drinks-menu-card')).toHaveCount(8);
  await page.getByRole('button', { name: 'حاجة سخنة', exact: true }).click();
  await expect(page.locator('.drinks-menu-card')).toHaveCount(4);
  await expect(page.getByRole('heading', { name: 'كابتشينو', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'آيس لاتيه', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'حاجة ساقعة', exact: true }).click();
  await expect(page.locator('.drinks-menu-card')).toHaveCount(4);
  await expect(page.getByRole('heading', { name: 'آيس لاتيه', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'كابتشينو', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'كل الاختيارات', exact: true }).click();
  await expect(page.locator('.drinks-menu-card')).toHaveCount(8);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
