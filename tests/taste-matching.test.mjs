import test from 'node:test';
import assert from 'node:assert/strict';
import { matchTasteProducts } from '../src/taste-matching.ts';

const product = {
  id: 'one',
  slug: 'blend',
  active: true,
  brew: ['تركي'],
  kind: 'محوج',
  stockMode: 'units',
  stockGrams: 0,
  variants: [
    { id: 'small', weight: 250, price: 18000, stock: 5 },
    { id: 'big', weight: 500, price: 34000, stock: 3 },
  ],
};
const answers = { brew: 'تركي', kind: 'محوج', usage: 'try' };
test('only recommends available products matching the requested brewing method and kind', () => {
  assert.equal(matchTasteProducts([product], answers).length, 1);
  assert.equal(matchTasteProducts([product], { ...answers, brew: 'إسبريسو' }).length, 0);
  assert.equal(matchTasteProducts([product], { ...answers, kind: 'سادة' }).length, 0);
  assert.equal(matchTasteProducts([{ ...product, active: false }], answers).length, 0);
  assert.equal(
    matchTasteProducts(
      [{ ...product, variants: product.variants.map((v) => ({ ...v, stock: 0 })) }],
      answers,
    ).length,
    0,
  );
});
test('weight suggestions use available variants and respect shared gram inventory', () => {
  assert.equal(matchTasteProducts([product], answers)[0].variant.id, 'small');
  assert.equal(matchTasteProducts([product], { ...answers, usage: 'share' })[0].variant.id, 'big');
  assert.equal(
    matchTasteProducts([product], { ...answers, usage: 'daily' })[0].variant.id,
    'small',
  );
  const grams = { ...product, stockMode: 'grams', stockGrams: 400 };
  assert.equal(
    matchTasteProducts([grams], { ...answers, kind: 'any', usage: 'share' })[0].variant.id,
    'small',
  );
  assert.equal(matchTasteProducts([{ ...grams, stockGrams: 200 }], answers).length, 0);
});
