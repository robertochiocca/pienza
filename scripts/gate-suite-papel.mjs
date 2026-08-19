#!/usr/bin/env node
/**
 * Gate de papel da suite de banco.
 *
 * O defeito que originou este gate: vinte e quatro assercoes de isolamento estavam
 * verdes sobre um programa diferente do que roda em producao. Elas exercitavam o
 * banco como superusuario, que ignora privilegio, enquanto o app roda como
 * `authenticated`. Uma funcao de gatilho sem permissao de DELETE passou por elas
 * sem ser notada, e o efeito real era o app nao conseguir corrigir uma medida.
 *
 * Corrigir aquela funcao fecha a instancia. Nao fecha a classe: nada impedia a
 * proxima assercao de nascer como superusuario e ficar verde pelo mesmo motivo, e
 * da proxima vez pode nao haver bug obvio apontando para ela.
 *
 * Entao o invariante e este, e ele e verificado e nao lembrado:
 *
 *   - toda assercao roda sob papel declarado explicitamente no arquivo
 *   - o papel esperado e `authenticated`, que e como o app se conecta
 *   - rodar como superusuario exige `-- papel: superusuario porque <motivo>`
 *   - o marcador vale ate a proxima troca de papel, e nao vale para o arquivo
 *
 * E o `FORCE ROW LEVEL SECURITY` aplicado a propria suite: torna o erro impossivel
 * de cometer em silencio, em vez de contar com alguem lembrar.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NEGATIVAS, POSITIVAS } from './fixtures/suite-papel.fixtures.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIRETORIO_TESTES = 'supabase/tests';

/**
 * Funcoes do pgTAP que emitem uma linha de TAP. `plan` e `finish` ficam de fora:
 * elas nao exercitam o banco, so delimitam.
 */
const ASSERCOES = new Set([
  'ok',
  'is',
  'isnt',
  'matches',
  'imatches',
  'doesnt_match',
  'alike',
  'unalike',
  'cmp_ok',
  'pass',
  'fail',
  'is_empty',
  'isnt_empty',
  'lives_ok',
  'throws_ok',
  'throws_like',
  'throws_ilike',
  'throws_matching',
  'results_eq',
  'results_ne',
  'set_eq',
  'set_ne',
  'bag_eq',
  'bag_ne',
  'row_eq',
  'has_table',
  'has_column',
  'has_index',
  'col_is_pk',
  'col_not_null',
  'policies_are',
  'table_privs_are',
  'column_privs_are',
]);

const CHAMADA = /^\s*select\s+(\*\s+from\s+)?([a-z_]+)\s*\(/i;
const DEFINE_PAPEL = /^\s*set\s+local\s+role\s+([a-z_]+)\s*;/i;
const LIMPA_PAPEL = /^\s*reset\s+role\s*;/i;
const MARCADOR = /--\s*papel:\s*superusuario\s+porque\s+(\S.*)$/i;

const SUPERUSUARIO = 'superusuario';

/**
 * Percorre o arquivo como automato. Devolve os problemas encontrados.
 *
 * O papel inicial e superusuario porque e assim que o runner se conecta — a suite
 * comeca com privilegio total e precisa abrir mao dele explicitamente.
 */
export function analisar(sql) {
  const problemas = [];
  let papel = SUPERUSUARIO;
  let autorizado = false;

  sql.split('\n').forEach((linha, i) => {
    const numero = i + 1;

    const marcador = MARCADOR.exec(linha);
    if (marcador) {
      const motivo = marcador[1].trim();
      if (motivo.length < 8) {
        problemas.push(`${numero}: marcador de superusuario sem motivo escrito`);
      } else {
        autorizado = true;
      }
      return;
    }

    const define = DEFINE_PAPEL.exec(linha);
    if (define) {
      papel = define[1].toLowerCase();
      autorizado = false;
      return;
    }

    if (LIMPA_PAPEL.test(linha)) {
      papel = SUPERUSUARIO;
      autorizado = false;
      return;
    }

    const chamada = CHAMADA.exec(linha);
    if (!chamada) return;
    const funcao = chamada[2].toLowerCase();
    if (!ASSERCOES.has(funcao)) return;

    if (papel === SUPERUSUARIO && !autorizado) {
      problemas.push(
        `${numero}: assercao ${funcao}() roda como superusuario sem marcador. ` +
          `Declare o papel, ou escreva "-- papel: superusuario porque <motivo>"`,
      );
    }
  });

  return problemas;
}

function autoTeste() {
  const falhas = [];

  for (const [nome, sql] of POSITIVAS) {
    if (analisar(sql).length === 0) falhas.push(`nao acusou: ${nome}`);
  }
  for (const [nome, sql] of NEGATIVAS) {
    const problemas = analisar(sql);
    if (problemas.length > 0) falhas.push(`acusou indevidamente: ${nome} — ${problemas[0]}`);
  }

  if (falhas.length > 0) {
    console.error('\nauto-teste do gate de papel: as regras nao fazem o que dizem\n');
    for (const falha of falhas) console.error(`  ${falha}`);
    console.error('');
    process.exit(1);
  }
  console.log(`auto-teste do gate de papel: ${POSITIVAS.length + NEGATIVAS.length} casos ok`);
}

autoTeste();

if (process.argv.includes('--auto-teste')) {
  process.exit(0);
}

const diretorio = join(ROOT, DIRETORIO_TESTES);
const arquivos = readdirSync(diretorio)
  .filter((nome) => /^\d{3}_.*\.sql$/.test(nome))
  .sort();

const problemas = [];
for (const nome of arquivos) {
  const caminho = join(diretorio, nome);
  for (const problema of analisar(readFileSync(caminho, 'utf8'))) {
    problemas.push(`${relative(ROOT, caminho)}:${problema}`);
  }
}

if (problemas.length > 0) {
  console.error(`\ngate de papel da suite: ${problemas.length} assercao(oes) sem papel\n`);
  for (const problema of problemas) console.error(`  ${problema}`);
  console.error('');
  process.exit(1);
}

console.log(
  `gate de papel da suite: ${arquivos.length} arquivos, toda assercao com papel declarado`,
);
