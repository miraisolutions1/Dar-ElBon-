import { test, expect } from '@playwright/test';
let restoreSettings: unknown;
test.afterEach(async ({ page }) => {
  if (restoreSettings) {
    expect(
      (
        await page.request.put('/api/admin/settings', { data: restoreSettings, timeout: 10000 })
      ).ok(),
    ).toBeTruthy();
    restoreSettings = undefined;
  }
});

async function login(page: import('@playwright/test').Page, username = 'browser.tester') {
  await page.goto('/admin/login');
  await page.getByLabel('اسم الدخول').fill(username);
  await page.getByLabel('كلمة المرور', { exact: true }).fill('Browser-test-only-3948!');
  await page.getByRole('button', { name: 'دخول لوحة الإدارة' }).click();
  await expect(page.getByRole('heading', { name: 'صباح القهوة ☕' })).toBeVisible();
}

test('owner CMS changes persist publicly, preserve operations and protect technical identifiers', async ({
  page,
}) => {
  test.setTimeout(60000);
  page.setDefaultTimeout(8000);
  await login(page);
  const original = await (await page.request.get('/api/admin/settings')).json();
  restoreSettings = { ...original, cms: original.cms ?? {} };
  const baseline = {
    ...original,
    heroTitle: 'عنوان افتتاحي محفوظ للاختبار',
    heroSubtitle: 'وصف افتتاحي محفوظ للاختبار',
  };
  expect((await page.request.put('/api/admin/settings', { data: baseline })).ok()).toBeTruthy();
  try {
    await page.goto('/admin/site');
    await expect(
      page.getByRole('heading', { name: 'التحكم في الموقع', exact: true }),
    ).toBeVisible();
    // Simulate an operational edit from another admin page after this CMS form opened.
    baseline.shippingPolicy = 'سياسة شحن محفوظة من تعديل متزامن للاختبار.';
    expect((await page.request.put('/api/admin/settings', { data: baseline })).ok()).toBeTruthy();
    await page.getByLabel('عنوان المتجر').fill('اختيارات القهوة من لوحة التحكم');
    await page.getByRole('button', { name: 'منيو المشروبات', exact: true }).click();
    const firstDrink = page
      .locator('section.panel')
      .filter({ has: page.getByLabel('اسم المشروب') })
      .first();
    const hiddenDrinkName = await firstDrink.getByLabel('اسم المشروب').inputValue();
    await firstDrink.getByLabel('إظهار المشروب في المنيو').uncheck();
    await page.getByRole('button', { name: 'إضافة مشروب', exact: true }).click();
    const newDrink = page
      .locator('section.panel')
      .filter({ has: page.getByLabel('اسم المشروب') })
      .last();
    await newDrink.getByLabel('اسم المشروب').fill('قهوة اختبار المنيو');
    await newDrink.getByLabel('القسم').selectOption('cold');
    await newDrink.getByLabel('الوصف', { exact: true }).fill('وصف مشروب محفوظ من لوحة التحكم.');
    await newDrink.getByLabel('السعر (ج.م)').fill('85.50');
    await newDrink.getByLabel('إظهار المشروب في المنيو').check();
    await page.getByRole('button', { name: 'الهوية والتواصل', exact: true }).click();
    await page.getByLabel('لون البراند والأزرار').fill('#eabc13');
    await page.getByLabel('رابط فيسبوك').fill('https://www.facebook.com/fixturecoffee/');
    await page.getByLabel('رابط إنستجرام').fill('');
    await page.getByRole('button', { name: 'حفظ محتوى الموقع', exact: true }).click();
    await expect(page.getByText('تم حفظ المحتوى وتحديث الموقع.', { exact: true })).toBeVisible();
    const saved = await (await page.request.get('/api/admin/settings')).json();
    for (const key of [
      'heroTitle',
      'heroSubtitle',
      'heroImage',
      'heroVideo',
      'mode',
      'codEnabled',
      'branches',
      'shippingZones',
      'shippingPolicy',
      'returnsPolicy',
      'privacyPolicy',
    ]) {
      expect(saved[key], `CMS preserves ${key}`).toEqual(baseline[key]);
    }
    const newDrinkData = saved.cms.drinks.find(
      (drink: { name: string }) => drink.name === 'قهوة اختبار المنيو',
    );
    expect(newDrinkData.price).toBe(8550);
    expect(newDrinkData.category).toBe('cold');
    await page.reload();
    await expect(page.getByLabel('عنوان المتجر')).toHaveValue('اختيارات القهوة من لوحة التحكم');
    await page.getByRole('button', { name: 'التجربة والدليل', exact: true }).click();
    const experienceBefore = saved.cms.experience;
    const quizEditor = page
      .locator('details')
      .filter({ has: page.locator('summary', { hasText: 'اختبار اختيار القهوة' }) });
    await quizEditor.locator('summary').click();
    await quizEditor
      .getByRole('textbox', { name: 'العنوان', exact: true })
      .first()
      .fill('اختيارات فنجانك من لوحة التحكم');
    // Matching IDs and values are intentionally absent from the text editor.
    await expect(page.getByLabel(/^(id|slug|value)$/)).toHaveCount(0);
    await page.getByRole('button', { name: 'حفظ محتوى الموقع', exact: true }).click();
    await expect(page.getByText('تم حفظ المحتوى وتحديث الموقع.', { exact: true })).toBeVisible();
    const savedExperience = (await (await page.request.get('/api/admin/settings')).json()).cms
      .experience;
    expect(savedExperience.quiz.title).toBe('اختيارات فنجانك من لوحة التحكم');
    expect(savedExperience.quiz.questions).toEqual(experienceBefore.quiz.questions);
    await page.getByRole('button', { name: 'نصوص الموقع', exact: true }).click();
    const faqEditor = page
      .locator('details')
      .filter({ has: page.locator('summary', { hasText: 'الأسئلة الشائعة' }) });
    await faqEditor.locator('summary').click();
    await faqEditor
      .getByRole('textbox', { name: 'العنوان', exact: true })
      .first()
      .fill('إجابات القهوة من لوحة التحكم');
    await page.getByRole('button', { name: 'حفظ محتوى الموقع', exact: true }).click();
    await expect(page.getByText('تم حفظ المحتوى وتحديث الموقع.', { exact: true })).toBeVisible();
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'اختيارات القهوة من لوحة التحكم', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.hero h1')).toHaveText(baseline.heroTitle);
    expect(
      await page
        .locator('.storefront')
        .evaluate((element) => element.style.getPropertyValue('--brand-accent')),
    ).toBe('#eabc13');
    await expect(
      page.locator('.site-footer a[href="https://www.facebook.com/fixturecoffee/"]'),
    ).toBeVisible();
    await expect(page.locator('.site-footer a[href*="instagram.com"]')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'إجابات القهوة من لوحة التحكم', exact: true }),
    ).toBeVisible();
    await page.goto('/quiz');
    await expect(
      page.getByRole('heading', { name: 'اختيارات فنجانك من لوحة التحكم', exact: true }),
    ).toBeVisible();
    await page.goto('/menu');
    await expect(page.getByRole('heading', { name: hiddenDrinkName, exact: true })).toHaveCount(0);
    const publicDrink = page
      .locator('.drinks-menu-card')
      .filter({ has: page.getByRole('heading', { name: 'قهوة اختبار المنيو', exact: true }) });
    await expect(publicDrink).toContainText('وصف مشروب محفوظ من لوحة التحكم.');
    await expect(publicDrink).toContainText('٨٥');
    await page.getByRole('button', { name: 'حاجة سخنة', exact: true }).click();
    await expect(publicDrink).toHaveCount(0);
    await page.getByRole('button', { name: 'حاجة ساقعة', exact: true }).click();
    await expect(publicDrink).toBeVisible();
    await page.goto('/admin/site');
    await page.getByRole('button', { name: 'منيو المشروبات', exact: true }).click();
    const raiseDrink = page.getByRole('button', { name: 'رفع قهوة اختبار المنيو', exact: true });
    while (await raiseDrink.isEnabled()) await raiseDrink.click();
    await page.getByRole('button', { name: 'حفظ محتوى الموقع', exact: true }).click();
    await expect(page.getByText('تم حفظ المحتوى وتحديث الموقع.', { exact: true })).toBeVisible();
    expect((await (await page.request.get('/api/admin/settings')).json()).cms.drinks[0].id).toBe(
      newDrinkData.id,
    );
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'حذف قهوة اختبار المنيو', exact: true }).click();
    await page.getByRole('button', { name: 'حفظ محتوى الموقع', exact: true }).click();
    await expect(page.getByText('تم حفظ المحتوى وتحديث الموقع.', { exact: true })).toBeVisible();
    await page.goto('/menu');
    await expect(publicDrink).toHaveCount(0);
  } finally {
    // Restoration runs in afterEach with a separate timeout budget.
  }
});

test('manager cannot save owner CMS settings even through direct routes or requests', async ({
  page,
  browser,
}) => {
  await login(page);
  const create = await page.request.post('/api/admin/users', {
    data: {
      username: 'cms.manager',
      name: 'مدير اختبار المحتوى',
      password: 'Browser-test-only-3948!',
      role: 'manager',
    },
  });
  expect(create.ok()).toBeTruthy();
  const { id } = await create.json();
  const managerContext = await browser.newContext();
  const manager = await managerContext.newPage();
  try {
    await login(manager, 'cms.manager');
    await expect(
      manager.getByRole('link', { name: 'إدارة الموقع بالكامل', exact: true }),
    ).toHaveCount(0);
    await manager.goto('/admin/site');
    await expect(manager.getByRole('alert')).toContainText('للمالك فقط');
    await expect(
      manager.getByRole('button', { name: 'حفظ محتوى الموقع', exact: true }),
    ).toHaveCount(0);
    const settings = await (await page.request.get('/api/admin/settings')).json();
    const denied = await manager.request.put('/api/admin/settings', {
      data: { ...settings, cms: { home: { storeTitle: 'تعديل غير مصرح' } } },
    });
    expect(denied.status()).toBe(403);
    expect(await (await page.request.get('/api/admin/settings')).json()).toEqual(settings);
  } finally {
    await managerContext.close();
    expect((await page.request.delete(`/api/admin/users/${id}`)).ok()).toBeTruthy();
  }
});
