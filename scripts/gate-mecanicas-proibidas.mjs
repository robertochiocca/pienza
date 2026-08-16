#!/usr/bin/env node
/**
 * Gate da lista de mecanicas proibidas (docs/decisoes/0002-mecanicas-proibidas.md).
 *
 * Por que existe: as mecanicas da lista sao o repertorio reflexo da categoria.
 * Streak, badge e notificacao de cobranca nao entram num app por decisao — entram
 * por copia, numa sprint apertada, dentro de um PR que parece inofensivo. Enquanto
 * a recusa for principio escrito em documento, ela depende de alguem lembrar. Como
 * gate que reprova o build, ela para de depender.
 *
 * O que este gate NAO faz, e e importante nao fingir que faz: ele casa vocabulario
 * e chamada de API. Ele nao le semantica. "Copy que atribua valor a uma direcao de
 * mudanca corporal" nao e detectavel por regex — uma frase pode violar a ADR sem
 * conter nenhum termo desta lista. Os itens marcados `gate: parcial` e
 * `gate: nenhum` na ADR continuam sendo responsabilidade da revisao humana. Um gate
 * que se anuncia como cobertura total e pior que gate nenhum, porque desliga a
 * atencao de quem revisa.
 *
 * Escape: uma linha que contenha `gate-mecanicas: permitido <motivo>` e ignorada.
 * O motivo e obrigatorio — excecao sem justificativa escrita e divida escondida.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Codigo e copy. `docs/` fica fora: la os termos precisam aparecer para serem discutidos. */
const SCAN_ROOTS = ['packages', 'apps', 'supabase', 'scripts'];
const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.sql', '.json']);
const SKIP_DIRECTORIES = new Set(['node_modules', 'dist', 'coverage', '.expo', '.git']);
const SKIP_FILES = new Set(['scripts/gate-mecanicas-proibidas.mjs']);

const ESCAPE = /gate-mecanicas:\s*permitido\s+\S+/i;

/**
 * Quebra camelCase, PascalCase, snake_case e kebab-case em palavras separadas.
 *
 * Sem isto o gate e quase decorativo: `\bstreak\b` nao casa `streakDays` nem
 * `userStreak`, porque entre `k` e `D` nao ha fronteira de palavra — e identificador
 * em codigo e justamente onde o termo aparece. Descobri isso testando o gate contra
 * um arquivo de prova: das tres violacoes plantadas, ele pegou uma.
 *
 * Cada linha e testada nas duas formas, original e normalizada, porque a
 * normalizacao quebra os padroes que dependem do hifen (`expo-notifications`).
 */
function normalize(line) {
  return line
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ');
}

/**
 * `proximity` casa dois grupos na mesma linha dentro de uma janela curta. Serve para
 * os itens em que o termo isolado e legitimo e so a combinacao e proibida: "peso" e
 * um dado que o app guarda, "progresso" e uma palavra comum, e "peso ... progresso"
 * e a moldura que a ADR recusa.
 */
const RULES = [
  {
    id: 'continuidade',
    item: 'Streak, sequencia, contador de continuidade',
    patterns: [
      /\bstreaks?\b/i,
      /\b(dias|semanas|meses)\s+(seguidos?|seguidas?|consecutivos?|consecutivas?)\b/i,
      /\bconsecutive\s+(days|weeks|months)\b/i,
      /\bquebrar\s+a\s+sequ[êe]ncia\b/i,
      /\bsequ[êe]ncia\s+de\s+check-?ins?\b/i,
    ],
  },
  {
    id: 'recompensa',
    item: 'Badge, trofeu, medalha, nivel, XP',
    patterns: [
      /\bbadges?\b/i,
      /\btroph(y|ies)\b/i,
      /\btrof[ée]us?\b/i,
      /\bmedalhas?\b/i,
      /\bmedals?\b/i,
      /\bachievements?\b/i,
      /\bconquistas?\b/i,
      /\bgamif/i,
      /\bxp\b/i,
      /\blevel[\s_-]?up\b/i,
      /\bpontos?\s+de\s+experi[êe]ncia\b/i,
    ],
  },
  {
    id: 'notificacao',
    item: 'Notificacao cobrando check-in atrasado',
    patterns: [
      /scheduleNotificationAsync/,
      /setNotificationHandler/,
      /\bexpo-notifications\b/,
      /@notifee\b/,
      /react-native-push-notification/,
      /PushNotificationIOS/,
      /\bnode-schedule\b/,
      /\bnode-cron\b/,
    ],
  },
  {
    id: 'social',
    item: 'Ranking, comparacao ou visibilidade entre usuarios',
    patterns: [
      /\bleaderboards?\b/i,
      /\brankings?\b/i,
      /\bplacar\b/i,
      /\bfollowers?\b/i,
      /\bseguidores\b/i,
      /\bfeed\s+social\b/i,
    ],
  },
  {
    id: 'ingestao',
    item: 'Meta calorica, macro, deficit, alvo numerico de ingestao',
    patterns: [
      /\bcal[oó]ri/i,
      /\bcalories\b/i,
      /\bkcal\b/i,
      /\bmacros?\b/i,
      /\bd[ée]ficit\b/i,
      /\bcarboidratos?\b/i,
    ],
  },
  {
    id: 'corpo-simulado',
    item: 'Imagem gerada do corpo futuro do usuario',
    patterns: [
      /\bantes\s*e\s*depois\b/i,
      /\bbefore\s*(and|&|\/)\s*after\b/i,
      /\bcorpo\s+futuro\b/i,
    ],
  },
  {
    id: 'peso-como-progresso',
    item: 'Linha de peso apresentada como progresso',
    proximity: { left: /\b(peso|weight)\b/i, right: /\bprogress/i, window: 48 },
  },
  {
    id: 'inspiracao-como-alvo',
    item: 'Foto de inspiracao convertida em alvo numerico',
    proximity: {
      left: /\binspira[çc][ãa]o\b/i,
      right: /\b(meta|alvo|target|score|percentual)\b/i,
      window: 48,
    },
  },
];

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

function matchProximity(line, { left, right, window }) {
  const leftHit = left.exec(line);
  const rightHit = right.exec(line);
  if (!leftHit || !rightHit) return null;
  const distance = Math.abs(leftHit.index - rightHit.index);
  if (distance > window) return null;
  return `${leftHit[0]} ... ${rightHit[0]}`;
}

/** Regras que casam nesta linha. Vazio quando a linha esta limpa. */
function scanLine(line) {
  if (ESCAPE.test(line)) return [];
  const formas = [line, normalize(line)];
  const hits = [];
  for (const rule of RULES) {
    if (rule.proximity) {
      const hit = formas.map((f) => matchProximity(f, rule.proximity)).find(Boolean);
      if (hit) hits.push({ rule, hit });
      continue;
    }
    const hit = rule.patterns
      .flatMap((pattern) => formas.map((f) => pattern.exec(f)))
      .find(Boolean);
    if (hit) hits.push({ rule, hit: hit[0] });
  }
  return hits;
}

/**
 * Auto-teste das regras.
 *
 * Um gate que nunca foi visto reprovando e indistinguivel de um gate quebrado, e
 * essa e a forma de falha mais provavel aqui: ele passa a acusar nada, o build fica
 * verde, e a lista vira enfeite. Os casos negativos importam tanto quanto os
 * positivos — um gate que acusa demais e desligado na primeira semana.
 */
const FIXTURES_POSITIVAS = [
  ['continuidade', 'const streakDays = 7;'],
  ['continuidade', 'const userStreak = contarSemanas();'],
  ['continuidade', 'texto: "3 semanas seguidas"'],
  ['recompensa', 'render(<Badge value={3} />)'],
  ['recompensa', 'const experienceXP = 120;'],
  ['recompensa', 'const award_medal = true;'],
  ['notificacao', "import * as N from 'expo-notifications';"],
  ['notificacao', 'await Notifications.scheduleNotificationAsync(cfg);'],
  ['social', 'const leaderboardQuery = sql;'],
  ['social', 'label: "seguidores"'],
  ['ingestao', "const meta = 'meta calorica diaria';"],
  ['ingestao', 'const alvo = 2000; // kcal'],
  ['ingestao', 'const deficit = 500;'],
  ['corpo-simulado', 'titulo: "antes e depois"'],
  ['peso-como-progresso', 'label: "seu progresso de peso"'],
  ['inspiracao-como-alvo', 'const d = distanciaAteInspiracao(meta);'],
];

const FIXTURES_NEGATIVAS = [
  'const expression = /abc/;',
  'const carregamentoProgressivo = true;',
  'select * from sequencia_de_migrations;',
  'const rankByDate = (a, b) => a.date - b.date;',
  'const weight = medidas.weight;',
  '<ProgressBar value={0.4} />',
  'const experimento = false;',
];

function autoTeste() {
  const falhas = [];

  for (const [esperado, linha] of FIXTURES_POSITIVAS) {
    const ids = scanLine(linha).map((h) => h.rule.id);
    if (!ids.includes(esperado)) {
      falhas.push(`nao acusou [${esperado}]: ${linha}`);
    }
  }

  for (const linha of FIXTURES_NEGATIVAS) {
    const ids = scanLine(linha).map((h) => h.rule.id);
    if (ids.length > 0) {
      falhas.push(`acusou indevidamente [${ids.join(', ')}]: ${linha}`);
    }
  }

  if (falhas.length > 0) {
    console.error('\nauto-teste do gate de mecanicas: as regras nao fazem o que dizem\n');
    for (const falha of falhas) console.error(`  ${falha}`);
    console.error('');
    process.exit(1);
  }

  const total = FIXTURES_POSITIVAS.length + FIXTURES_NEGATIVAS.length;
  console.log(`auto-teste do gate de mecanicas: ${total} casos ok`);
}

// O auto-teste roda sempre, antes da varredura, e nao atras de uma flag opcional.
// Flag opcional significa que ele so roda quando alguem lembra, que e exatamente a
// dependencia que este gate existe para remover.
autoTeste();

if (process.argv.includes('--auto-teste')) {
  process.exit(0);
}

const findings = [];

for (const root of SCAN_ROOTS) {
  const absolute = join(ROOT, root);
  try {
    statSync(absolute);
  } catch {
    continue;
  }
  for (const file of walk(absolute)) {
    const rel = relative(ROOT, file);
    if (SKIP_FILES.has(rel)) continue;
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      for (const { rule, hit } of scanLine(line)) {
        findings.push({ rel, line: index + 1, rule, hit });
      }
    });
  }
}

if (findings.length === 0) {
  console.log('gate de mecanicas proibidas: nenhuma ocorrencia');
  process.exit(0);
}

console.error(`\ngate de mecanicas proibidas: ${findings.length} ocorrencia(s)\n`);
for (const { rel, line, rule, hit } of findings) {
  console.error(`  ${rel}:${line}  [${rule.id}] "${hit}"`);
  console.error(`      ${rule.item}`);
}
console.error('\nVer docs/decisoes/0002-mecanicas-proibidas.md.');
console.error('Se a ocorrencia for legitima, anote na linha: gate-mecanicas: permitido <motivo>\n');
process.exit(1);
