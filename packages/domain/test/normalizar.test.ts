import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { normalizarPelaMedia, plotarHexagono, type EixoDeEntrada, type EstadoDoEixo } from '../src';

const CHAVES = ['ombro', 'peito', 'braco', 'cintura', 'coxa', 'panturrilha'] as const;

function eixos(estados: readonly EstadoDoEixo[]): EixoDeEntrada[] {
  return estados.map((estado, i) => ({
    key: CHAVES[i] ?? `e${i}`,
    label: CHAVES[i] ?? `e${i}`,
    estado,
  }));
}

function ok(...ratios: number[]): EixoDeEntrada[] {
  return eixos(ratios.map((ratio) => ({ status: 'ok', ratio })));
}

function razoes(saida: readonly EixoDeEntrada[]): number[] {
  return saida.flatMap((e) => (e.estado.status === 'ok' ? [e.estado.ratio] : []));
}

describe('normalizarPelaMedia', () => {
  it('a media das razoes normalizadas e 1', () => {
    const r = razoes(normalizarPelaMedia(ok(1.03, 1.01, 1.05, 0.97, 1.0, 0.99)));
    expect(r.reduce((s, x) => s + x, 0) / r.length).toBeCloseTo(1, 10);
  });

  // O ponto inteiro da variante: crescimento uniforme deixa de aparecer, porque
  // proporcao nenhuma mudou.
  it('multiplicar todas as medidas pelo mesmo fator nao move nenhum vertice', () => {
    const antes = razoes(normalizarPelaMedia(ok(0.87, 0.93, 1.0, 1.06, 1.12, 1.14)));
    const depois = razoes(
      normalizarPelaMedia(
        ok(0.87, 0.93, 1.0, 1.06, 1.12, 1.14).map((e) => ({
          ...e,
          estado: { status: 'ok', ratio: (e.estado as { ratio: number }).ratio * 1.02 },
        })),
      ),
    );
    antes.forEach((x, i) => expect(depois[i]).toBeCloseTo(x, 10));
  });

  it('mudanca em um eixo so continua aparecendo, e nos outros tambem', () => {
    const antes = razoes(normalizarPelaMedia(ok(1, 1, 1, 1, 1, 1)));
    const depois = razoes(normalizarPelaMedia(ok(1.12, 1, 1, 1, 1, 1)));
    expect(depois[0]!).toBeGreaterThan(antes[0]!);
    // Os outros cinco descem, porque a media subiu. Isso e a variante dizendo a
    // verdade dela: o que ela mostra e reparticao, e reparticao e soma constante.
    for (let i = 1; i < 6; i++) expect(depois[i]!).toBeLessThan(antes[i]!);
  });

  it('a media ignora eixo indisponivel, e o indisponivel passa intacto', () => {
    const entrada = eixos([
      { status: 'ok', ratio: 1.2 },
      { status: 'indisponivel', motivo: 'sem_medida' },
      { status: 'ok', ratio: 0.8 },
      { status: 'ok', ratio: 1.0 },
      { status: 'indisponivel', motivo: 'sem_baseline' },
      { status: 'ok', ratio: 1.0 },
    ]);
    const saida = normalizarPelaMedia(entrada);
    expect(saida[1]).toEqual(entrada[1]);
    expect(saida[4]).toEqual(entrada[4]);
    // media de 1,2 0,8 1,0 1,0 = 1,0, entao os disponiveis nao se movem
    expect(razoes(saida)).toEqual([1.2, 0.8, 1.0, 1.0]);
  });

  it('sem nenhum eixo disponivel devolve a entrada intacta', () => {
    const entrada = eixos(CHAVES.map(() => ({ status: 'indisponivel', motivo: 'sem_baseline' })));
    expect(normalizarPelaMedia(entrada)).toEqual(entrada);
  });

  it('media nao positiva devolve a entrada intacta em vez de dividir por zero', () => {
    const entrada = ok(1, -1, 0, 0, 0, 0);
    expect(normalizarPelaMedia(entrada)).toEqual(entrada);
    expect(razoes(normalizarPelaMedia(ok(0, 0, 0, 0, 0, 0))).every(Number.isFinite)).toBe(true);
  });
});

describe('propriedades da normalizacao', () => {
  const razaoArb = fc.double({ min: 0.5, max: 2, noNaN: true });

  it('escalar tudo pelo mesmo fator positivo nao muda a saida', () => {
    fc.assert(
      fc.property(
        fc.array(razaoArb, { minLength: 6, maxLength: 6 }),
        fc.double({ min: 0.1, max: 10, noNaN: true }),
        (rs, fator) => {
          const a = razoes(normalizarPelaMedia(ok(...rs)));
          const b = razoes(normalizarPelaMedia(ok(...rs.map((r) => r * fator))));
          a.forEach((x, i) => expect(b[i]).toBeCloseTo(x, 8));
        },
      ),
    );
  });

  // A afirmacao que a variante faz sobre si mesma: a area do poligono nao depende de
  // quanto a pessoa cresceu, so de como ela e repartida.
  it('a soma das razoes normalizadas e sempre o numero de eixos disponiveis', () => {
    fc.assert(
      fc.property(fc.array(razaoArb, { minLength: 1, maxLength: 6 }), (rs) => {
        const r = razoes(normalizarPelaMedia(ok(...rs)));
        expect(r.reduce((s, x) => s + x, 0)).toBeCloseTo(rs.length, 8);
      }),
    );
  });

  it('nao inventa nem perde eixo, e nao muda status de nenhum', () => {
    const estadoArb: fc.Arbitrary<EstadoDoEixo> = fc.oneof(
      razaoArb.map((ratio) => ({ status: 'ok', ratio }) as const),
      fc
        .constantFrom('sem_medida', 'baseline_nao_digitado', 'sem_baseline')
        .map((motivo) => ({ status: 'indisponivel', motivo }) as const),
    );
    fc.assert(
      fc.property(fc.array(estadoArb, { minLength: 1, maxLength: 6 }), (estados) => {
        const entrada = eixos(estados);
        const saida = normalizarPelaMedia(entrada);
        expect(saida).toHaveLength(entrada.length);
        saida.forEach((e, i) => {
          expect(e.key).toBe(entrada[i]!.key);
          expect(e.estado.status).toBe(entrada[i]!.estado.status);
        });
      }),
    );
  });

  it('normalizar e depois plotar continua produzindo hexagono valido', () => {
    fc.assert(
      fc.property(fc.array(razaoArb, { minLength: 6, maxLength: 6 }), (rs) => {
        const p = plotarHexagono({
          eixos: normalizarPelaMedia(ok(...rs)),
          limiarEstavel: 0.01,
          faixa: { min: 0.85, max: 1.15 },
        });
        expect(p.vertices).toHaveLength(6);
        expect(p.segmentos.every((s) => s.fechado)).toBe(true);
      }),
    );
  });
});
