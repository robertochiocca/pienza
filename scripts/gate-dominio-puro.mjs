#!/usr/bin/env node
/**
 * Gate de pureza do packages/domain.
 *
 * A regra de lint `no-restricted-imports` ja barra React, React Native, Expo e as
 * APIs de Node por nome. Ela nao cobre o caso que de fato acontece: alguem instala
 * uma biblioteca util — um date-fns, um zod — importa no dominio, e o lint passa
 * porque a biblioteca nao esta na lista de proibidos. O dominio deixa de ter zero
 * dependencias sem que nada fique vermelho.
 *
 * Este gate fecha isso por estrutura em vez de por lista: `packages/domain` nao
 * declara dependencia nenhuma, e nenhum arquivo de `src/` importa especificador que
 * nao seja relativo. Qualquer dependencia nova precisa passar por aqui, o que
 * significa passar por uma decisao.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DOMAIN = join(ROOT, 'packages/domain');

const problems = [];

const manifest = JSON.parse(readFileSync(join(DOMAIN, 'package.json'), 'utf8'));
for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
  const declared = Object.keys(manifest[field] ?? {});
  if (declared.length > 0) {
    problems.push(`packages/domain/package.json declara ${field}: ${declared.join(', ')}`);
  }
}

/**
 * Casa `from '...'`, `import '...'` e `import('...')`. Um especificador que nao
 * comeca com `.` e externo ao pacote.
 */
const SPECIFIER = /(?:\bfrom\s*|(?:^|[^.\w])import\s*(?:\(\s*)?)['"]([^'"]+)['"]/g;

function* walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith('.ts')) yield full;
  }
}

for (const file of walk(join(DOMAIN, 'src'))) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(SPECIFIER)) {
    const specifier = match[1];
    if (specifier !== undefined && !specifier.startsWith('.')) {
      problems.push(`${relative(ROOT, file)} importa "${specifier}", que e externo ao pacote`);
    }
  }
}

if (problems.length === 0) {
  console.log('gate de dominio puro: packages/domain segue sem dependencias');
  process.exit(0);
}

console.error('\ngate de dominio puro: o dominio deixou de ser puro\n');
for (const problem of problems) console.error(`  ${problem}`);
console.error('\nO calculo de proporcao precisa rodar em teste unitario sem app.');
console.error('Se a dependencia for mesmo necessaria, ela e uma decisao — escreva a ADR.\n');
process.exit(1);
