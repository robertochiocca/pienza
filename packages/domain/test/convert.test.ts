import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  centimetersToInches,
  cm,
  inchesToCentimeters,
  kg,
  kilogramsToPounds,
  poundsToKilograms,
} from '../src';

const storableCm = fc.integer({ min: 0, max: 30_000 }).map((cents) => cm(cents / 100));
const storableKg = fc.integer({ min: 0, max: 40_000 }).map((grams) => kg(grams / 100));

describe('conversao de comprimento', () => {
  it('usa a definicao exata da polegada', () => {
    expect(inchesToCentimeters(1)).toBe(2.54);
    expect(centimetersToInches(cm(2.54))).toBe(1);
  });

  it('faz round-trip cm -> pol -> cm sem perda na precisao canonica', () => {
    fc.assert(
      fc.property(storableCm, (value) => {
        expect(inchesToCentimeters(centimetersToInches(value))).toBe(value);
      }),
    );
  });

  it('preserva a ordem', () => {
    fc.assert(
      fc.property(storableCm, storableCm, (a, b) => {
        fc.pre(a <= b);
        expect(centimetersToInches(a)).toBeLessThanOrEqual(centimetersToInches(b));
      }),
    );
  });
});

describe('conversao de massa', () => {
  it('usa a definicao exata da libra avoirdupois', () => {
    expect(poundsToKilograms(1)).toBe(0.45);
    expect(kilogramsToPounds(kg(1))).toBeCloseTo(2.2046226218, 9);
  });

  it('faz round-trip kg -> lb -> kg sem perda na precisao canonica', () => {
    fc.assert(
      fc.property(storableKg, (value) => {
        expect(poundsToKilograms(kilogramsToPounds(value))).toBe(value);
      }),
    );
  });
});
