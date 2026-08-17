import type { CheckinRef, Comparison } from './types';

const MILLISECONDS_PER_DAY = 86_400_000;

/** Dias inteiros entre dois instantes, sempre positivo. */
export function daysBetween(earlier: Date, later: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / MILLISECONDS_PER_DAY);
}

export interface ComparisonInput {
  readonly current: CheckinRef;
  /** Todos os check-ins do usuario, incluindo ou nao o atual. Ordem irrelevante. */
  readonly history: readonly CheckinRef[];
  /**
   * Distancia minima, em dias, entre o atual e o alvo. Vem de
   * `product_settings.comparison_min_days` e nao tem valor padrao aqui de proposito:
   * e numero de produto, e quem chama assume a decisao no ponto de chamada.
   */
  readonly minDaysApart: number;
  /** Check-in que abre o baseline vigente, quando existe. */
  readonly baseline: CheckinRef | null;
}

/**
 * Escolhe contra qual check-in o hexagono compara.
 *
 * A regra nao e duracao fixa: e o check-in mais recente que seja pelo menos
 * `minDaysApart` dias mais antigo que o atual. Assim cadencia irregular deixa de ser
 * caso especial — quem mede terca, quarta e depois some por dois meses cai na mesma
 * regra de quem mede toda semana.
 *
 * O alvo e sempre um check-in real. Nao ha interpolacao e nao ha ponto inventado: um
 * ponto que ninguem mediu apresentado ao lado de um que alguem mediu e ruido com a
 * mesma aparencia de sinal.
 */
export function selectComparison(input: ComparisonInput): Comparison {
  const anteriores = input.history
    .filter(
      (c) => c.id !== input.current.id && c.takenAt.getTime() < input.current.takenAt.getTime(),
    )
    .sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());

  if (anteriores.length === 0) {
    return { status: 'nenhuma', motivo: 'sem_historico' };
  }

  const naJanela = anteriores.find(
    (c) => daysBetween(c.takenAt, input.current.takenAt) >= input.minDaysApart,
  );

  if (naJanela !== undefined) {
    return {
      status: 'ok',
      target: naJanela,
      intervalDays: daysBetween(naJanela.takenAt, input.current.takenAt),
    };
  }

  // Ha historico, e todo ele mais novo que a janela. Comparar contra o vizinho
  // imediato mostraria hidratacao; comparar contra o baseline mostra o intervalo
  // mais longo que existe, que e o menos ruidoso disponivel.
  if (input.baseline === null || input.baseline.id === input.current.id) {
    return { status: 'nenhuma', motivo: 'sem_historico' };
  }

  return {
    status: 'baseline',
    target: input.baseline,
    intervalDays: daysBetween(input.baseline.takenAt, input.current.takenAt),
  };
}
