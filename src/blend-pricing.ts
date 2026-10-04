import origins from '../content/blend-origins.json' with { type: 'json' };
export const blendOrigins = origins;
export type BlendAmounts = Record<string, number>;
export const initialBlend: BlendAmounts = Object.fromEntries(
  blendOrigins.map(({ id }) => [id, id === 'brazil' ? 150 : id === 'colombia' ? 100 : 0]),
);
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
  const ids = blendOrigins.map(({ id }) => id);
  if (Object.keys(amounts).some((id) => !ids.includes(id))) return null;
  const keys = Object.keys(amounts).sort().join(',');
  if (keys !== [...ids].sort().join(',') && keys !== 'brazil,colombia,ethiopia') return null;
  if (
    !Object.values(amounts).every(
      (value) =>
        typeof value === 'number' &&
        Number.isFinite(value) &&
        Number.isInteger(value) &&
        value >= 0 &&
        value <= 1000 &&
        value % 50 === 0,
    )
  )
    return null;
  return Object.fromEntries(ids.map((id) => [id, Number(amounts[id] ?? 0)]));
}

export function normalizeBlendGrams(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1000, Math.round(value / 50) * 50)) : 0;
}

export function calculateBlend(amounts: BlendAmounts, prices?: Record<string, number>) {
  const items = blendOrigins.map((origin) => {
    const grams = normalizeBlendGrams(amounts[origin.id]);
    const pricePer100 = prices ? (prices[origin.id] ?? 0) : origin.pricePer100;
    return { ...origin, pricePer100, grams, price: Math.round((grams * pricePer100) / 100) };
  });
  const weight = items.reduce((sum, item) => sum + item.grams, 0);
  return {
    weight,
    price: items.reduce((sum, item) => sum + item.price, 0),
    items: items.map((item) => ({ ...item, share: weight ? (item.grams / weight) * 100 : 0 })),
  };
}
