/** Fixtures do gate de prazos. `hoje` e sempre explicito: gate que le o relogio real
 *  no teste passa hoje e reprova em setembro. */

const HOJE = new Date('2026-08-20T00:00:00Z');

function prazo(extras = {}) {
  return {
    id: 'exemplo',
    vence_em: '2026-09-01',
    condicao: 'pacote_presente',
    manifesto: 'apps/exemplo/package.json',
    pacote: 'expo',
    ...extras,
  };
}

export const casos = [
  {
    nome: 'lista vazia passa',
    prazos: [],
    manifestos: {},
    hoje: HOJE,
    esperado: 'passa',
  },
  {
    nome: 'dentro do prazo e condicao ainda nao satisfeita: passa',
    prazos: [prazo()],
    manifestos: { 'apps/exemplo/package.json': { dependencies: {}, devDependencies: {} } },
    hoje: HOJE,
    esperado: 'passa',
  },
  {
    nome: 'passou da data e a condicao nao foi satisfeita: reprova',
    prazos: [prazo()],
    manifestos: { 'apps/exemplo/package.json': { dependencies: {}, devDependencies: {} } },
    hoje: new Date('2026-09-02T00:00:00Z'),
    esperado: 'reprova',
    contem: 'venceu',
  },
  {
    nome: 'no dia exato ainda nao venceu',
    prazos: [prazo()],
    manifestos: { 'apps/exemplo/package.json': { dependencies: {}, devDependencies: {} } },
    hoje: new Date('2026-09-01T00:00:00Z'),
    esperado: 'passa',
  },
  {
    // Espelha a regra da lista de auditoria: entrada que sobreviveu ao motivo reprova.
    nome: 'condicao ja satisfeita reprova mesmo dentro do prazo',
    prazos: [prazo()],
    manifestos: { 'apps/exemplo/package.json': { dependencies: { expo: '54.0.0' } } },
    hoje: HOJE,
    esperado: 'reprova',
    contem: 'ja foi cumprida',
  },
  {
    nome: 'condicao pacote_ausente satisfeita reprova',
    prazos: [prazo({ condicao: 'pacote_ausente', pacote: 'react-native' })],
    manifestos: { 'apps/exemplo/package.json': { dependencies: {} } },
    hoje: HOJE,
    esperado: 'reprova',
    contem: 'ja foi cumprida',
  },
  {
    nome: 'condicao pacote_ausente nao satisfeita dentro do prazo passa',
    prazos: [prazo({ condicao: 'pacote_ausente', pacote: 'react-native' })],
    manifestos: { 'apps/exemplo/package.json': { devDependencies: { 'react-native': '0.87.0' } } },
    hoje: HOJE,
    esperado: 'passa',
  },
  {
    nome: 'manifesto inexistente reprova em vez de passar em silencio',
    prazos: [prazo()],
    manifestos: {},
    hoje: HOJE,
    esperado: 'reprova',
    contem: 'nao foi encontrado',
  },
  {
    nome: 'data invalida reprova',
    prazos: [prazo({ vence_em: 'quando der' })],
    manifestos: { 'apps/exemplo/package.json': { dependencies: {} } },
    hoje: HOJE,
    esperado: 'reprova',
    contem: 'data',
  },
  {
    nome: 'condicao desconhecida reprova',
    prazos: [prazo({ condicao: 'quando_eu_sentir' })],
    manifestos: { 'apps/exemplo/package.json': { dependencies: {} } },
    hoje: HOJE,
    esperado: 'reprova',
    contem: 'condicao',
  },
];
