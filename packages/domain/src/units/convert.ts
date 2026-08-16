import { cm, kg, type Centimeters, type Kilograms } from './quantity';

/**
 * Constantes de definicao, nao medicoes: a polegada internacional e a libra
 * avoirdupois internacional foram definidas exatamente nestes termos pelo
 * acordo de jardas e libras de 1959. Nao ha aproximacao a citar aqui.
 */
const CM_PER_INCH = 2.54;
const KG_PER_POUND = 0.45359237;

export type UnitSystem = 'metric' | 'imperial';

export function centimetersToInches(value: Centimeters): number {
  return value / CM_PER_INCH;
}

export function inchesToCentimeters(value: number): Centimeters {
  return cm(value * CM_PER_INCH);
}

export function kilogramsToPounds(value: Kilograms): number {
  return value / KG_PER_POUND;
}

export function poundsToKilograms(value: number): Kilograms {
  return kg(value * KG_PER_POUND);
}
