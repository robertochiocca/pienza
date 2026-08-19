import palettes from './palettes.json';

/** Papel declarado de um token, que define o limiar de contraste cobrado no gate. */
export type UsoDeToken = 'fundo' | 'texto' | 'grafico' | 'decorativo';

export interface Token {
  readonly valor: string;
  readonly uso: UsoDeToken;
  readonly papel: string;
}

export interface Paleta {
  readonly modo: 'light' | 'dark';
  readonly fundo: string;
  readonly tokens: Readonly<Record<string, Token>>;
}

/**
 * As duas paletas. Bandeira e a clara, Noturno a escura, com a mesma distribuicao:
 * vermelho como cromo, preto e branco carregando o resto.
 *
 * Nenhum literal de cor existe fora de `palettes.json`, e scripts/gate-cores.mjs
 * reprova o build se aparecer, se o contraste cair abaixo do papel declarado, ou se
 * o conjunto ganhar um segundo matiz cromatico.
 */
export const paletas = palettes.paletas as unknown as Readonly<Record<string, Paleta>>;

export const bandeira = paletas['bandeira'] as Paleta;
export const noturno = paletas['noturno'] as Paleta;
