/**
 * Fixtures do gate de auditoria: relatorios sinteticos no formato de `npm audit --json`,
 * reduzidos ao que o gate le.
 */

function relatorio(entradas) {
  const vulnerabilities = {};
  for (const [nome, dados] of Object.entries(entradas)) {
    vulnerabilities[nome] = {
      name: nome,
      severity: dados.severidade,
      via: dados.advisories.map((url) => ({ url, severity: dados.severidade, title: 'sintetico' })),
    };
  }
  return { vulnerabilities };
}

const A = 'https://github.com/advisories/GHSA-aaaa-aaaa-aaaa';
const B = 'https://github.com/advisories/GHSA-bbbb-bbbb-bbbb';

const MANIFESTO = { 'apps/exemplo/package.json': { dependencies: { expo: '57.0.0' } } };
const SEM_EXPO = { 'apps/exemplo/package.json': { dependencies: {} } };

export const casos = [
  {
    nome: 'arvore limpa e lista vazia',
    relatorio: relatorio({}),
    aceitas: [],
    esperado: 'passa',
  },
  {
    nome: 'advisory nao listado reprova',
    relatorio: relatorio({ alguma: { severidade: 'low', advisories: [A] } }),
    aceitas: [],
    esperado: 'reprova',
    contem: 'GHSA-aaaa-aaaa-aaaa',
  },
  {
    nome: 'advisory listado passa',
    relatorio: relatorio({ alguma: { severidade: 'high', advisories: [A] } }),
    aceitas: [{ advisory: 'GHSA-aaaa-aaaa-aaaa', severidade_maxima: 'high' }],
    esperado: 'passa',
  },
  {
    nome: 'dois advisories, um listado: reprova pelo outro',
    relatorio: relatorio({
      alguma: { severidade: 'high', advisories: [A] },
      outra: { severidade: 'moderate', advisories: [B] },
    }),
    aceitas: [{ advisory: 'GHSA-aaaa-aaaa-aaaa', severidade_maxima: 'high' }],
    esperado: 'reprova',
    contem: 'GHSA-bbbb-bbbb-bbbb',
  },
  {
    // O caso que faz a lista nao virar permissao permanente.
    nome: 'entrada que nao casa mais reprova',
    relatorio: relatorio({}),
    aceitas: [{ advisory: 'GHSA-aaaa-aaaa-aaaa', severidade_maxima: 'high' }],
    esperado: 'reprova',
    contem: 'nao aparece mais',
  },
  {
    // Sobe dentro da faixa aceitavel, sem tocar em critical: as duas regras sao
    // separadas e cada uma precisa reprovar sozinha.
    nome: 'severidade acima da declarada reprova mesmo estando na lista',
    relatorio: relatorio({ alguma: { severidade: 'high', advisories: [A] } }),
    aceitas: [{ advisory: 'GHSA-aaaa-aaaa-aaaa', severidade_maxima: 'low' }],
    esperado: 'reprova',
    contem: 'subiu',
  },
  {
    // O identificador tem que sair na mensagem como ele e escrito no advisory, senao
    // colar a mensagem numa busca nao acha nada.
    nome: 'a mensagem devolve o identificador na forma original',
    relatorio: relatorio({ alguma: { severidade: 'low', advisories: [A] } }),
    aceitas: [],
    esperado: 'reprova',
    contem: 'GHSA-aaaa-aaaa-aaaa',
  },
  {
    // Critical nunca entra por lista. Uma excecao aqui seria a unica capaz de manter
    // verde um build que precisa parar.
    nome: 'critical nao pode ser aceito nem declarado',
    relatorio: relatorio({ alguma: { severidade: 'critical', advisories: [A] } }),
    aceitas: [{ advisory: 'GHSA-aaaa-aaaa-aaaa', severidade_maxima: 'critical' }],
    esperado: 'reprova',
    contem: 'critical',
  },
  {
    // A premissa da aceitacao vence quando o mundo muda. Prosa nao dispara; condicao sim.
    nome: 'premissa vencida reprova mesmo com o advisory listado',
    relatorio: relatorio({ alguma: { severidade: 'high', advisories: [A] } }),
    aceitas: [
      {
        advisory: 'GHSA-aaaa-aaaa-aaaa',
        severidade_maxima: 'high',
        reabrir_se: {
          condicao: 'pacote_presente',
          manifesto: 'apps/exemplo/package.json',
          pacote: 'expo',
        },
      },
    ],
    manifestos: MANIFESTO,
    esperado: 'reprova',
    contem: 'venceu',
  },
  {
    nome: 'premissa ainda valida passa',
    relatorio: relatorio({ alguma: { severidade: 'high', advisories: [A] } }),
    aceitas: [
      {
        advisory: 'GHSA-aaaa-aaaa-aaaa',
        severidade_maxima: 'high',
        reabrir_se: {
          condicao: 'pacote_presente',
          manifesto: 'apps/exemplo/package.json',
          pacote: 'expo',
        },
      },
    ],
    manifestos: SEM_EXPO,
    esperado: 'passa',
  },
  {
    // Condicao que nao da para avaliar e condicao que nunca dispara.
    nome: 'reabrir_se sobre manifesto inexistente reprova',
    relatorio: relatorio({ alguma: { severidade: 'high', advisories: [A] } }),
    aceitas: [
      {
        advisory: 'GHSA-aaaa-aaaa-aaaa',
        severidade_maxima: 'high',
        reabrir_se: {
          condicao: 'pacote_presente',
          manifesto: 'apps/some-nada/package.json',
          pacote: 'expo',
        },
      },
    ],
    manifestos: SEM_EXPO,
    esperado: 'reprova',
    contem: 'nao foi encontrado',
  },
  {
    nome: 'mesmo advisory chegando por dois pacotes conta uma vez so',
    relatorio: relatorio({
      alguma: { severidade: 'high', advisories: [A] },
      outra: { severidade: 'high', advisories: [A] },
    }),
    aceitas: [{ advisory: 'GHSA-aaaa-aaaa-aaaa', severidade_maxima: 'high' }],
    esperado: 'passa',
  },
];
