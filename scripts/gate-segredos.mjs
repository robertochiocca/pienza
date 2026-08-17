#!/usr/bin/env node
/**
 * Gate de segredo no codigo.
 *
 * A chave anonima do Supabase e publica por desenho e pode ir no bundle: ela so e
 * segura porque a RLS existe. A `service_role` e o oposto — ela ignora RLS inteira,
 * e uma copia dela dentro do app entrega todas as contas de uma vez. As duas sao
 * strings parecidas, chegam pela mesma tela do painel, e a troca de uma pela outra
 * e um erro de dois segundos com consequencia total.
 *
 * Por isso o gate procura o padrao de chave de servico e de segredo generico em
 * `apps/` e `packages/`, que e o que vai para o dispositivo. Ele nao varre
 * `supabase/` nem `scripts/`, onde o nome do papel aparece legitimamente em SQL de
 * concessao.
 *
 * Segredo que ja entrou no historico nao e resolvido por este gate: rode
 * `--historico` para varrer os commits.
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const RAIZES_CLIENTE = ['apps', 'packages'];
const EXTENSOES = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.env']);
const PULAR_DIR = new Set(['node_modules', 'dist', 'coverage', '.expo']);
const PULAR_ARQUIVO = new Set(['scripts/gate-segredos.mjs']);

const PADROES = [
  {
    id: 'supabase-service-role',
    // Sem fronteira de palavra: `_` conta como caractere de palavra, entao `\b` nao
    // casa SUPABASE_SERVICE_ROLE_KEY — que e exatamente a forma em que o nome
    // aparece. O auto-teste pegou isto na primeira execucao.
    regex: /service[_-]?role/i,
    motivo: 'chave de servico ignora RLS inteira e nunca vai para o dispositivo',
    // Este padrao so faz sentido no codigo que vai para o dispositivo: em SQL de
    // concessao `service_role` e o nome do papel, e acusa-lo la e ruido que faz
    // alguem desligar o gate.
    somenteCliente: true,
  },
  {
    id: 'supabase-secret',
    regex: /\bsb_secret_[A-Za-z0-9_-]{10,}/,
    motivo: 'segredo de projeto do Supabase',
  },
  {
    id: 'jwt',
    regex: /\beyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{10,}/,
    motivo: 'token JWT literal no codigo',
  },
  {
    id: 'chave-privada',
    regex: /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/,
    motivo: 'chave privada',
  },
  { id: 'aws', regex: /\bAKIA[0-9A-Z]{16}\b/, motivo: 'chave de acesso AWS' },
  { id: 'github', regex: /\bgh[pousr]_[A-Za-z0-9]{20,}/, motivo: 'token do GitHub' },
];

function* percorrer(diretorio) {
  let entradas;
  try {
    entradas = readdirSync(diretorio, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entrada of entradas) {
    if (entrada.name.startsWith('.') || PULAR_DIR.has(entrada.name)) continue;
    const completo = join(diretorio, entrada.name);
    if (entrada.isDirectory()) yield* percorrer(completo);
    else if (EXTENSOES.has(entrada.name.slice(entrada.name.lastIndexOf('.')))) yield completo;
  }
}

function achadosNaLinha(linha) {
  return PADROES.filter((padrao) => padrao.regex.test(linha));
}

const FIXTURES_POSITIVAS = [
  ['supabase-service-role', 'const key = process.env.SUPABASE_SERVICE_ROLE_KEY;'],
  ['supabase-secret', 'const k = "sb_secret_9aKq2LmNqR4tYuVw";'],
  ['jwt', 'const t = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0";'],
  ['aws', 'AKIAIOSFODNN7EXAMPLE'],
  ['github', 'ghp_1234567890abcdefghijKLMNOPQRSTUVWX'],
];

const FIXTURES_NEGATIVAS = [
  'const url = process.env.SUPABASE_URL;',
  'const key = process.env.SUPABASE_PUBLISHABLE_KEY;',
  'const papel = "authenticated";',
  'grant select on checkins to authenticated;',
  'const servico = criarServico();',
];

function autoTeste() {
  const falhas = [];
  for (const [esperado, linha] of FIXTURES_POSITIVAS) {
    if (!achadosNaLinha(linha).some((p) => p.id === esperado)) {
      falhas.push(`nao acusou [${esperado}]: ${linha}`);
    }
  }
  for (const linha of FIXTURES_NEGATIVAS) {
    const ids = achadosNaLinha(linha).map((p) => p.id);
    if (ids.length > 0) falhas.push(`acusou indevidamente [${ids.join(', ')}]: ${linha}`);
  }
  if (falhas.length > 0) {
    console.error('\nauto-teste do gate de segredos: as regras nao fazem o que dizem\n');
    for (const falha of falhas) console.error(`  ${falha}`);
    console.error('');
    process.exit(1);
  }
  console.log(
    `auto-teste do gate de segredos: ${FIXTURES_POSITIVAS.length + FIXTURES_NEGATIVAS.length} casos ok`,
  );
}

function varrerHistorico() {
  // Duas reescritas de historico ja aconteceram neste repositorio. Esta e a hora
  // barata de confirmar que nada entrou antes delas: o custo cresce com o numero de
  // commits, e um segredo no historico nao sai com um commit de remocao.
  const saida = execFileSync('git', ['rev-list', '--all'], { cwd: ROOT, encoding: 'utf8' });
  const commits = saida.split('\n').filter(Boolean);
  const achados = [];

  for (const commit of commits) {
    const patch = execFileSync('git', ['show', '--format=', '--unified=0', commit], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    // O patch nao carrega caminho em cada linha, entao o arquivo corrente vem do
    // cabecalho `+++ b/...`. Sem isso a varredura de historico aplicaria a padroes
    // de codigo de cliente linhas que sao de SQL, e acusaria o nome do papel numa
    // concessao legitima.
    let arquivoCorrente = '';
    for (const linha of patch.split('\n')) {
      if (linha.startsWith('+++ ')) {
        arquivoCorrente = linha.slice(4).replace(/^b\//, '');
        continue;
      }
      if (!linha.startsWith('+')) continue;
      // O proprio gate e as suas fixtures vivem no historico a partir deste commit.
      if (linha.includes('FIXTURES_') || arquivoCorrente.includes('gate-segredos')) continue;
      const noCliente = RAIZES_CLIENTE.some((raiz) => arquivoCorrente.startsWith(`${raiz}/`));
      for (const padrao of PADROES) {
        if (padrao.somenteCliente === true && !noCliente) continue;
        if (padrao.regex.test(linha)) {
          achados.push(`${commit.slice(0, 8)} ${arquivoCorrente} [${padrao.id}]`);
        }
      }
    }
  }

  if (achados.length > 0) {
    console.error(`\nvarredura de historico: ${achados.length} ocorrencia(s)\n`);
    for (const achado of achados) console.error(`  ${achado}`);
    console.error('');
    process.exit(1);
  }
  console.log(`varredura de historico: ${commits.length} commits, nenhum segredo`);
}

autoTeste();

if (process.argv.includes('--historico')) {
  varrerHistorico();
  process.exit(0);
}

const problemas = [];

for (const raiz of RAIZES_CLIENTE) {
  const absoluto = join(ROOT, raiz);
  try {
    statSync(absoluto);
  } catch {
    continue;
  }
  for (const arquivo of percorrer(absoluto)) {
    const rel = relative(ROOT, arquivo);
    if (PULAR_ARQUIVO.has(rel)) continue;
    readFileSync(arquivo, 'utf8')
      .split('\n')
      .forEach((linha, i) => {
        for (const padrao of achadosNaLinha(linha)) {
          problemas.push(`${rel}:${i + 1} [${padrao.id}] ${padrao.motivo}`);
        }
      });
  }
}

if (problemas.length > 0) {
  console.error(`\ngate de segredos: ${problemas.length} ocorrencia(s) no codigo do cliente\n`);
  for (const problema of problemas) console.error(`  ${problema}`);
  console.error('');
  process.exit(1);
}

console.log('gate de segredos: nada no codigo que vai para o dispositivo');
