import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  plotarHexagono,
  pontos,
  razaoParaRaio,
  type EixoDeEntrada,
  type EstadoDoEixo,
} from '../src';

const FAIXA = { min: 0.85, max: 1.15 };
const LIMIAR = 0.01;

const CHAVES = ['ombro', 'peito', 'braco', 'cintura', 'coxa', 'panturrilha'] as const;

function eixo(key: string, estado: EstadoDoEixo): EixoDeEntrada {
  return { key, label: key, estado };
}

function seis(ratios: readonly number[]): EixoDeEntrada[] {
  return CHAVES.map((k, i) => eixo(k, { status: 'ok', ratio: ratios[i] ?? 1 }));
}

describe('razaoParaRaio', () => {
  it('a razao 1 cai no mesmo raio para qualquer eixo, que e o anel do baseline', () => {
    expect(razaoParaRaio(1, FAIXA)).toBeCloseTo(0.25 + 0.5 * 0.75, 10);
  });

  it('a borda de dentro nao e o centro', () => {
    // Um vertice no minimo da faixa desenhado no centro faria o poligono colapsar
    // em cima de si mesmo, e dois eixos no minimo desenhariam a mesma figura que um.
    expect(razaoParaRaio(FAIXA.min, FAIXA)).toBe(0.25);
    expect(razaoParaRaio(FAIXA.max, FAIXA)).toBe(1);
  });

  it('razao fora da faixa gruda na borda em vez de sair do grafico', () => {
    expect(razaoParaRaio(0.2, FAIXA)).toBe(0.25);
    expect(razaoParaRaio(3, FAIXA)).toBe(1);
  });
});

describe('plotarHexagono', () => {
  it('o primeiro eixo fica no topo e os seguintes andam no sentido horario', () => {
    const p = plotarHexagono({
      eixos: seis([1, 1, 1, 1, 1, 1]),
      limiarEstavel: LIMIAR,
      faixa: FAIXA,
    });
    expect(p.vertices).toHaveLength(6);
    expect(p.vertices[0]?.anguloRad).toBeCloseTo(-Math.PI / 2, 10);
    expect(p.vertices[1]?.anguloRad).toBeCloseTo(-Math.PI / 2 + Math.PI / 3, 10);
    // Em coordenada de tela o y cresce para baixo, entao o segundo vertice esta a
    // direita e abaixo do primeiro: sentido horario para quem olha.
    const [a, b] = pontos(p.vertices, { x: 0, y: 0 }, 100);
    expect(b!.x).toBeGreaterThan(a!.x);
    expect(b!.y).toBeGreaterThan(a!.y);
  });

  it('carimba as tres direcoes como fato, sem dizer qual e boa', () => {
    const p = plotarHexagono({
      eixos: seis([1.08, 0.92, 1, 1.005, 0.995, 1.2]),
      limiarEstavel: LIMIAR,
      faixa: FAIXA,
    });
    expect(p.vertices.map((v) => v.direcao)).toEqual([
      'fora',
      'dentro',
      'estavel',
      'estavel',
      'estavel',
      'fora',
    ]);
  });

  it('o limiar e do chamador: o mesmo dado muda de direcao quando o limiar muda', () => {
    const eixos = seis([1.02, 1, 1, 1, 1, 1]);
    const apertado = plotarHexagono({ eixos, limiarEstavel: 0.01, faixa: FAIXA });
    const frouxo = plotarHexagono({ eixos, limiarEstavel: 0.05, faixa: FAIXA });
    expect(apertado.vertices[0]?.direcao).toBe('fora');
    expect(frouxo.vertices[0]?.direcao).toBe('estavel');
  });

  it('eixo indisponivel sai da lista de vertices e leva o motivo por extenso', () => {
    const p = plotarHexagono({
      eixos: [
        eixo('ombro', { status: 'ok', ratio: 1.05 }),
        eixo('peito', { status: 'indisponivel', motivo: 'sem_medida' }),
        eixo('braco', { status: 'indisponivel', motivo: 'baseline_nao_digitado' }),
        eixo('cintura', { status: 'indisponivel', motivo: 'sem_baseline' }),
        eixo('coxa', { status: 'ok', ratio: 0.97 }),
        eixo('panturrilha', { status: 'ok', ratio: 1 }),
      ],
      limiarEstavel: LIMIAR,
      faixa: FAIXA,
    });

    expect(p.vertices.map((v) => v.key)).toEqual(['ombro', 'coxa', 'panturrilha']);
    expect(p.indisponiveis.map((e) => [e.key, e.motivo])).toEqual([
      ['peito', 'sem medida neste check-in'],
      ['braco', 'sem medida no baseline'],
      ['cintura', 'ainda sem baseline'],
    ]);
  });

  // O eixo que sumiu tem que continuar ocupando o lugar dele. Se os vertices
  // restantes se redistribuissem, um hexagono com quatro medidas viraria um
  // quadrilatero regular — uma figura fechada, bonita, e sobre outro conjunto de
  // eixos que ninguem avisou que mudou.
  it('o eixo indisponivel guarda o proprio angulo, e os outros nao se redistribuem', () => {
    const completo = plotarHexagono({
      eixos: seis([1, 1, 1, 1, 1, 1]),
      limiarEstavel: LIMIAR,
      faixa: FAIXA,
    });
    const comBuraco = plotarHexagono({
      eixos: seis([1, 1, 1, 1, 1, 1]).map((e, i) =>
        i === 2 ? eixo(e.key, { status: 'indisponivel', motivo: 'sem_medida' }) : e,
      ),
      limiarEstavel: LIMIAR,
      faixa: FAIXA,
    });

    const angulos = new Map(completo.vertices.map((v) => [v.key, v.anguloRad]));
    for (const v of comBuraco.vertices) {
      expect(v.anguloRad).toBeCloseTo(angulos.get(v.key)!, 10);
    }
    expect(comBuraco.indisponiveis[0]?.anguloRad).toBeCloseTo(angulos.get('braco')!, 10);
  });

  it('o anel do baseline nao depende dos dados', () => {
    const a = plotarHexagono({
      eixos: seis([1.1, 1.1, 1.1, 1.1, 1.1, 1.1]),
      limiarEstavel: LIMIAR,
      faixa: FAIXA,
    });
    const b = plotarHexagono({
      eixos: seis([0.9, 0.9, 0.9, 0.9, 0.9, 0.9]),
      limiarEstavel: LIMIAR,
      faixa: FAIXA,
    });
    expect(a.raioDoBaseline).toBe(b.raioDoBaseline);
    expect(a.raioDoBaseline).toBe(razaoParaRaio(1, FAIXA));
  });

  it('todos os eixos indisponiveis nao produzem poligono degenerado, produzem poligono nenhum', () => {
    const p = plotarHexagono({
      eixos: CHAVES.map((k) => eixo(k, { status: 'indisponivel', motivo: 'sem_baseline' })),
      limiarEstavel: LIMIAR,
      faixa: FAIXA,
    });
    expect(p.vertices).toEqual([]);
    expect(p.indisponiveis).toHaveLength(6);
  });
});

describe('segmentos', () => {
  function comBuracos(faltando: readonly number[]) {
    return plotarHexagono({
      eixos: seis([1, 1, 1, 1, 1, 1]).map((e, i) =>
        faltando.includes(i) ? eixo(e.key, { status: 'indisponivel', motivo: 'sem_medida' }) : e,
      ),
      limiarEstavel: LIMIAR,
      faixa: FAIXA,
    });
  }

  it('sem buraco ha um traco so, e ele fecha', () => {
    const p = comBuracos([]);
    expect(p.segmentos).toHaveLength(1);
    expect(p.segmentos[0]?.fechado).toBe(true);
    expect(p.segmentos[0]?.vertices).toHaveLength(6);
  });

  // O ponto inteiro: a aresta que ligaria os vizinhos de um eixo sem medida cruzaria
  // aquele eixo num raio que ninguem mediu.
  it('um buraco abre o traco e ninguem atravessa o eixo que falta', () => {
    const p = comBuracos([2]);
    expect(p.segmentos).toHaveLength(1);
    expect(p.segmentos[0]?.fechado).toBe(false);
    expect(p.segmentos[0]?.vertices.map((v) => v.key)).toEqual([
      'cintura',
      'coxa',
      'panturrilha',
      'ombro',
      'peito',
    ]);
  });

  it('dois buracos separados dao dois tracos abertos', () => {
    const p = comBuracos([1, 4]);
    // O primeiro traco comeca antes do fim do anel e termina depois do comeco.
    expect(p.segmentos.map((s) => s.vertices.map((v) => v.key))).toEqual([
      ['panturrilha', 'ombro'],
      ['braco', 'cintura'],
    ]);
    expect(p.segmentos.every((s) => !s.fechado)).toBe(true);
  });

  it('o anel da a volta: buraco no ultimo eixo nao inventa quebra no primeiro', () => {
    const p = comBuracos([5]);
    expect(p.segmentos).toHaveLength(1);
    expect(p.segmentos[0]?.vertices.map((v) => v.key)).toEqual([
      'ombro',
      'peito',
      'braco',
      'cintura',
      'coxa',
    ]);
  });

  it('buraco no primeiro eixo tambem nao quebra em dois', () => {
    const p = comBuracos([0]);
    expect(p.segmentos).toHaveLength(1);
    expect(p.segmentos[0]?.vertices.map((v) => v.key)).toEqual([
      'peito',
      'braco',
      'cintura',
      'coxa',
      'panturrilha',
    ]);
  });

  it('eixo isolado entre dois buracos vira traco de um vertice, nao aresta', () => {
    const p = comBuracos([0, 2, 3, 4, 5]);
    expect(p.segmentos).toHaveLength(1);
    expect(p.segmentos[0]?.vertices).toHaveLength(1);
    expect(p.segmentos[0]?.fechado).toBe(false);
  });

  it('nenhum eixo disponivel nao produz traco nenhum', () => {
    expect(comBuracos([0, 1, 2, 3, 4, 5]).segmentos).toEqual([]);
  });
});

describe('pontos', () => {
  it('sem raio nenhum tudo cai no centro, e com raio o baseline vira circunferencia', () => {
    const p = plotarHexagono({
      eixos: seis([1, 1, 1, 1, 1, 1]),
      limiarEstavel: LIMIAR,
      faixa: FAIXA,
    });
    const centro = { x: 160, y: 200 };
    for (const ponto of pontos(p.vertices, centro, 0)) {
      expect(ponto.x).toBeCloseTo(centro.x, 10);
      expect(ponto.y).toBeCloseTo(centro.y, 10);
    }
    for (const ponto of pontos(p.vertices, centro, 120)) {
      const d = Math.hypot(ponto.x - centro.x, ponto.y - centro.y);
      expect(d).toBeCloseTo(120 * p.raioDoBaseline, 10);
    }
  });
});

describe('propriedades', () => {
  const ratioArb = fc.double({ min: 0.5, max: 2, noNaN: true });

  it('nenhum vertice sai do grafico nem colapsa no centro', () => {
    fc.assert(
      fc.property(fc.array(ratioArb, { minLength: 6, maxLength: 6 }), (ratios) => {
        const p = plotarHexagono({ eixos: seis(ratios), limiarEstavel: LIMIAR, faixa: FAIXA });
        for (const v of p.vertices) {
          expect(v.raio).toBeGreaterThanOrEqual(0.25);
          expect(v.raio).toBeLessThanOrEqual(1);
        }
      }),
    );
  });

  // O eixo nao tem lado bom. Espelhar todas as razoes em torno de 1 tem que espelhar
  // todas as direcoes, sem nenhum eixo se comportando diferente dos outros.
  it('espelhar as razoes em torno de 1 espelha as direcoes, igual nos seis eixos', () => {
    fc.assert(
      fc.property(fc.array(ratioArb, { minLength: 6, maxLength: 6 }), (ratios) => {
        const direto = plotarHexagono({ eixos: seis(ratios), limiarEstavel: LIMIAR, faixa: FAIXA });
        const espelho = plotarHexagono({
          eixos: seis(ratios.map((r) => 2 - r)),
          limiarEstavel: LIMIAR,
          faixa: FAIXA,
        });
        const inverte = { fora: 'dentro', dentro: 'fora', estavel: 'estavel' } as const;
        expect(espelho.vertices.map((v) => v.direcao)).toEqual(
          direto.vertices.map((v) => inverte[v.direcao]),
        );
      }),
    );
  });

  it('nenhum segmento fechado quando falta algum eixo, em qualquer combinacao', () => {
    fc.assert(
      fc.property(fc.subarray([0, 1, 2, 3, 4, 5]), (faltando) => {
        const p = plotarHexagono({
          eixos: seis([1.02, 0.98, 1, 1.05, 0.95, 1]).map((e, i) =>
            faltando.includes(i)
              ? eixo(e.key, { status: 'indisponivel', motivo: 'sem_medida' })
              : e,
          ),
          limiarEstavel: LIMIAR,
          faixa: FAIXA,
        });
        if (faltando.length === 0) {
          expect(p.segmentos.every((s) => s.fechado)).toBe(true);
        } else {
          expect(p.segmentos.some((s) => s.fechado)).toBe(false);
        }
        // Todo vertice disponivel aparece em exatamente um segmento.
        const nos = p.segmentos.flatMap((s) => s.vertices.map((v) => v.key));
        expect(nos.slice().sort()).toEqual(
          p.vertices
            .map((v) => v.key)
            .slice()
            .sort(),
        );
      }),
    );
  });

  it('cada eixo de entrada aparece uma vez, ou como vertice ou como indisponivel', () => {
    const estadoArb: fc.Arbitrary<EstadoDoEixo> = fc.oneof(
      ratioArb.map((ratio) => ({ status: 'ok', ratio }) as const),
      fc
        .constantFrom('sem_medida', 'baseline_nao_digitado', 'sem_baseline')
        .map((motivo) => ({ status: 'indisponivel', motivo }) as const),
    );

    fc.assert(
      fc.property(fc.array(estadoArb, { minLength: 1, maxLength: 6 }), (estados) => {
        const eixos = estados.map((e, i) => eixo(`e${i}`, e));
        const p = plotarHexagono({ eixos, limiarEstavel: LIMIAR, faixa: FAIXA });
        const saida = [...p.vertices.map((v) => v.key), ...p.indisponiveis.map((e) => e.key)];
        expect(saida.slice().sort()).toEqual(
          eixos
            .map((e) => e.key)
            .slice()
            .sort(),
        );
      }),
    );
  });
});
