/**
 * Geometria do hexagono. Puro: recebe razoes, devolve pontos.
 *
 * Nao decide cor e nao decide o que e bom. Devolve a direcao de cada vertice como
 * fato — subiu, desceu, nao mudou o bastante — e quem desenha escolhe como mostrar.
 * A regra em vigor e preenchimento, e nao matiz: para fora preenchido, para dentro
 * vazado, mesma cor nos dois. Ela ainda nao foi vista por ninguem de fora e pode
 * estar errada de leitura; por isso ela mora na camada de desenho e nao aqui.
 */

export type MotivoIndisponivel = 'sem_medida' | 'baseline_nao_digitado' | 'sem_baseline';

export type EstadoDoEixo =
  | { readonly status: 'ok'; readonly ratio: number }
  | { readonly status: 'indisponivel'; readonly motivo: MotivoIndisponivel };

export interface EixoDeEntrada {
  readonly key: string;
  readonly label: string;
  readonly estado: EstadoDoEixo;
}

export type Direcao = 'fora' | 'dentro' | 'estavel';

export interface Vertice {
  readonly key: string;
  readonly label: string;
  readonly anguloRad: number;
  /** Fracao do raio do grafico, de 0 a 1. */
  readonly raio: number;
  readonly direcao: Direcao;
  readonly ratio: number;
}

export interface EixoIndisponivel {
  readonly key: string;
  readonly label: string;
  readonly anguloRad: number;
  readonly motivo: string;
}

export interface PlotagemInput {
  readonly eixos: readonly EixoDeEntrada[];
  /**
   * Abaixo desta variacao absoluta em torno de 1, o vertice conta como estavel.
   * Sem valor padrao: e numero de produto e ninguem mediu ainda quanto de variacao
   * e ruido de fita. Quem chama assume a decisao no ponto de chamada.
   */
  readonly limiarEstavel: number;
  /**
   * A escala radial: que faixa de razao a grade cobre, e onde fica a borda de dentro.
   *
   * Os tres numeros sao uma decisao so e por isso viajam juntos: juntos eles definem
   * o quanto o desenho amplifica, e eles puxam em sentidos opostos. Faixa mais
   * estreita amplifica mais; raio minimo maior amplifica menos. Escolher um sem os
   * outros muda o fator sem que ninguem tenha decidido muda-lo.
   *
   * Sem valor padrao, como `limiarEstavel`: sao numeros de produto e o dominio nao e
   * lugar de guardar numero de produto. Os valores em vigor vivem em product_settings
   * e o motivo esta escrito ao lado deles.
   */
  readonly escalaRadial: EscalaRadial;
}

export interface EscalaRadial {
  /** Razao que cai na borda de dentro da grade. */
  readonly razaoMinima: number;
  /** Razao que cai na borda de fora. */
  readonly razaoMaxima: number;
  /**
   * Fracao do raio ocupada pela borda de dentro.
   *
   * Nao e zero: um vertice desenhado no centro faria o poligono colapsar em cima de si
   * mesmo, e dois eixos no minimo desenhariam a mesma figura que um.
   *
   * Ele tambem amortece a amplificacao, o que eu descobri medindo e nao ao escolhe-lo:
   * quanto maior, menos o desenho exagera, porque o raio de partida e maior e a mesma
   * variacao absoluta vira variacao relativa menor. Com a faixa em vigor, o raio minimo
   * em 0,25 segura a elasticidade em 4; em zero ela seria 6,67.
   */
  readonly raioMinimo: number;
}

/**
 * Uma corrida de eixos vizinhos que tem dado.
 *
 * `fechado` so e verdadeiro quando os seis eixos existem. Com qualquer buraco, o
 * traco fica aberto: ligar os dois vertices que sobraram dos lados de um eixo sem
 * medida desenha uma aresta que cruza aquele eixo num raio determinado, e esse raio e
 * um valor que ninguem mediu. E a mesma interpolacao que o modulo de comparacao
 * recusa ao escolher alvo, e recusa-la no dado e reintroduzi-la no desenho deixa a
 * figura mentindo com a autoridade de um grafico.
 */
export interface Segmento {
  readonly vertices: readonly Vertice[];
  readonly fechado: boolean;
}

export interface Plotagem {
  readonly vertices: readonly Vertice[];
  readonly indisponiveis: readonly EixoIndisponivel[];
  /** Tracos a desenhar. Um so e fechado quando nada falta; varios e abertos quando falta. */
  readonly segmentos: readonly Segmento[];
  /** Fracao do raio em que fica a razao 1, ou seja, o anel do baseline. */
  readonly raioDoBaseline: number;
}

// Chaveado pela uniao e nao por `string`: assim o compilador cobra o texto de cada
// motivo novo. Com `Record<string, string>` a leitura devolveria `string | undefined`,
// o codigo precisaria de um fallback generico, e um motivo sem texto chegaria a tela
// como a palavra "indisponivel" em vez de quebrar o build.
const MOTIVOS: Record<MotivoIndisponivel, string> = {
  sem_medida: 'sem medida neste check-in',
  baseline_nao_digitado: 'sem medida no baseline',
  sem_baseline: 'ainda sem baseline',
};

/**
 * Razao para fracao do raio.
 *
 * Este mapeamento amplifica, e o quanto sai inteiramente da escala recebida:
 *
 *   E = (1-m) / [ (b-a) * (m + (1-m)*(1-a)/(b-a)) ]     na razao 1
 *
 * Com a escala em vigor — a=0,85, b=1,15, m=0,25 — da exatamente 4: uma razao 2% maior
 * vira um raio 8% maior. A area de um poligono vai com o quadrado do raio, entao ela se
 * move perto de 8 vezes o que a razao se moveu — 8 no limite, 8,3 num passo de 2%.
 *
 * Nao ha nada de errado com amplificar; grade que nao amplifica nao mostra nada. O que
 * importa e que o fator seja escolhido e nao herdado, e por isso os tres numeros que o
 * produzem sao parametro e nao constante. Ver docs/decisoes/0013-ordem-dos-eixos.md.
 */
export function razaoParaRaio(ratio: number, escala: EscalaRadial): number {
  const preso = Math.min(Math.max(ratio, escala.razaoMinima), escala.razaoMaxima);
  const fracao = (preso - escala.razaoMinima) / (escala.razaoMaxima - escala.razaoMinima);
  return escala.raioMinimo + fracao * (1 - escala.raioMinimo);
}

export function plotarHexagono(input: PlotagemInput): Plotagem {
  const passo = (Math.PI * 2) / input.eixos.length;
  // Comeca no topo e anda no sentido horario, que e como se le um mostrador.
  const inicio = -Math.PI / 2;

  const vertices: Vertice[] = [];
  const indisponiveis: EixoIndisponivel[] = [];
  /** O anel na ordem dos eixos, com `null` onde falta dado. */
  const anel: (Vertice | null)[] = [];

  input.eixos.forEach((eixo, i) => {
    const anguloRad = inicio + i * passo;

    if (eixo.estado.status === 'indisponivel') {
      indisponiveis.push({
        key: eixo.key,
        label: eixo.label,
        anguloRad,
        motivo: MOTIVOS[eixo.estado.motivo],
      });
      anel.push(null);
      return;
    }

    const ratio = eixo.estado.ratio;
    const desvio = ratio - 1;
    const direcao: Direcao =
      Math.abs(desvio) < input.limiarEstavel ? 'estavel' : desvio > 0 ? 'fora' : 'dentro';

    const vertice: Vertice = {
      key: eixo.key,
      label: eixo.label,
      anguloRad,
      raio: razaoParaRaio(ratio, input.escalaRadial),
      direcao,
      ratio,
    };
    vertices.push(vertice);
    anel.push(vertice);
  });

  return {
    vertices,
    indisponiveis,
    segmentos: segmentar(anel),
    raioDoBaseline: razaoParaRaio(1, input.escalaRadial),
  };
}

/**
 * Quebra o anel em corridas de vizinhos com dado.
 *
 * O anel da a volta, entao uma corrida pode comecar antes do fim e terminar depois do
 * comeco. Sem a juncao das pontas, um buraco em qualquer lugar que nao o indice zero
 * faria aparecer uma quebra falsa no topo do grafico — quebra que nao corresponde a
 * eixo nenhum e que muda de lugar conforme a ordem dos eixos.
 */
function segmentar(anel: readonly (Vertice | null)[]): readonly Segmento[] {
  const presentes = anel.filter((v): v is Vertice => v !== null);
  if (presentes.length === 0) return [];
  if (presentes.length === anel.length) return [{ vertices: presentes, fechado: true }];

  const corridas: Vertice[][] = [];
  let atual: Vertice[] = [];
  for (const v of anel) {
    if (v === null) {
      if (atual.length > 0) corridas.push(atual);
      atual = [];
    } else {
      atual.push(v);
    }
  }
  if (atual.length > 0) corridas.push(atual);

  const primeiro = anel[0];
  const ultimo = anel[anel.length - 1];
  if (
    corridas.length > 1 &&
    primeiro !== null &&
    primeiro !== undefined &&
    ultimo !== null &&
    ultimo !== undefined
  ) {
    const fim = corridas.pop();
    const inicio = corridas.shift();
    if (fim !== undefined && inicio !== undefined) corridas.unshift([...fim, ...inicio]);
  }

  // Uma corrida de um vertice so nao e traco, e um ponto. Ela continua na lista para
  // quem desenha decidir; o que ela nao pode e virar aresta ate o vizinho que falta.
  return corridas.map((vertices) => ({ vertices, fechado: false }));
}

/** Pontos em coordenada de tela, para um centro e um raio dados. */
export function pontos(
  vertices: readonly Vertice[],
  centro: { x: number; y: number },
  raio: number,
): readonly { x: number; y: number }[] {
  return vertices.map((v) => ({
    x: centro.x + Math.cos(v.anguloRad) * v.raio * raio,
    y: centro.y + Math.sin(v.anguloRad) * v.raio * raio,
  }));
}
