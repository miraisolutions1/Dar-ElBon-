# بيت البن البرازيلي — مصدر مستقل

تصوّر متجر عربي أردني مستقل من Mirai Solutions. لا يتصل بقاعدة بيانات دار البن ولا يرسل طلبات.

## البناء

يتطلب Node.js 24 أو أحدث:

```powershell
pnpm install
pnpm dev
pnpm typecheck
pnpm build
```

مشروع React 19 وVite مستقل، والبناء يخرج إلى `../docs/brazilian-coffee-house/` فقط. بيانات المنتجات في `content/products.json` ومصادرها في `content/sources.json`. أصول الصور والشعار والخطوط في `public/` و`src/assets/` مستعادة من النسخة الأردنية المنشورة.

قائمة الاختيارات تحفظ محليًا في المتصفح. لا تعرض سعرًا أو مخزونًا غير منشور، ولا ترسل نموذج طلب.
