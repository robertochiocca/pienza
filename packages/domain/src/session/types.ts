/** Lado de uma medida. `na` para medida que nao e de membro par. */
export type Side = 'l' | 'r' | 'na';

/**
 * Estrutural ancora proporcao por nao mudar; variavel e o que se move. A
 * classificacao vive em `measurement_keys.kind` no banco e chega aqui como dado —
 * classificar uma medida e decisao de dominio e vai ser revista.
 */
export type MeasurementKind = 'structural' | 'variable';

/** Como o valor entrou: digitado naquele check-in, ou mantido do anterior. */
export type Provenance = 'typed' | 'kept';

/**
 * Uma entrada do vocabulario de medidas.
 *
 * O vocabulario e passado como argumento e nunca embutido aqui. Ele e uma tabela, e
 * o dominio nao pode ter uma segunda copia dele que envelheca em silencio.
 */
export interface MeasurementSpec {
  readonly key: string;
  readonly labelPtBr: string;
  readonly unit: 'cm' | 'kg';
  readonly bilateral: boolean;
  readonly kind: MeasurementKind;
  readonly displayOrder: number;
}

/** Ultimo valor conhecido de uma medida, e quando ele foi de fato digitado. */
export interface PreviousValue {
  readonly key: string;
  readonly side: Side;
  readonly value: number;
  readonly lastTypedAt: Date;
}

/** Um passo da sequencia guiada: uma medida, um lado, uma tela. */
export interface SessionStep {
  readonly id: string;
  readonly key: string;
  readonly side: Side;
  readonly labelPtBr: string;
  readonly unit: 'cm' | 'kg';
  readonly kind: MeasurementKind;
  /** Valor do check-in anterior, quando existe. Nunca e alvo — e referencia. */
  readonly previousValue: number | null;
  /** Se a tela abre com o valor anterior ja preenchido. */
  readonly prefilled: boolean;
}

/** Valor que atravessa o check-in sem virar passo, porque remedi-lo nao informa nada. */
export interface CarriedValue {
  readonly key: string;
  readonly side: Side;
  readonly value: number;
}

export interface SessionPlan {
  readonly steps: readonly SessionStep[];
  readonly carried: readonly CarriedValue[];
}

/** O que a pessoa fez em um passo. */
export type Answer =
  | { readonly kind: 'typed'; readonly value: number }
  | { readonly kind: 'kept' }
  | { readonly kind: 'skipped' };

/** Uma linha pronta para `measurement_values`. */
export interface ResolvedEntry {
  readonly key: string;
  readonly side: Side;
  readonly value: number;
  readonly provenance: Provenance;
}

export type ResolveResult =
  | { readonly status: 'ok'; readonly entries: readonly ResolvedEntry[] }
  | { readonly status: 'invalid'; readonly reasons: readonly string[] };
