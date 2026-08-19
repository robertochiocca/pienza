/**
 * Gate do harness: a captura so vale se a tela couber no quadro.
 *
 * No ciclo 6, a tela media 1410 pontos de largura dentro de um quadro de 390. O quadro
 * recortava com `overflow: hidden`, entao o que saiu da captura foi uma tela plausivel
 * com o rodape inteiro fora do campo de visao. Achei porque medi a arvore de caixas
 * com o navegador; olhando a imagem, ela parecia certa.
 *
 * E essa a razao de o gate existir e de ele reprovar a captura e nao so o build:
 * captura que mente com cara de captura e pior que captura ausente. Uma captura
 * ausente para o ciclo; uma captura errada entra no relatorio e vira base de decisao.
 *
 * A funcao e pura — recebe arvore de caixas, devolve problemas — para ter fixtures e
 * auto-teste como os outros gates. Quem fala com o navegador e capturar.mjs.
 */

/**
 * Tolerancia em pontos. O navegador devolve largura fracionaria por arredondamento de
 * layout, e reprovar em 390,4 contra 390 seria um gate que dispara sozinho — e gate que
 * dispara sozinho e desligado.
 */
const FOLGA = 1;

export function problemas(caixas, quadro) {
  const achados = [];

  if (
    quadro.larguraDeclarada !== undefined &&
    Math.abs(quadro.largura - quadro.larguraDeclarada) > FOLGA
  ) {
    achados.push(
      `o quadro mede ${quadro.largura} e a largura declarada do aparelho e ${quadro.larguraDeclarada}`,
    );
  }

  // Sem esta checagem, um seletor que parou de casar produz zero caixas, zero
  // problemas e um gate verde sobre uma pagina que nao carregou.
  if (caixas.length === 0) {
    achados.push('nenhum elemento medido dentro do quadro: o seletor casou com nada');
    return achados;
  }

  for (const caixa of caixas) {
    if (caixa.largura > quadro.largura + FOLGA) {
      achados.push(
        `${caixa.nome} mede ${arredondar(caixa.largura)} num quadro de ${quadro.largura}`,
      );
      continue;
    }
    if (caixa.x < -FOLGA) {
      achados.push(`${caixa.nome} comeca em ${arredondar(caixa.x)}, antes da borda esquerda`);
      continue;
    }
    if (caixa.x + caixa.largura > quadro.largura + FOLGA) {
      achados.push(
        `${caixa.nome} termina em ${arredondar(caixa.x + caixa.largura)} e passa da borda direita, que e ${quadro.largura}`,
      );
    }
  }

  return achados;
}

function arredondar(n) {
  return Math.round(n * 10) / 10;
}

export async function autoTeste() {
  const { casos } = await import('../../../scripts/fixtures/quadro.fixtures.mjs');
  const falhas = [];

  for (const caso of casos) {
    const achados = problemas(caso.caixas, caso.quadro);
    const passou = achados.length === 0;
    if (passou !== (caso.esperado === 'passa')) {
      falhas.push(
        `${caso.nome}: esperava ${caso.esperado}, obteve ${passou ? 'passa' : 'reprova'}`,
      );
      continue;
    }
    if (caso.contem !== undefined && !achados.join('\n').includes(caso.contem)) {
      falhas.push(`${caso.nome}: reprovou, mas a mensagem nao menciona "${caso.contem}"`);
    }
  }

  if (falhas.length > 0) {
    const erro = new Error(`auto-teste do gate de quadro falhou:\n  ${falhas.join('\n  ')}`);
    throw erro;
  }

  return casos.length;
}
