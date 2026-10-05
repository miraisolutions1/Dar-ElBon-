import { z } from 'zod';
import { readFileSync } from 'node:fs';
const short = z.string().trim().min(1).max(200);
export const imagePath = z.string().regex(/^\/(?:images|uploads)\/[a-zA-Z0-9._-]+$/);
export const productSchema = z
  .object({
    name: short,
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(100),
    description: z.string().trim().min(1).max(4000),
    roast: z.enum(['فاتح', 'وسط', 'غامق', 'غير محدد']),
    brew: z
      .array(z.enum(['تركي', 'إسبريسو', 'فلتر']))
      .min(1)
      .max(3),
    kind: short,
    grinds: z.array(short).min(1).max(8),
    image: imagePath,
    active: z.boolean(),
    featured: z.boolean(),
    demo: z.boolean(),
    updatedAt: z.number().int().optional(),
    stockMode: z.enum(['units', 'grams']),
    stockGrams: z.number().int().min(0).max(100000000),
    variants: z
      .array(
        z.object({
          id: z.string().uuid().optional(),
          weight: z.number().int().min(1).max(10000),
          price: z.number().int().min(100).max(10000000),
          stock: z.number().int().min(0).max(1000000),
        }),
      )
      .min(1)
      .max(12),
  })
  .refine((p) => new Set(p.variants.map((v) => v.weight)).size === p.variants.length, {
    message: 'الأوزان لا يمكن تكرارها',
  });

const cmsLink = z
  .string()
  .max(2000)
  .refine(
    (value) =>
      value === '' ||
      /^https:\/\/[^\s<>"\\]+$/.test(value) ||
      /^\/(?!\/)[a-zA-Z0-9_./?#=%&+~-]*$/.test(value),
    'استخدم رابط HTTPS أو مسارًا داخل الموقع.',
  );
const cmsImage = z
  .string()
  .max(2000)
  .refine(
    (value) =>
      value === '' ||
      /^\/(?:images|uploads)\/[a-zA-Z0-9._-]+$/.test(value) ||
      /^https:\/\/[^\s<>"\\]+$/.test(value),
    'استخدم صورة محلية أو رابط HTTPS.',
  );
const externalLink = z
  .string()
  .max(2000)
  .refine((value) => value === '' || /^https:\/\/[^\s<>"\\]+$/.test(value), 'استخدم رابط HTTPS.');
function contentShape(template, key = '', partial = true) {
  if (typeof template === 'string' && ['id', 'value', 'slug'].includes(key))
    return z.literal(template);
  if (typeof template === 'string')
    return /(?:image|logo)$/i.test(key)
      ? cmsImage
      : /(?:href|url)$/i.test(key)
        ? cmsLink
        : z.string().max(8000);
  if (typeof template === 'boolean') return z.boolean();
  if (typeof template === 'number') return z.number().finite();
  if (Array.isArray(template)) {
    const choices = template.map((item) => contentShape(item, '', false));
    let list = z
      .array(choices.length > 1 ? z.union(choices) : choices[0] || z.string().max(8000))
      .min(template.length ? 1 : 0)
      .max(40);
    if (key === 'questions') list = list.length(template.length);
    if (key === 'options') list = list.max(template.length);
    return list.refine((items) => {
      const identifiers = items
        .filter((item) => item && typeof item === 'object' && ('id' in item || 'value' in item))
        .map((item) => item.id ?? item.value);
      return new Set(identifiers).size === identifiers.length;
    }, 'معرّفات خيارات المحتوى لا تتكرر.');
  }
  if (template && typeof template === 'object') {
    const shape = z
      .object(
        Object.fromEntries(
          Object.entries(template).map(([name, value]) => [
            name,
            contentShape(value, name, partial),
          ]),
        ),
      )
      .strict();
    return partial ? shape.partial() : shape;
  }
  return z.null();
}
const siteCopyTemplate = JSON.parse(
  readFileSync(new URL('../content/site-copy-ar.json', import.meta.url), 'utf8'),
);
const experienceTemplate = JSON.parse(
  readFileSync(new URL('../content/coffee-experience-ar.json', import.meta.url), 'utf8'),
);
const cmsSchema = z
  .object({
    siteCopy: contentShape(siteCopyTemplate).optional(),
    experience: contentShape(experienceTemplate).optional(),
    drinks: z
      .array(
        z
          .object({
            id: z
              .string()
              .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
              .max(100),
            name: z.string().trim().min(1).max(200),
            category: z.enum(['hot', 'cold']),
            description: z.string().max(2000),
            image: cmsImage,
            price: z.number().int().min(0).max(10000000).nullable(),
            active: z.boolean(),
          })
          .strict(),
      )
      .max(40)
      .refine(
        (items) => new Set(items.map((item) => item.id)).size === items.length,
        'معرّفات المشروبات لا تتكرر.',
      )
      .optional(),
    appearance: z
      .object({
        accent: z
          .string()
          .regex(/^#[0-9a-f]{6}$/i)
          .optional(),
        background: z
          .string()
          .regex(/^#[0-9a-f]{6}$/i)
          .optional(),
        text: z
          .string()
          .regex(/^#[0-9a-f]{6}$/i)
          .optional(),
        logo: cmsImage.optional(),
      })
      .strict()
      .optional(),
    social: z
      .object({
        facebook: externalLink.optional(),
        instagram: externalLink.optional(),
        whatsapp: externalLink.optional(),
      })
      .strict()
      .optional(),
    home: z
      .object(
        Object.fromEntries(
          [
            'storeTitle',
            'storeDescription',
            'storeCta',
            'quizTitle',
            'quizDescription',
            'quizCta',
            'learnTitle',
            'learnDescription',
            'learnCta',
          ].map((key) => [key, z.string().max(2000).optional()]),
        ),
      )
      .extend(
        Object.fromEntries(
          ['storyImage', 'quizImage', 'recipesImage', 'journeyImage', 'brewingImage'].map((key) => [
            key,
            cmsImage.optional(),
          ]),
        ),
      )
      .strict()
      .optional(),
    ritual: z
      .array(
        z
          .object({ title: z.string().max(200), text: z.string().max(1000), href: cmsLink })
          .strict(),
      )
      .max(6)
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (Buffer.byteLength(JSON.stringify(value), 'utf8') > 131072)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'محتوى الموقع أكبر من الحد المدعوم.',
      });
    let count = 0;
    const check = (item, depth = 0) => {
      if (++count > 1200 || depth > 8) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'تركيب محتوى الموقع أكبر من الحد المدعوم.',
        });
        return;
      }
      if (Array.isArray(item)) for (const child of item) check(child, depth + 1);
      else if (item && typeof item === 'object')
        for (const [key, child] of Object.entries(item)) {
          if (['__proto__', 'prototype', 'constructor'].includes(key))
            context.addIssue({ code: z.ZodIssueCode.custom, message: 'مفتاح محتوى غير صالح.' });
          check(child, depth + 1);
        }
    };
    check(value);
  });

export const settingsSchema = z
  .object({
    brand: short,
    cms: cmsSchema.optional(),
    mode: z.enum(['preview', 'live']),
    heroTitle: short,
    heroSubtitle: short,
    heroImage: imagePath,
    heroVideo: z
      .string()
      .regex(/^(?:|\/media\/[a-zA-Z0-9._-]+\.mp4)$/)
      .optional(),
    storyTitle: short,
    storyText: z.string().trim().max(3000),
    contactPhone: z.string().trim().max(30),
    contactEmail: z.union([z.literal(''), z.string().email()]),
    address: z.string().trim().max(300),
    shippingPolicy: z.string().trim().max(8000),
    returnsPolicy: z.string().trim().max(8000),
    privacyPolicy: z.string().trim().max(8000),
    codEnabled: z.boolean(),
    sections: z
      .array(
        z.enum([
          'brewing',
          'featured',
          'story',
          'branches',
          'guide',
          'quiz',
          'recipes',
          'experience',
        ]),
      )
      .max(8),
    branches: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(80),
          address: z.string().trim().min(1).max(300),
          main: z.boolean(),
          enabled: z.boolean().optional(),
        }),
      )
      .max(12)
      .optional(),
    shippingZones: z
      .array(
        z.object({
          id: z.string().min(1).max(60),
          name: short,
          fee: z.number().int().min(0).max(1000000),
          eta: short,
          enabled: z.boolean(),
        }),
      )
      .max(50),
  })
  .refine(
    (s) =>
      new Set(s.sections).size === s.sections.length &&
      new Set(s.shippingZones.map((z) => z.id)).size === s.shippingZones.length,
    { message: 'القيم المكررة غير مسموحة' },
  );
export const orderSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    customer: z.object({
      name: z.string().trim().min(3).max(100),
      phone: z
        .string()
        .trim()
        .regex(/^\+?[0-9 ()-]{8,25}$/),
      city: z.string().trim().max(200).default(''),
      address: z.string().trim().max(500).default(''),
      notes: z.string().trim().max(500).default(''),
    }),
    zoneId: z.string().min(1).max(60).optional(),
    paymentMethod: z.literal('cod'),
    expectedTotal: z.number().int().min(0).optional(),
    items: z
      .array(
        z.union([
          z.object({
            type: z.literal('product').optional(),
            productId: z.string().uuid(),
            variantId: z.string().uuid(),
            grind: short,
            quantity: z.number().int().min(1).max(30),
          }),
          z.object({
            type: z.literal('blend'),
            components: z
              .array(
                z.object({
                  productId: z.string().uuid(),
                  grams: z.number().int().min(50).max(1000).multipleOf(50),
                }),
              )
              .min(1)
              .max(8)
              .refine(
                (components) =>
                  new Set(components.map((component) => component.productId)).size ===
                  components.length,
                { message: 'لا يمكن تكرار مكون التوليفة.' },
              )
              .refine(
                (components) =>
                  components.reduce((sum, component) => sum + component.grams, 0) <= 3000,
                { message: 'وزن التوليفة لا يزيد عن 3000 جم.' },
              ),
            grind: short,
            quantity: z.number().int().min(1).max(30),
          }),
        ]),
      )
      .min(1)
      .max(30),
    fulfillment: z.enum(['delivery', 'pickup']).default('delivery'),
    pickupBranchIndex: z.number().int().min(0).max(11).optional(),
  })
  .superRefine((input, context) => {
    if (input.fulfillment === 'pickup') {
      if (input.pickupBranchIndex === undefined)
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['pickupBranchIndex'],
          message: 'اختر فرع الاستلام.',
        });
    } else {
      if (!input.zoneId)
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['zoneId'],
          message: 'اختر منطقة التوصيل.',
        });
      if (!input.customer.city)
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['customer', 'city'],
          message: 'أدخل المدينة.',
        });
      if (input.customer.address.length < 8)
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['customer', 'address'],
          message: 'أدخل عنوان توصيل كامل.',
        });
    }
  });
export const orderUpdateSchema = z.object({
  status: z.enum(['new', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled']).optional(),
  paymentStatus: z.enum(['unpaid', 'paid', 'refunded']).optional(),
  note: z.string().max(3000).optional(),
  tracking: z.string().max(300).optional(),
});
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new HttpError(
      400,
      'راجع البيانات المطلوبة: ' +
        result.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .slice(0, 3)
          .join('، '),
    );
  return result.data;
}
