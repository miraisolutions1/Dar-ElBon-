# معاينة الموقع على GitHub Pages

نسخة المعاينة المستقلة موجودة في `docs/index.html`، وتشمل الخطوط والصور داخل الملف. التنقل يستخدم عناوين تبدأ بـ`#`، لذلك تعمل صفحات المنتجات والسلة تحت مسار المستودع على GitHub Pages دون إعدادات خادم.

المعاينة تعرض التصميم والمنتجات والسلة ببيانات توضيحية. لا تجمع بيانات عميل ولا ترسل طلبات. صفحة الإدارة فيها لقطة موضحة من لوحة الاختبار؛ تشغيل الإدارة وقاعدة الطلبات الفعلية يتطلب نسخة Node الموثقة في دليل Render.

العنوان الافتراضي المتوقع بعد نجاح النشر:

https://miraisolutions1.github.io/Dar-ElBon-/

يرفع Workflow «Publish website preview» مجلد `docs` إلى GitHub Pages عند تحديثه على `main`، ويحاول تفعيل Pages تلقائيًا. نجاح دفع الكود وحده لا يثبت نجاح هذا النشر.

يسجل Workflow نتيجة النشر ورابطه في فرع `pages-deployment` مستقل حتى يمكن فحص النتيجة باستخدام Git. صلاحية كتابة المحتوى مخصصة لهذا السجل، ولا يعدل Workflow فرع `main`.

إذا لم تسمح صلاحيات Actions بتفعيل الخدمة لأول مرة:

1. افتح [Settings → Pages](https://github.com/miraisolutions1/Dar-ElBon-/settings/pages).
2. اختر **GitHub Actions** في Source.
3. افتح [Publish website preview](https://github.com/miraisolutions1/Dar-ElBon-/actions/workflows/pages.yml)، ثم **Run workflow** على `main`.

ويمكن استخدام نشر الفروع المعتاد بدلًا من Actions: اختر **Deploy from a branch** ثم `main` والمجلد `/docs` واضغط Save. ملفات المعاينة نفسها تدعم الطريقتين. إتاحة Pages للمستودعات الخاصة تعتمد على خطة الحساب.

هذه نسخة مراجعة ثابتة؛ تعديل بيانات الإدارة على خادم Node لا يحدث محتوى `docs/index.html` تلقائيًا. حدّث نسخة المعاينة عند اعتماد مراجعة جديدة للتصميم.
