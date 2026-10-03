import { z } from 'zod';
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
    roast: z.enum(['فاتح', 'وسط', 'غامق']),
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
export const settingsSchema = z
  .object({
    brand: short,
    mode: z.enum(['preview', 'live']),
    heroTitle: short,
    heroSubtitle: short,
    heroImage: imagePath,
    storyTitle: short,
    storyText: z.string().trim().max(3000),
    contactPhone: z.string().trim().max(30),
    contactEmail: z.union([z.literal(''), z.string().email()]),
    address: z.string().trim().max(300),
    shippingPolicy: z.string().trim().max(8000),
    returnsPolicy: z.string().trim().max(8000),
    privacyPolicy: z.string().trim().max(8000),
    codEnabled: z.boolean(),
    sections: z.array(z.enum(['brewing', 'featured', 'story', 'branches', 'guide'])).max(5),
    branches: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(80),
          address: z.string().trim().min(1).max(300),
          main: z.boolean(),
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
export const orderSchema = z.object({
  idempotencyKey: z.string().uuid(),
  customer: z.object({
    name: z.string().trim().min(3).max(100),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{8,25}$/),
    city: short,
    address: z.string().trim().min(8).max(500),
    notes: z.string().trim().max(500).default(''),
  }),
  zoneId: z.string().min(1).max(60),
  paymentMethod: z.literal('cod'),
  expectedTotal: z.number().int().min(0).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid(),
        grind: short,
        quantity: z.number().int().min(1).max(30),
      }),
    )
    .min(1)
    .max(30),
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
