/**
 * Fixtures do gate de quadro: arvores de caixas sinteticas, no formato que o
 * navegador devolve.
 */

function caixa(nome, x, largura, extras = {}) {
  return { nome, x, largura, ...extras };
}

export const casos = [
  {
    nome: 'tudo dentro do quadro',
    quadro: { largura: 390 },
    caixas: [caixa('tela', 0, 390), caixa('rotulo', 31, 328), caixa('rodape', 0, 390)],
    esperado: 'passa',
  },
  {
    // O defeito real do ciclo 6: o campo de 105pt tinha largura intrinseca de 1293pt e
    // a caixa da tela crescia com ele. O quadro recortava, e a captura parecia legitima.
    nome: 'elemento mais largo que o quadro',
    quadro: { largura: 390 },
    caixas: [caixa('tela', 0, 1410), caixa('numero', 117, 1293)],
    esperado: 'reprova',
    contem: '1410',
  },
  {
    nome: 'elemento que comeca dentro e termina fora',
    quadro: { largura: 390 },
    caixas: [caixa('tela', 0, 390), caixa('rodape', 241, 200)],
    esperado: 'reprova',
    contem: 'passa da borda direita',
  },
  {
    nome: 'elemento que comeca antes da borda esquerda',
    quadro: { largura: 390 },
    caixas: [caixa('tela', 0, 390), caixa('valor', -12, 100)],
    esperado: 'reprova',
    contem: 'borda esquerda',
  },
  {
    // A faixa de vaos sangra ate a borda de proposito: termina exatamente em 390.
    nome: 'elemento que encosta exatamente na borda passa',
    quadro: { largura: 390 },
    caixas: [caixa('tela', 0, 390), caixa('vaos', 31, 359)],
    esperado: 'passa',
  },
  {
    // Subpixel de arredondamento do navegador nao e transbordo.
    nome: 'meio pixel de folga nao reprova',
    quadro: { largura: 390 },
    caixas: [caixa('tela', 0, 390.4), caixa('vaos', 31, 359.3)],
    esperado: 'passa',
  },
  {
    nome: 'um pixel e meio ja reprova',
    quadro: { largura: 390 },
    caixas: [caixa('tela', 0, 391.5)],
    esperado: 'reprova',
  },
  {
    // Sem esta regra, o quadro poderia estar do tamanho errado e tudo caberia nele.
    nome: 'quadro com largura diferente da declarada reprova',
    quadro: { largura: 390, larguraDeclarada: 375 },
    caixas: [caixa('tela', 0, 390)],
    esperado: 'reprova',
    contem: 'declarada',
  },
  {
    nome: 'quadro sem caixa nenhuma reprova',
    quadro: { largura: 390 },
    caixas: [],
    esperado: 'reprova',
    contem: 'nenhum elemento',
  },
];
