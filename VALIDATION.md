# Validation record

Validated in the current cloud workspace on 2 October 2026. This records local execution, not a public deployment or restoration in a new cloud task.

| Check                                                 | Result                                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------- |
| Frozen dependency installation: `npm ci`              | Passed                                                            |
| TypeScript and frontend bundle: `npm run build`       | Passed                                                            |
| API integration tests: `npm test`                     | 10 passed; 0 failed or skipped                                    |
| Chromium browser tests: `npm run test:e2e`            | 3 passed; 0 failed or skipped                                     |
| Dependency advisories: `npm audit --audit-level=high` | 0 known vulnerabilities reported at execution                     |
| Database backup and isolated restore                  | Integrity check `ok`; product and admin records retained          |
| Repeated admin initialization                         | Existing account and password preserved                           |
| Server restart                                        | Health and catalog endpoints passed; storefront/admin HTML served |
| Unauthenticated admin API                             | HTTP 401                                                          |
| Render startup command, isolated local smoke check    | Passed: HTTPS origin, secure session, restart persistence         |

API coverage includes role separation, session logout and password rotation, login rate limits, cross-origin mutation rejection, server-side prices and shipping, idempotency, transactional stock deductions, stock rollback on failure, cancellation, gram inventory, upload byte validation, persistent data, live-mode prerequisites, and stale-edit/changed-price conflicts.

Browser coverage includes a full purchase and admin fulfillment update, cart persistence, mobile filtering and cart interaction, product price edits, homepage content edits, admin mobile navigation, and horizontal-overflow checks at 390px.

Browser tests use an isolated temporary database and synthetic accounts/orders. Their screenshots demonstrate the rendered implementation; they are not screenshots of actual customer transactions.

The Render startup command was executed against an isolated temporary database with `RENDER_EXTERNAL_URL` as the HTTPS origin. Login, Secure/HttpOnly/SameSite cookies, a preview order, image upload, cross-origin rejection, graceful restart, and retention of the account, order and image all passed. The local private credential file remained unchanged. The first ad hoc smoke attempt used the wrong upload URL and returned 404; correcting the check to the existing `/api/admin/upload` route produced the passing result. This validates the startup command locally; no Render account, remote disk, or public URL has been provisioned or verified.

The initial store remains in preview mode. Product prices, weights, inventory, shipping policies, contact information and generated media require business review before actual sales. Payment-provider, shipping-provider and messaging integrations have not been implemented or claimed as tested.

## Visual revision — 3 October 2026

Rebuilt the storefront around the supplied brown-and-cream cafe reference: an enclosing rounded frame, curved hero, coffee photography, image-led browsing cards, Naskh headings, and expandable product-selection guidance. Product, checkout, and admin behavior continues to use the existing server. Drink imagery links to browsing or the guide; it does not invent additional catalog products.

- Production build and TypeScript passed.
- All 3 existing Chromium end-to-end tests passed, including checkout, fulfillment, product/content editing and mobile navigation. The homepage assertion now selects the level-one heading because the new section title also contains the same phrase.
- Browser checks at 320, 390, 768, 1024 and 1440 pixels found no document-level horizontal overflow. Desktop and mobile screenshots were visually inspected.
- The updated standalone HTML preview was checked through an internal HTTP server, then with browser networking disabled. Accordion, product/weight selection and cart navigation passed with no external requests or browser errors. That artifact deliberately does not submit orders; its admin view is a labeled screenshot. Direct file-URL execution cannot be verified in the managed browser, which blocks that scheme.
- These checks do not establish a public deployment or owner approval of the visual revision.

## مراجعة الاتجاه الداكن — 3 أكتوبر 2026

- بناء الإنتاج وTypeScript ناجحان.
- اختبارات API: 10 ناجحة.
- اختبارات المتصفح: 4 ناجحة، تشمل الطلب والإدارة، الموبايل، تعديل المحتوى، واختيار وزن من الرئيسية مع إعادة التحميل والسلة.
- معاينة بصرية فعلية للكمبيوتر 1440 والموبايل 390؛ لا يوجد تمرير أفقي على الموبايل.
- الصور بصيغة WebP، والمعاينة المستقلة نحو 1.75 ميجابايت بدلًا من 9.43 ميجابايت.

## تحديث اللوجو والهيدر

- بناء الإنتاج ناجح، واختبارات المتصفح الخمسة ناجحة قبل إضافة روابط السوشيال. تشمل تحميل صورة اللوجو والبحث وإغلاق لوحة الموبايل عند الانتقال والضغط على Escape.
- فحص عرض 320 و390 و768 و1024: لا يوجد خروج أفقي.
- محتوى صفحات السوشيال غير مقروء بسبب حجب الشبكة؛ روابطهما مؤكدة من رسالة صاحب المشروع، كما هو موثق في CONTENT_SOURCES_AR.md.
