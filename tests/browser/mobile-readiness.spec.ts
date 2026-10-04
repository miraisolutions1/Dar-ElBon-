import { test, expect } from '@playwright/test';

test.use({ isMobile: true, hasTouch: true });

async function fitsScreen(page: import('@playwright/test').Page, route: string) {
  await page.goto(route);
  await expect(page.locator('h1:visible, h2:visible').first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const width = await page.evaluate(() => ({
    viewport: innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(width.content, `${route} must fit ${width.viewport}px`).toBeLessThanOrEqual(
    width.viewport,
  );
}

for (const width of [320, 390, 430]) {
  test(`storefront routes and checkout fit a ${width}px touch screen`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const route of [
      '/',
      '/shop',
      '/menu',
      '/blend',
      '/quiz',
      '/learn',
      '/branches',
      '/products/dar-blend-mahawag',
    ]) {
      await fitsScreen(page, route);
    }
    await page.getByRole('button', { name: 'أضف للسلة', exact: true }).click();
    await fitsScreen(page, '/cart');
    await fitsScreen(page, '/checkout');
    await page.getByRole('radio', { name: 'استلام من الفرع', exact: true }).check();
    await expect(page.getByLabel('فرع الاستلام')).toBeVisible();
    await page.screenshot({ path: `.local/screenshots/checkout-${width}.png`, fullPage: true });
    await page.goto('/');
    const menuBounds = await page.getByRole('button', { name: 'فتح القائمة' }).boundingBox();
    expect(menuBounds?.width).toBeGreaterThanOrEqual(44);
    expect(menuBounds?.height).toBeGreaterThanOrEqual(44);
    await page.getByRole('button', { name: 'فتح القائمة' }).click();
    await page.getByRole('link', { name: 'المتجر', exact: true }).click();
    await expect(page).toHaveURL(/\/shop$/);
    await expect(page.getByRole('button', { name: 'فتح القائمة' })).toBeVisible();
  });
}

test('all admin screens fit a small phone and navigation closes after selection', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 320, height: 844 });
  await fitsScreen(page, '/admin/login');
  await page.getByLabel('اسم الدخول').fill('browser.tester');
  await page.getByLabel('كلمة المرور', { exact: true }).fill('Browser-test-only-3948!');
  await page.getByRole('button', { name: 'دخول لوحة الإدارة' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  for (const route of [
    '/admin',
    '/admin/orders',
    '/admin/products',
    '/admin/products/new',
    '/admin/content',
    '/admin/settings',
    '/admin/users',
    '/admin/audit',
    '/admin/account',
  ]) {
    await fitsScreen(page, route);
  }
  await page.goto('/admin/settings');
  await page.screenshot({ path: '.local/screenshots/admin-settings-320.png', fullPage: true });
  await page.getByRole('button', { name: 'قائمة الإدارة' }).click();
  await page.getByRole('link', { name: 'الطلبات', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/orders$/);
  await expect(page.locator('.admin-sidebar')).not.toHaveClass(/open/);
});
