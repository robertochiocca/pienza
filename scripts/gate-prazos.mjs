#!/usr/bin/env node
/**
 * Gate de dividas com prazo.
 *
 * Divida declarada com data e o padrao que o AGENTS.md ja exige em 1.5, e ate agora a
 * data era texto num comentario: ninguem a le no dia em que ela vence. Este gate faz a
 * data ser mecanica.
 *
 * Duas regras, as mesmas do gate de auditoria e pelo mesmo motivo:
 *
 *   1. Prazo vencido com a condicao de saida nao cumprida reprova o build.
 *   2. Condicao ja cumprida reprova tambem, mesmo dentro do prazo — a entrada existe
 *      para descrever uma divida viva, e uma entrada que descreve divida paga e ruido
 *      que ensina a ignorar o arquivo.
 *
 * Prorrogar continua sendo possivel e passa a ser um ato: reescrever a data e o motivo,
 * num commit, em vez de a divida vencer sem ninguem notar.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { avaliar as avaliarCondicao, lerManifestos } from './condicoes.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

export function avaliar(prazos, manifestos, hoje, raiz) {
  const problemas = [];

  for (const prazo of prazos) {
    const rotulo = prazo.id ?? '(sem id)';

    const vence = new Date(`${prazo.vence_em}T00:00:00Z`);
    if (Number.isNaN(vence.getTime())) {
      problemas.push(`${rotulo}: "${prazo.vence_em}" nao e uma data no formato AAAA-MM-DD`);
      continue;
    }

    const resultado = avaliarCondicao(prazo, manifestos, raiz);
    if (!resultado.ok) {
      problemas.push(`${rotulo}: ${resultado.motivo}`);
      continue;
    }

    const cumprida = resultado.satisfeita;

    if (cumprida) {
      problemas.push(
        `${rotulo}: a condicao de saida ja foi cumprida (${prazo.condicao} ${prazo.pacote}). ` +
          `Remova a entrada de scripts/prazos.json.`,
      );
      continue;
    }

    if (hoje.getTime() > vence.getTime()) {
      const dias = Math.floor((hoje.getTime() - vence.getTime()) / 86_400_000);
      problemas.push(
        `${rotulo}: o prazo venceu em ${prazo.vence_em}, ha ${dias} dia(s), e a condicao ` +
          `de saida nao foi cumprida.\n      Saida combinada: ${prazo.saida_alternativa ?? prazo.saida ?? '(nao escrita)'}`,
      );
    }
  }

  return problemas;
}

async function autoTeste() {
  const { casos } = await import('./fixtures/prazos.fixtures.mjs');
  const falhas = [];

  for (const caso of casos) {
    const problemas = avaliar(caso.prazos, caso.manifestos, caso.hoje, ROOT);
    const passou = problemas.length === 0;
    if (passou !== (caso.esperado === 'passa')) {
      falhas.push(
        `${caso.nome}: esperava ${caso.esperado}, obteve ${passou ? 'passa' : 'reprova'}`,
      );
      continue;
    }
    if (caso.contem !== undefined && !problemas.join('\n').includes(caso.contem)) {
      falhas.push(`${caso.nome}: reprovou, mas a mensagem nao menciona "${caso.contem}"`);
    }
  }

  if (falhas.length > 0) {
    console.error('gate de prazos: o auto-teste falhou\n');
    for (const f of falhas) console.error(`  ${f}`);
    process.exit(1);
  }
  return casos.length;
}

const casos = await autoTeste();

const lista = JSON.parse(readFileSync(new URL('./prazos.json', import.meta.url), 'utf8'));
const prazos = lista.prazos ?? [];

const problemas = avaliar(prazos, lerManifestos(prazos, ROOT), new Date(), ROOT);

if (problemas.length === 0) {
  console.log(
    `gate de prazos: ${prazos.length} divida(s) dentro do prazo, ${casos} casos de auto-teste`,
  );
  process.exit(0);
}

console.error('gate de prazos: reprovado\n');
for (const p of problemas) console.error(`  ${p}`);
console.error('\nOu a divida sai, ou a entrada em scripts/prazos.json e reescrita com nova');
console.error('data e novo motivo. Prorrogar e permitido; prorrogar em silencio nao e.');
process.exit(1);
