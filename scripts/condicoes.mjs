/**
 * Vocabulario de condicoes verificaveis, compartilhado pelo gate de prazos e pelo gate
 * de auditoria.
 *
 * Existe porque os dois arquivos de dados precisavam da mesma pergunta — "este pacote
 * esta instalado?" — e duas copias da mesma resposta divergem. Manter um vocabulario so
 * tambem obriga condicao nova a ser escrita aqui, onde se ve quantas ja existem, em vez
 * de cada gate inventar a sua.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const CONDICOES = {
  pacote_presente: (contexto) => temPacote(contexto.manifesto, contexto.pacote),
  pacote_ausente: (contexto) => !temPacote(contexto.manifesto, contexto.pacote),
  // Nem toda premissa e sobre dependencia. A aceitacao dos advisories do image-size
  // vale enquanto o Metro so empacotar imagens que estao neste repositorio, e hoje nao
  // ha nenhuma — a pasta de assets nao existe. No dia em que existir, a premissa muda.
  caminho_existe: (contexto) => contexto.existe,
  caminho_ausente: (contexto) => !contexto.existe,
};

function temPacote(manifesto, pacote) {
  for (const campo of ['dependencies', 'devDependencies', 'peerDependencies']) {
    if (Object.prototype.hasOwnProperty.call(manifesto[campo] ?? {}, pacote)) return true;
  }
  return false;
}

/**
 * Avalia uma condicao. Devolve `{ ok, satisfeita }` — `ok` falso quer dizer que a
 * condicao nao pode ser avaliada, o que reprova em vez de passar em silencio: uma
 * condicao que nao da para verificar e uma condicao que nunca dispara.
 */
export function avaliar(condicao, manifestos, raiz) {
  const testar = CONDICOES[condicao.condicao];
  if (testar === undefined) {
    return {
      ok: false,
      motivo: `condicao "${condicao.condicao}" desconhecida (use ${Object.keys(CONDICOES).join(', ')})`,
    };
  }

  if (condicao.condicao.startsWith('caminho_')) {
    if (typeof condicao.caminho !== 'string' || condicao.caminho === '') {
      return { ok: false, motivo: 'condicao de caminho sem `caminho` escrito' };
    }
    if (raiz === undefined) {
      return { ok: false, motivo: 'condicao de caminho avaliada sem raiz do repositorio' };
    }
    return { ok: true, satisfeita: testar({ existe: existsSync(join(raiz, condicao.caminho)) }) };
  }

  const manifesto = manifestos[condicao.manifesto];
  if (manifesto === undefined) {
    return { ok: false, motivo: `o manifesto ${condicao.manifesto} nao foi encontrado` };
  }

  return { ok: true, satisfeita: testar({ manifesto, pacote: condicao.pacote }) };
}

/** Le os manifestos citados por uma lista de condicoes. Ausente fica de fora do mapa. */
export function lerManifestos(condicoes, raiz) {
  const manifestos = {};
  for (const c of condicoes) {
    if (c?.manifesto === undefined || manifestos[c.manifesto] !== undefined) continue;
    const caminho = join(raiz, c.manifesto);
    if (existsSync(caminho)) manifestos[c.manifesto] = JSON.parse(readFileSync(caminho, 'utf8'));
  }
  return manifestos;
}
