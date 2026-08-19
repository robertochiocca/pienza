#!/usr/bin/env node
/**
 * Gate de auditoria de dependencia.
 *
 * Substitui `npm audit --audit-level=low` puro. O limiar continua sendo "qualquer
 * coisa reprova"; o que muda e o que acontece quando aparece um advisory que nao da
 * para corrigir hoje.
 *
 * Com `--audit-level` a unica saida e subir o limiar, e subir o limiar por causa de um
 * advisory desliga o gate para todos os outros — inclusive os que ainda nao existem.
 * Aqui a saida e nominal: o advisory entra em scripts/auditoria-aceita.json com
 * pacote, caminho, data e motivo escrito, e todo o resto continua reprovando.
 *
 * Tres regras que fazem a lista nao virar permissao permanente:
 *
 *   1. Advisory fora da lista reprova, em qualquer severidade.
 *   2. Entrada da lista que nao casa com nenhum advisory reprova. Excecao que
 *      sobrevive ao motivo e como um repositorio acumula permissao sem decisao.
 *   3. `critical` nao pode ser aceito. Se um dia so der para seguir aceitando um
 *      critical, isso tem que passar por mudar este arquivo, e nao por editar uma
 *      lista de dados.
 *   4. A premissa da aceitacao e verificada, e nao so escrita. Uma entrada pode
 *      declarar `reabrir_se`, com a mesma gramatica de condicao do gate de prazos;
 *      quando a condicao se cumpre, o build reprova ate a entrada ser reescrita.
 *
 * A regra 4 nasceu de um caso concreto. Os dois advisories do image-size foram aceitos
 * porque "este repositorio nao executa Metro", e a linha `quando_reabrir` dizia, em
 * prosa, que a analise mudaria de dono no dia em que o Expo entrasse. O Expo entrou no
 * ciclo 9, o Metro passou a rodar, e o gate nao teve como notar: prosa nao dispara. A
 * premissa tinha vencido e a aceitacao continuava verde.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { avaliar as avaliarCondicao, lerManifestos } from './condicoes.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const ORDEM = ['info', 'low', 'moderate', 'high', 'critical'];
const ID = /GHSA-[0-9a-z-]+/i;

/**
 * Reduz o relatorio do npm a um mapa advisory -> severidade maxima observada.
 *
 * O npm repete o mesmo advisory em cada pacote da cadeia que depende do vulneravel:
 * dois problemas em image-size viram sete linhas. Contar linha em vez de advisory
 * faria a lista precisar de uma entrada por pacote intermediario, e um pacote novo no
 * meio do caminho reprovaria o build sem nenhum problema novo ter surgido.
 */
export function advisoriesDo(relatorio) {
  const encontrados = new Map();

  for (const vulnerabilidade of Object.values(relatorio.vulnerabilities ?? {})) {
    for (const via of vulnerabilidade.via ?? []) {
      if (typeof via === 'string') continue;
      const casado = ID.exec(via.url ?? '');
      if (casado === null) continue;
      // Chave em caixa alta para casar sem depender de como alguem digitou na lista;
      // `id` guarda a forma original porque e ela que vai para a mensagem, e um
      // identificador reescrito em caixa alta deixa de casar com a busca no advisory.
      const chave = casado[0].toUpperCase();
      const severidade = via.severity ?? vulnerabilidade.severity ?? 'info';
      const anterior = encontrados.get(chave);
      if (
        anterior === undefined ||
        ORDEM.indexOf(severidade) > ORDEM.indexOf(anterior.severidade)
      ) {
        encontrados.set(chave, { id: casado[0], severidade });
      }
    }
  }

  return encontrados;
}

export function avaliar(relatorio, aceitas, manifestos = {}, raiz = ROOT) {
  const problemas = [];
  const encontrados = advisoriesDo(relatorio);
  const porId = new Map(aceitas.map((a) => [String(a.advisory).toUpperCase(), a]));

  for (const [chave, { id, severidade }] of encontrados) {
    const aceita = porId.get(chave);

    if (aceita === undefined) {
      problemas.push(`${id} (${severidade}) nao esta em scripts/auditoria-aceita.json`);
      continue;
    }

    if (severidade === 'critical') {
      problemas.push(
        `${id} e critical. Critical nao entra por lista: ou some da arvore, ou esta regra muda no gate.`,
      );
      continue;
    }

    const declarada = aceita.severidade_maxima ?? 'info';
    if (ORDEM.indexOf(severidade) > ORDEM.indexOf(declarada)) {
      problemas.push(
        `${id} subiu de ${declarada} para ${severidade} desde que foi aceito. A aceitacao foi escrita sobre a severidade antiga.`,
      );
      continue;
    }

    if (aceita.reabrir_se !== undefined) {
      const resultado = avaliarCondicao(aceita.reabrir_se, manifestos, raiz);
      if (!resultado.ok) {
        problemas.push(`${id}: nao consegui avaliar reabrir_se — ${resultado.motivo}`);
      } else if (resultado.satisfeita) {
        problemas.push(
          `${id}: a premissa da aceitacao venceu (${aceita.reabrir_se.condicao} ${aceita.reabrir_se.pacote ?? aceita.reabrir_se.caminho}). ` +
            `Reescreva o motivo em scripts/auditoria-aceita.json.\n      O que mudou: ${aceita.reabrir_se.o_que_muda ?? '(nao escrito)'}`,
        );
      }
    }
  }

  for (const [chave, aceita] of porId) {
    if (!encontrados.has(chave)) {
      problemas.push(
        `${aceita.advisory} esta aceito mas nao aparece mais na arvore. Isso e boa noticia: remova a entrada de scripts/auditoria-aceita.json.`,
      );
    }
  }

  return problemas;
}

function autoTeste() {
  const falhas = [];
  return import('./fixtures/auditoria.fixtures.mjs').then(({ casos }) => {
    for (const caso of casos) {
      const problemas = avaliar(caso.relatorio, caso.aceitas, caso.manifestos ?? {}, ROOT);
      const passou = problemas.length === 0;
      const deveriaPassar = caso.esperado === 'passa';

      if (passou !== deveriaPassar) {
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
      console.error('gate de auditoria: o auto-teste falhou\n');
      for (const f of falhas) console.error(`  ${f}`);
      process.exit(1);
    }
    return casos.length;
  });
}

function relatorioDoNpm() {
  // `npm audit` sai com codigo diferente de zero quando encontra algo, que e o caso
  // normal aqui. O que importa e o JSON no stdout.
  let saida;
  try {
    saida = execFileSync('npm', ['audit', '--json'], { cwd: ROOT, encoding: 'utf8' });
  } catch (erro) {
    saida = erro.stdout ?? '';
  }
  if (saida.trim() === '') {
    console.error('gate de auditoria: npm audit nao produziu JSON.');
    console.error('Isto e ambiente, nao dependencia. Verifique a rede e rode de novo.');
    process.exit(3);
  }
  return JSON.parse(saida);
}

const casos = await autoTeste();

const lista = JSON.parse(readFileSync(new URL('./auditoria-aceita.json', import.meta.url), 'utf8'));
const aceitas = lista.aceitas ?? [];
const problemas = avaliar(
  relatorioDoNpm(),
  aceitas,
  lerManifestos(
    aceitas.map((a) => a.reabrir_se).filter((c) => c !== undefined),
    ROOT,
  ),
);

if (problemas.length === 0) {
  const n = (lista.aceitas ?? []).length;
  console.log(
    `gate de auditoria: arvore limpa fora de ${n} advisory(s) aceito(s) por escrito, ${casos} casos de auto-teste`,
  );
  process.exit(0);
}

console.error('gate de auditoria: reprovado\n');
for (const p of problemas) console.error(`  ${p}`);
console.error('\nCada advisory ou sai da arvore, ou entra em scripts/auditoria-aceita.json');
console.error('com pacote, caminho, data e motivo. Nao ha limiar para baixar.');
process.exit(1);
