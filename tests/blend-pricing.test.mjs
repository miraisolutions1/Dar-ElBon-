import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBlend,
  initialBlend,
  normalizeBlendGrams,
  validateSavedBlend,
} from '../src/blend-pricing.ts';

test('blend preview calculates initial total in integer cents and independent ingredient costs', () => {
  const total = calculateBlend(initialBlend);
  assert.equal(total.weight, 250);
  assert.equal(total.price, 22000);
  assert.deepEqual(
    total.items.map((item) => item.price),
    [12000, 10000, 0, 0, 0, 0, 0, 0],
  );
  assert.deepEqual(
    total.items.map((item) => item.share),
    [60, 40, 0, 0, 0, 0, 0, 0],
  );
  const half = calculateBlend({ brazil: 50, colombia: 50, ethiopia: 50 });
  assert.equal(half.price, 15000);
  assert.equal(half.weight, 150);
  assert.ok(Math.abs(half.items.reduce((sum, item) => sum + item.share, 0) - 100) < 1e-9);
});

test('saved preview recipe accepts only exact supported quantities and fields', () => {
  const saved = { amounts: initialBlend, preview: true, savedAt: 1 };
  assert.deepEqual(validateSavedBlend(saved), initialBlend);
  assert.equal(validateSavedBlend({ ...saved, price: 1 }), null);
  assert.equal(validateSavedBlend({ ...saved, amounts: { ...initialBlend, unknown: 50 } }), null);
  for (const value of [NaN, Infinity, -50, 1100, 51, '50'])
    assert.equal(
      validateSavedBlend({ ...saved, amounts: { ...initialBlend, brazil: value } }),
      null,
    );
  assert.equal(validateSavedBlend({ ...saved, preview: false }), null);
  assert.equal(validateSavedBlend(null), null);
  assert.equal(validateSavedBlend([]), null);
});

test('blend preview handles zero amounts, invalid input and ingredient limits without NaN', () => {
  const zero = calculateBlend({ brazil: 0, colombia: 0, ethiopia: 0 });
  assert.equal(zero.weight, 0);
  assert.equal(zero.price, 0);
  assert.deepEqual(
    zero.items.map((item) => item.share),
    [0, 0, 0, 0, 0, 0, 0, 0],
  );
  for (const invalid of [NaN, Infinity, -Infinity, -50])
    assert.equal(normalizeBlendGrams(invalid), 0);
  assert.equal(normalizeBlendGrams(1100), 1000);
  assert.equal(normalizeBlendGrams(74), 50);
  assert.equal(normalizeBlendGrams(75), 100);
  const maximum = calculateBlend({ brazil: 1000, colombia: 1000, ethiopia: 1000 });
  assert.equal(maximum.weight, 3000);
  assert.equal(maximum.price, 300000);
});

test('blend pricing uses canonical catalog rates and includes all eight origins', () => {
  const rates = { brazil: 9000, colombia: 11000 };
  const total = calculateBlend(initialBlend, rates);
  assert.equal(total.items.length, 8);
  assert.equal(total.price, 24500);
  const legacy = validateSavedBlend({
    amounts: { brazil: 150, colombia: 100, ethiopia: 0 },
    preview: true,
    savedAt: 1,
  });
  assert.equal(Object.keys(legacy).length, 8);
  assert.equal(legacy.india, 0);
  assert.equal(calculateBlend({ india: 50 }, { india: 7000 }).price, 3500);
});
