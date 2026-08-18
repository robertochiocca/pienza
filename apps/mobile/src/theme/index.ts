import { paletas, type Paleta } from '@pienza/tokens';

/**
 * A tela nunca escreve cor. Ela pede um token pelo papel que ele exerce, e quem
 * decide o valor e `packages/tokens`. O gate de cores reprova qualquer literal
 * fora daquele arquivo, entao esta e a unica porta.
 */
export type NomeDePaleta = 'bandeira' | 'noturno';

export function paleta(nome: NomeDePaleta): Paleta {
  const escolhida = paletas[nome];
  if (escolhida === undefined) throw new Error(`paleta desconhecida: ${nome}`);
  return escolhida;
}

export function cor(p: Paleta, token: string): string {
  const t = p.tokens[token];
  if (t === undefined) throw new Error(`token desconhecido: ${token}`);
  return t.valor;
}

/**
 * Famílias genéricas por enquanto. As faces definitivas — serifada para o numero,
 * mono para rotulo — entram como arquivo de fonte junto com o Expo; ate la o
 * registro tipografico ja e o certo, so nao e a face escolhida.
 */
export const FAMILIA = {
  numero: 'serif',
  interface: 'system-ui',
  mono: 'monospace',
} as const;

/** Escala 11 / 15 / 78, mantida em proporcao da largura da tela. */
export function escala(largura: number) {
  return {
    rotulo: Math.round(largura * 0.034),
    corpo: Math.round(largura * 0.039),
    numero: Math.round(largura * 0.27),
  };
}

/**
 * Cor de acao textual — "confirmar" no rodape.
 *
 * Nao e um token so. Na Bandeira o `brand` esta declarado como uso de grafico e nao
 * passa o limiar de texto sobre branco, entao existe o `action`, um vermelho mais
 * escuro; no Noturno o `brand` ja e claro o bastante sobre o fundo preto e passa como
 * texto, entao nao ha um segundo vermelho — e nem deveria haver, porque um segundo
 * vermelho ali seria matiz nova sem funcao.
 *
 * A tela pedia `action` direto e quebrava ao trocar para Noturno. O erro so apareceu
 * quando as duas paletas rodaram na mesma sessao, que e o argumento inteiro do
 * alternador em tempo de execucao.
 */
export function corDeAcao(p: Paleta): string {
  return p.tokens['action']?.valor ?? cor(p, 'brand');
}
