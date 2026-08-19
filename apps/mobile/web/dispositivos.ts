/**
 * Metricas de aparelho, em pontos logicos.
 *
 * O harness existe para nao julgar a tela num retangulo inventado. Os numeros de
 * tela sao os publicados pelos fabricantes; os de teclado sao medidos de captura e
 * portanto aproximados — o que importa deles e a ordem de grandeza, que e "um terco
 * da tela", e essa nao muda com dois ou tres pontos de erro.
 */
export interface Dispositivo {
  readonly nome: string;
  readonly largura: number;
  readonly altura: number;
  /** Altura do teclado numerico, em pontos. */
  readonly teclado: number;
  /** Faixa de sistema no topo. */
  readonly topo: number;
  /** Indicador de home ou barra de navegacao no rodape. */
  readonly base: number;
  readonly plataforma: 'ios' | 'android';
}

export const DISPOSITIVOS: readonly Dispositivo[] = [
  {
    nome: 'iPhone 13',
    largura: 390,
    altura: 844,
    teclado: 291,
    topo: 47,
    base: 34,
    plataforma: 'ios',
  },
  {
    nome: 'iPhone SE',
    largura: 375,
    altura: 667,
    teclado: 260,
    topo: 20,
    base: 0,
    plataforma: 'ios',
  },
  {
    nome: 'Pixel 5',
    largura: 393,
    altura: 851,
    teclado: 270,
    topo: 24,
    base: 24,
    plataforma: 'android',
  },
];

/**
 * Como o teclado interage com a janela.
 *
 * `encolhe` e o Android com `adjustResize`: a janela diminui e o layout se refaz.
 * `cobre` e o iOS: a janela nao muda e o teclado sobrepoe o que estiver embaixo. Sao
 * comportamentos diferentes o bastante para quebrar coisas diferentes, e ver so um
 * dos dois e ver metade.
 */
export type ModoDeTeclado = 'nenhum' | 'encolhe' | 'cobre';

export function modoPadrao(d: Dispositivo): ModoDeTeclado {
  return d.plataforma === 'ios' ? 'cobre' : 'encolhe';
}
