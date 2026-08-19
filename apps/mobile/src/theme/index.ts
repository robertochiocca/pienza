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
 * Conjuntos tipograficos candidatos.
 *
 * O registro — serifada para o numero, sem serifa para interface, mono para rotulo —
 * esta decidido desde o ciclo 4. O que nao esta decidida e a face, e por isso a escolha
 * e parametro e nao constante: as tres candidatas rodam na mesma tela, com o mesmo
 * teclado, para serem comparadas no estado em que a tela e vista.
 *
 * Todas as faces sao OFL, que e a licenca que permite embarcar em app sem negociacao.
 * `generico` continua existindo e continua sendo o padrao: enquanto ninguem escolher,
 * o app usa o que o aparelho tem, e nenhuma captura passa por face escolhida sem
 * alguem ter escolhido.
 */
export type NomeDeFonte = 'generico' | 'a' | 'b' | 'c';

export interface Familia {
  readonly numero: string;
  readonly interface: string;
  readonly mono: string;
}

const FONTES: Readonly<Record<NomeDeFonte, Familia>> = {
  generico: { numero: 'serif', interface: 'system-ui', mono: 'monospace' },
  // A — Instrument Serif no numero: serifada de display, contraste alto, feita para
  // corpo grande. Inter na interface e JetBrains Mono no rotulo.
  a: { numero: 'Instrument Serif', interface: 'Inter', mono: 'JetBrains Mono' },
  // B — Fraunces no numero: serifada com mais personalidade e eixo variavel.
  // Public Sans e IBM Plex Mono ao redor.
  b: { numero: 'Fraunces', interface: 'Public Sans', mono: 'IBM Plex Mono' },
  // C — Newsreader no numero: serifada editorial, mais quieta que as outras duas.
  // IBM Plex Sans e Space Mono ao redor.
  c: { numero: 'Newsreader', interface: 'IBM Plex Sans', mono: 'Space Mono' },
};

export function familia(nome: NomeDeFonte): Familia {
  return FONTES[nome];
}

/** O conjunto em vigor enquanto ninguem escolheu. */
export const FAMILIA = FONTES.generico;

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
