export const blendOrigins = [
  {
    id: 'brazil',
    name: 'برازيلي',
    pricePer100: 8000,
    note: 'قد يميل للشوكولاتة والمكسرات، بقوام متوازن.',
    body: 'متوسط إلى تقيل',
    acidity: 'أهدى غالبًا',
    color: '#966238',
  },
  {
    id: 'colombia',
    name: 'كولومبي',
    pricePer100: 10000,
    note: 'قد يجمع الحلاوة مع لمسة فاكهية وحموضة متوازنة.',
    body: 'متوسط',
    acidity: 'متوازنة غالبًا',
    color: '#d79b26',
  },
  {
    id: 'ethiopia',
    name: 'إثيوبي',
    pricePer100: 12000,
    note: 'قد يميل لنكهات فاكهية أو زهرية، بقوام أخف.',
    body: 'أخف غالبًا',
    acidity: 'فاكهية أوضح غالبًا',
    color: '#647d48',
  },
] as const;

export type BlendAmounts = Record<(typeof blendOrigins)[number]['id'], number>;
export const initialBlend: BlendAmounts = { brazil: 150, colombia: 100, ethiopia: 0 };

export function validateSavedBlend(value: unknown): BlendAmounts | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const saved = value as Record<string, unknown>;
  if (
    Object.keys(saved).sort().join(',') !== 'amounts,preview,savedAt' ||
    saved.preview !== true ||
    typeof saved.savedAt !== 'number' ||
    !Number.isFinite(saved.savedAt) ||
    saved.savedAt <= 0
  )
    return null;
  if (!saved.amounts || typeof saved.amounts !== 'object' || Array.isArray(saved.amounts))
    return null;
  const amounts = saved.amounts as Record<string, unknown>;
  if (Object.keys(amounts).sort().join(',') !== 'brazil,colombia,ethiopia') return null;
  if (
    !blendOrigins.every(
      ({ id }) =>
        typeof amounts[id] === 'number' &&
        Number.isFinite(amounts[id]) &&
        Number.isInteger(amounts[id]) &&
        (amounts[id] as number) >= 0 &&
        (amounts[id] as number) <= 1000 &&
        (amounts[id] as number) % 50 === 0,
    )
  )
    return null;
  return {
    brazil: amounts.brazil as number,
    colombia: amounts.colombia as number,
    ethiopia: amounts.ethiopia as number,
  };
}

export function normalizeBlendGrams(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1000, Math.round(value / 50) * 50)) : 0;
}

export function calculateBlend(amounts: BlendAmounts) {
  const items = blendOrigins.map((origin) => {
    const grams = normalizeBlendGrams(amounts[origin.id]);
    return { ...origin, grams, price: Math.round((grams * origin.pricePer100) / 100) };
  });
  const weight = items.reduce((sum, item) => sum + item.grams, 0);
  return {
    weight,
    price: items.reduce((sum, item) => sum + item.price, 0),
    items: items.map((item) => ({ ...item, share: weight ? (item.grams / weight) * 100 : 0 })),
  };
}
