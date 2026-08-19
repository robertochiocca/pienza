/** Um check-in, reduzido ao que a escolha de comparacao precisa saber. */
export interface CheckinRef {
  readonly id: string;
  readonly takenAt: Date;
}

/**
 * Resultado da escolha do alvo de comparacao.
 *
 * Estado carimbado com motivo, e nunca `null`: `nenhuma` e um fato sobre o
 * historico, e a tela precisa dizer qual fato e — nao desenhar um poligono
 * degenerado nem um hexagono regular fingindo comparacao.
 */
export type Comparison =
  | {
      readonly status: 'nenhuma';
      readonly motivo: 'sem_historico';
    }
  | {
      /** Nenhum check-in atinge a janela; o alvo passa a ser o baseline. */
      readonly status: 'baseline';
      readonly target: CheckinRef;
      readonly intervalDays: number;
    }
  | {
      readonly status: 'ok';
      readonly target: CheckinRef;
      readonly intervalDays: number;
    };
