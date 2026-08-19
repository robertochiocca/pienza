import type { Brand } from './brand';

/**
 * O dominio inteiro trabalha em unidades canonicas: comprimento em centimetros,
 * massa em quilogramas. A preferencia de exibicao do usuario (`unit_system`) e'
 * aplicada apenas na borda, na entrada e na saida — nunca no meio do calculo.
 * Ver `convert.ts`.
 */
export type Centimeters = Brand<number, 'Centimeters'>;
export type Kilograms = Brand<number, 'Kilograms'>;

/**
 * Casas decimais da representacao canonica. Espelha `numeric(6,2)` no Postgres:
 * o que o dominio calcula e o que o banco guarda precisam arredondar igual, senao
 * um valor faz round-trip e volta diferente.
 */
export const STORAGE_DECIMALS = 2;

const STORAGE_SCALE = 10 ** STORAGE_DECIMALS;

function assertFiniteMagnitude(value: number, unit: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Valor em ${unit} precisa ser finito, recebido: ${String(value)}`);
  }
  if (value < 0) {
    throw new RangeError(`Valor em ${unit} nao pode ser negativo, recebido: ${String(value)}`);
  }
}

/**
 * Arredonda para a precisao canonica de armazenamento.
 *
 * Nao usa `toFixed` porque `toFixed` devolve string e reintroduz parsing;
 * o objetivo aqui e' manter o valor como numero do inicio ao fim.
 */
export function roundToStorage(value: number): number {
  return Math.round(value * STORAGE_SCALE) / STORAGE_SCALE;
}

/**
 * Constroi um comprimento canonico em centimetros.
 *
 * Rejeita apenas o que e' impossivel como grandeza fisica (nao finito, negativo).
 * Faixas plausiveis por tipo de medida — "cintura entre X e Y" — sao validacao de
 * medida, nao de unidade, e vivem em outro modulo. Nada aqui e' limiar de saude.
 */
export function cm(value: number): Centimeters {
  assertFiniteMagnitude(value, 'cm');
  return roundToStorage(value) as Centimeters;
}

/** Constroi uma massa canonica em quilogramas. Mesmas regras de `cm`. */
export function kg(value: number): Kilograms {
  assertFiniteMagnitude(value, 'kg');
  return roundToStorage(value) as Kilograms;
}
