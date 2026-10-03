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
  await page.getByRole('link', { name: 'اختار بنّك', exact: true }).click();
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
  await page.getByRole('link', { name: 'بنّك للبيت', exact: true }).click();
  await page.getByLabel('طريقة التحضير', { exact: true }).selectOption('فلتر');
  await expect(page.getByRole('heading', { name: 'لسه ما لقيناش التوليفة دي' })).toBeVisible();
  await page.getByRole('button', { name: 'عرض كل القهوة' }).click();
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
  await page.getByLabel('ابحث عن قهوتك').fill('محوج');
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

test('home separates branch visits from buying beans and explains methods without stock', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('link', { name: 'اعرف فروعنا', exact: true }).click();
  await expect(page).toHaveURL(/\/branches$/);
  await expect(page.locator('.branch-card')).toHaveCount(4);
  await page.goto('/');
  await page
    .locator('.brew-card')
    .filter({ has: page.getByRole('heading', { name: 'إسبريسو', exact: true }) })
    .click();
  await expect(page).toHaveURL(/\/guide\?brew=/);
  await expect(page.getByRole('button', { name: 'إسبريسو', exact: true })).toHaveClass(/selected/);
  await expect(page.getByRole('heading', { name: 'فنجان إسبريسو على طريقتك' })).toBeVisible();
  await page.getByRole('link', { name: 'شوف البن المتاح', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'اختيار توليفة دار البن البرازيلي', exact: true }),
  ).toBeVisible();
});

test('coffee quiz matches available beans, preserves answers, and opens the recommended weight', async ({
  page,
}) => {
  await page.goto('/quiz');
  const next = page.getByRole('button', { name: 'السؤال اللي بعده' });
  await expect(next).toBeDisabled();
  await page.getByRole('radio', { name: /ركوة/ }).check();
  await next.click();
  await page.getByRole('radio', { name: /^سادة/ }).check();
  await page.getByRole('button', { name: 'السؤال اللي قبله' }).click();
  await expect(page.getByRole('radio', { name: /ركوة/ })).toBeChecked();
  await next.click();
  await expect(page.getByRole('radio', { name: /^سادة/ })).toBeChecked();
  await next.click();
  await page.getByRole('radio', { name: /القهوة للّمة/ }).check();
  await page.getByRole('button', { name: 'شوف اختياراتك' }).click();
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
  await page.getByRole('button', { name: 'السؤال اللي بعده' }).click();
  await page.getByRole('radio', { name: /لسه بكتشف/ }).check();
  await page.getByRole('button', { name: 'السؤال اللي بعده' }).click();
  await page.getByRole('radio', { name: /بجرّب التوليفة/ }).check();
  await page.getByRole('button', { name: 'شوف اختياراتك' }).click();
  await expect(page.locator('.quiz-result .product-card')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'لسه مفيش توليفة تجمع اختياراتك' })).toBeVisible();
  await page.getByRole('button', { name: 'جرّب اختيارات تانية' }).click();
  await expect(page.getByRole('button', { name: 'السؤال اللي بعده' })).toBeDisabled();
  await page.goto('/learn');
  await expect(page.locator('.recipe-card')).toHaveCount(3);
  const recipe = page.locator('.recipe-card').first();
  await recipe.locator('summary').click();
  await expect(recipe.locator('details')).toHaveAttribute('open', '');
  await expect(recipe.getByRole('list')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/branches');
  await expect(page.locator('.branch-drink-card')).toHaveCount(3);
  await expect(page.locator('.branch-drink-card .product-select')).toHaveCount(0);
});
