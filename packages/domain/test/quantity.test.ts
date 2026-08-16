import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { cm, kg, roundToStorage, STORAGE_DECIMALS } from '../src/units';

/** Valor com no maximo `STORAGE_DECIMALS` casas, gerado a partir de centesimos inteiros. */
const storableCentimeters = fc.integer({ min: 0, max: 30_000 }).map((cents) => cents / 100);

describe('cm / kg', () => {
  it('aceita zero', () => {
    expect(cm(0)).toBe(0);
    expect(kg(0)).toBe(0);
  });

  it.each([NaN, Infinity, -Infinity])('rejeita valor nao finito: %p', (value) => {
    expect(() => cm(value)).toThrow(RangeError);
    expect(() => kg(value)).toThrow(RangeError);
  });

  it('rejeita valor negativo', () => {
    expect(() => cm(-0.01)).toThrow(RangeError);
    expect(() => kg(-1)).toThrow(RangeError);
  });

  it('aplica a precisao canonica na construcao', () => {
    expect(cm(84.567)).toBe(84.57);
    expect(kg(72.344)).toBe(72.34);
  });
});

describe('roundToStorage', () => {
  it('nao afasta o valor mais que meia unidade da ultima casa', () => {
    const maxError = 0.5 / 10 ** STORAGE_DECIMALS;
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1000, noNaN: true, noDefaultInfinity: true }), (x) => {
        expect(Math.abs(roundToStorage(x) - x)).toBeLessThanOrEqual(maxError + Number.EPSILON);
      }),
    );
  });

  it('e idempotente', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1000, noNaN: true, noDefaultInfinity: true }), (x) => {
        const once = roundToStorage(x);
        expect(roundToStorage(once)).toBe(once);
      }),
    );
  });

  it('preserva valores que ja cabem na precisao canonica', () => {
    fc.assert(
      fc.property(storableCentimeters, (x) => {
        expect(roundToStorage(x)).toBe(x);
      }),
    );
  });
});
