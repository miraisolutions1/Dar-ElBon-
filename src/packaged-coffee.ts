import type { Product } from './lib';

export function isPackagedCoffee(product: Product) {
  return product.kind !== 'حبوب للتوليف';
}
export function packageKey(product: Product) {
  if (/tin|علبة|معدن/i.test(product.image + ' ' + product.name)) return 'tin';
  if (/sada-studio|pouch|كيس|عبوة/i.test(product.image + ' ' + product.name)) return 'pouch';
  return product.slug;
}
export function packageTitle(product: Product) {
  const key = packageKey(product);
  return key === 'tin' ? 'علبة دار البن' : key === 'pouch' ? 'عبوة دار البن الصفراء' : product.name;
}
export function packageGroups(products: Product[]) {
  const groups = new Map<string, Product[]>();
  for (const product of products.filter(isPackagedCoffee)) {
    const key = packageKey(product);
    groups.set(key, [...(groups.get(key) || []), product]);
  }
  return [...groups.values()];
}
