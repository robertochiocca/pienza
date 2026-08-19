#!/usr/bin/env node
/**
 * Gate de cor (docs/decisoes/0010-paletas-bandeira-e-noturno.md).
 *
 * Tres coisas, e as tres reprovam o build:
 *
 * 1. CONTRASTE. Cada token e cobrado no limiar do papel que ele mesmo declara.
 *    Contraste conferido a olho envelhece: alguem escurece um token dois pontos
 *    para "ficar melhor" e o botao passa a reprovar sem ninguem perceber.
 *
 * 2. MATIZ UNICO. O conjunto tem um matiz cromatico, vermelho, mais neutros. E a
 *    protecao estrutural contra semaforo: nao existe segunda cor com que montar o
 *    par verde/vermelho. Um unico verde reconstruiria o par sozinho, porque quem
 *    olha completa — por isso a faixa verde e recusada nominalmente, alem da
 *    contagem.
 *
 * 3. LITERAL FORA DO ARQUIVO DE TOKENS. Cor escrita direto no componente e como o
 *    segundo matiz entra sem passar por decisao nenhuma.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ARQUIVO_TOKENS = 'packages/tokens/src/palettes.json';

const LIMIAR = { texto: 4.5, grafico: 3, fundo: 0, decorativo: 0 };

/** Abaixo disto o token e neutro e nao conta como matiz. O neutro mais colorido
 *  das duas paletas tem croma 0.043, entao 0.06 separa com folga. */
const CROMA_MINIMO = 0.06;

/** Tolerancia para dois tons contarem como o mesmo matiz. Os vermelhos das duas
 *  paletas caem entre 356 e 5 graus, que e a mesma familia. */
const TOLERANCIA_MATIZ = 20;

const FAIXA_VERDE = [75, 165];

function canais(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
}

function luminancia(hex) {
  const [r, g, b] = canais(hex).map((v) =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a, b) {
  const [l1, l2] = [luminancia(a), luminancia(b)];
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function matiz(hex) {
  const [r, g, b] = canais(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const croma = max - min;
  if (croma < CROMA_MINIMO) return null;
  let h;
  if (max === r) h = ((g - b) / croma) % 6;
  else if (max === g) h = (b - r) / croma + 2;
  else h = (r - g) / croma + 4;
  return (((h * 60) % 360) + 360) % 360;
}

function distanciaAngular(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

const problemas = [];
const dados = JSON.parse(readFileSync(join(ROOT, ARQUIVO_TOKENS), 'utf8'));

// ------------------------------------------------------------------ contraste --
const matizesEncontrados = [];

for (const [nomePaleta, paleta] of Object.entries(dados.paletas)) {
  const fundo = paleta.tokens[paleta.fundo];
  if (fundo === undefined) {
    problemas.push(`${nomePaleta}: token de fundo "${paleta.fundo}" nao existe`);
    continue;
  }

  for (const [nomeToken, token] of Object.entries(paleta.tokens)) {
    const h = matiz(token.valor);
    if (h !== null) matizesEncontrados.push({ paleta: nomePaleta, token: nomeToken, hue: h });

    const minimo = LIMIAR[token.uso];
    if (minimo === undefined) {
      problemas.push(`${nomePaleta}.${nomeToken}: uso "${token.uso}" nao existe`);
      continue;
    }
    if (minimo === 0) continue;

    const razao = contraste(token.valor, fundo.valor);
    if (razao < minimo) {
      problemas.push(
        `${nomePaleta}.${nomeToken} (${token.valor}) da ${razao.toFixed(2)} sobre ` +
          `${paleta.fundo}, e o uso "${token.uso}" exige ${minimo}`,
      );
    }
  }
}

for (const par of dados.pares) {
  const paleta = dados.paletas[par.paleta];
  if (paleta === undefined) {
    problemas.push(`par aponta para paleta inexistente: ${par.paleta}`);
    continue;
  }
  const fundo = paleta.tokens[par.fundo];
  if (fundo === undefined) {
    problemas.push(`par em ${par.paleta} aponta para token inexistente: ${par.fundo}`);
    continue;
  }
  const razao = contraste(par.frente, fundo.valor);
  const minimo = LIMIAR[par.uso];
  if (razao < minimo) {
    problemas.push(
      `par ${par.paleta}: ${par.frente} sobre ${par.fundo} (${fundo.valor}) da ` +
        `${razao.toFixed(2)}, e exige ${minimo} — ${par.papel}`,
    );
  }
}

// --------------------------------------------------------------- matiz unico --
const grupos = [];
for (const { hue } of matizesEncontrados) {
  const grupo = grupos.find((g) => distanciaAngular(g, hue) <= TOLERANCIA_MATIZ);
  if (grupo === undefined) grupos.push(hue);
}

if (grupos.length > 1) {
  problemas.push(
    `o conjunto tem ${grupos.length} matizes cromaticos (${grupos
      .map((h) => `${h.toFixed(0)}deg`)
      .join(', ')}). O contrato e um. Um segundo matiz exige ADR datada.`,
  );
}

for (const { paleta, token, hue } of matizesEncontrados) {
  if (hue >= FAIXA_VERDE[0] && hue <= FAIXA_VERDE[1]) {
    problemas.push(
      `${paleta}.${token} cai na faixa verde (${hue.toFixed(0)}deg). Um verde reconstroi ` +
        `o semaforo sozinho, porque quem olha completa o par.`,
    );
  }
}

// ------------------------------------------------------- literal fora do lugar --
const RAIZES = ['packages', 'apps', 'scripts', 'supabase'];
const EXTENSOES = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.sql']);
const PULAR_DIR = new Set(['node_modules', 'dist', 'coverage', '.expo', 'fixtures']);
const PULAR_ARQUIVO = new Set([ARQUIVO_TOKENS, 'scripts/gate-cores.mjs']);
const HEX = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/;

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

for (const raiz of RAIZES) {
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
        const achado = HEX.exec(linha);
        if (achado) {
          problemas.push(
            `${rel}:${i + 1} tem literal de cor "${achado[0]}" fora de ${ARQUIVO_TOKENS}`,
          );
        }
      });
  }
}

// ------------------------------------------------------------------ resultado --
if (problemas.length > 0) {
  console.error(`\ngate de cores: ${problemas.length} problema(s)\n`);
  for (const problema of problemas) console.error(`  ${problema}`);
  console.error('');
  process.exit(1);
}

const totalTokens = Object.values(dados.paletas).reduce(
  (soma, p) => soma + Object.keys(p.tokens).length,
  0,
);
console.log(
  `gate de cores: ${totalTokens} tokens e ${dados.pares.length} pares no contraste exigido, ` +
    `${grupos.length} matiz cromatico`,
);
