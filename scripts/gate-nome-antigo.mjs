#!/usr/bin/env node
/**
 * Gate do nome antigo (docs/decisoes/0006-nome-pienza.md).
 *
 * O projeto se chamou Ryven ate o fim da Fase 0. Renomear o que esta escrito e a
 * parte facil; o que quebra depois e o nome voltando aos poucos — num identificador
 * copiado de um arquivo velho, numa variavel de ambiente, num comentario. Nome
 * meio trocado e pior que nome nao trocado, porque some do lugar visivel e fica no
 * bundle identifier.
 *
 * A allowlist e o que faz este gate sobreviver. O nome antigo *precisa* aparecer na
 * ADR que registra a renomeacao e nos relatorios ja escritos: eles sao registro
 * historico, e reescreve-los seria apagar que a renomeacao aconteceu. Sem allowlist
 * o gate reprovaria o proprio registro e seria desligado na terceira falha falsa —
 * que e como gates morrem.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NEGATIVAS, POSITIVAS } from './fixtures/nome.fixtures.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const NOME_ANTIGO = /ryven/i;

const SCAN_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.sql',
  '.json',
  '.md',
  '.txt',
  '.yml',
  '.yaml',
  '.toml',
  '.sh',
]);

const SKIP_DIRECTORIES = new Set(['node_modules', 'dist', 'coverage', '.expo', '.git', 'fixtures']);

/**
 * Registro historico: o nome antigo aparece aqui por ser o assunto, e apagar seria
 * mentir sobre o que aconteceu. Esta lista e fechada de proposito — arquivo novo
 * nasce com o nome novo, e um relatorio futuro que precise citar o nome antigo entra
 * aqui por decisao, nao por padrao.
 */
const ALLOWLIST = new Set([
  'scripts/fixtures/nome.fixtures.mjs',
  'docs/decisoes/0006-nome-pienza.md',
  'docs/relatorios/0001-fase-0-encerramento.txt',
  'CHANGELOG.md',
  'scripts/gate-nome-antigo.mjs',
]);

function* walk(directory) {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || SKIP_DIRECTORIES.has(entry.name)) continue;
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (SCAN_EXTENSIONS.has(entry.name.slice(entry.name.lastIndexOf('.')))) {
      yield full;
    }
  }
}

/** Casa o nome antigo nesta linha. `null` quando limpa. */
function scanLine(line) {
  const hit = NOME_ANTIGO.exec(line);
  return hit ? hit[0] : null;
}

function autoTeste() {
  const falhas = [];
  for (const linha of POSITIVAS) {
    if (!scanLine(linha)) falhas.push(`nao acusou: ${linha}`);
  }
  for (const linha of NEGATIVAS) {
    const hit = scanLine(linha);
    if (hit) falhas.push(`acusou indevidamente "${hit}": ${linha}`);
  }
  if (falhas.length > 0) {
    console.error('\nauto-teste do gate de nome: as regras nao fazem o que dizem\n');
    for (const falha of falhas) console.error(`  ${falha}`);
    console.error('');
    process.exit(1);
  }
  const total = POSITIVAS.length + NEGATIVAS.length;
  console.log(`auto-teste do gate de nome: ${total} casos ok`);
}

autoTeste();

if (process.argv.includes('--auto-teste')) {
  process.exit(0);
}

const findings = [];

for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file);
  if (ALLOWLIST.has(rel)) continue;
  // O lock e gerado; se o nome antigo estiver la, a correcao e reinstalar, nao editar.
  if (rel === 'package-lock.json') {
    if (NOME_ANTIGO.test(readFileSync(file, 'utf8'))) {
      findings.push({ rel, line: 0, hit: 'package-lock.json desatualizado — rode npm install' });
    }
    continue;
  }
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, index) => {
      const hit = scanLine(line);
      if (hit) findings.push({ rel, line: index + 1, hit });
    });
}

// Confere que a allowlist nao apodreceu: entrada que aponta para arquivo inexistente
// e allowlist virando lixo, e lixo em allowlist e o comeco de uma allowlist grande
// demais para alguem ler.
for (const permitido of ALLOWLIST) {
  try {
    statSync(join(ROOT, permitido));
  } catch {
    if (permitido !== 'CHANGELOG.md') {
      findings.push({ rel: permitido, line: 0, hit: 'entrada de allowlist sem arquivo' });
    }
  }
}

if (findings.length === 0) {
  console.log('gate de nome antigo: nenhuma ocorrencia');
  process.exit(0);
}

console.error(`\ngate de nome antigo: ${findings.length} ocorrencia(s)\n`);
for (const { rel, line, hit } of findings) {
  console.error(`  ${rel}:${line}  "${hit}"`);
}
console.error('\nO projeto se chama Pienza. Ver docs/decisoes/0006-nome-pienza.md.');
console.error('Registro historico entra na ALLOWLIST deste script, por decisao.\n');
process.exit(1);
