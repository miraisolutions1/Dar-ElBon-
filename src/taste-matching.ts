import type { Product, Variant } from './lib';

export type TasteAnswers = { brew: string; kind: string; usage: string };

export function availableTasteVariants(product: Product): Variant[] {
  return product.variants.filter((variant) => {
    const count =
      product.stockMode === 'grams'
        ? Math.floor(product.stockGrams / variant.weight)
        : variant.stock;
    return !!variant.id && variant.weight > 0 && variant.price > 0 && count > 0;
  });
}

export function matchTasteProducts(products: Product[], answers: TasteAnswers) {
  if (!answers.brew || !answers.kind || !answers.usage) return [];
  return products
    .filter(
      (product) =>
        product.active &&
        product.brew.includes(answers.brew) &&
        (answers.kind === 'any' || product.kind === answers.kind),
    )
    .flatMap((product) => {
      const variants = availableTasteVariants(product).sort((a, b) => a.weight - b.weight);
      if (!variants.length) return [];
      const variant =
        answers.usage === 'share'
          ? variants[variants.length - 1]
          : answers.usage === 'daily'
            ? [...variants].sort((a, b) => Math.abs(a.weight - 250) - Math.abs(b.weight - 250))[0]
            : variants[0];
      return [{ product, variant }];
    });
}
