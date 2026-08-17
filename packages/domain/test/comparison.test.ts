import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { daysBetween, selectComparison, type CheckinRef } from '../src';

function checkin(id: string, iso: string): CheckinRef {
  return { id, takenAt: new Date(iso) };
}

const HOJE = checkin('hoje', '2026-08-16T12:00:00Z');
const MIN = 28;

describe('selectComparison', () => {
  it('sem historico nao ha comparacao, e o motivo e dito', () => {
    expect(
      selectComparison({ current: HOJE, history: [HOJE], minDaysApart: MIN, baseline: null }),
    ).toEqual({ status: 'nenhuma', motivo: 'sem_historico' });
  });

  it('escolhe o check-in mais recente que atinge a janela', () => {
    const alvo = checkin('a', '2026-07-15T12:00:00Z'); // 32 dias
    const resultado = selectComparison({
      current: HOJE,
      history: [
        HOJE,
        checkin('b', '2026-08-10T12:00:00Z'), // 6 dias, perto demais
        alvo,
        checkin('c', '2026-01-01T12:00:00Z'), // mais antigo, mas nao e o mais recente elegivel
      ],
      minDaysApart: MIN,
      baseline: checkin('c', '2026-01-01T12:00:00Z'),
    });

    expect(resultado).toEqual({ status: 'ok', target: alvo, intervalDays: 32 });
  });

  // Cadencia irregular deixa de ser caso especial: a regra e a mesma.
  it('some por dois meses e volta: o alvo e o ultimo antes do sumico', () => {
    const alvo = checkin('a', '2026-06-01T12:00:00Z');
    const resultado = selectComparison({
      current: HOJE,
      history: [
        checkin('x', '2026-05-30T12:00:00Z'),
        alvo,
        checkin('y', '2026-08-15T12:00:00Z'),
        checkin('z', '2026-08-14T12:00:00Z'),
      ],
      minDaysApart: MIN,
      baseline: checkin('x', '2026-05-30T12:00:00Z'),
    });

    expect(resultado.status).toBe('ok');
    if (resultado.status !== 'ok') return;
    expect(resultado.target.id).toBe('a');
    expect(resultado.intervalDays).toBe(76);
  });

  it('historico todo dentro da janela cai no baseline, com o intervalo real', () => {
    const baseline = checkin('base', '2026-08-05T12:00:00Z');
    const resultado = selectComparison({
      current: HOJE,
      history: [baseline, checkin('b', '2026-08-14T12:00:00Z')],
      minDaysApart: MIN,
      baseline,
    });

    expect(resultado).toEqual({ status: 'baseline', target: baseline, intervalDays: 11 });
  });

  it('historico curto e sem baseline nao inventa alvo', () => {
    expect(
      selectComparison({
        current: HOJE,
        history: [checkin('b', '2026-08-14T12:00:00Z')],
        minDaysApart: MIN,
        baseline: null,
      }),
    ).toEqual({ status: 'nenhuma', motivo: 'sem_historico' });
  });

  it('baseline que e o proprio check-in atual nao serve de alvo', () => {
    expect(
      selectComparison({
        current: HOJE,
        history: [HOJE, checkin('b', '2026-08-14T12:00:00Z')],
        minDaysApart: MIN,
        baseline: HOJE,
      }),
    ).toEqual({ status: 'nenhuma', motivo: 'sem_historico' });
  });

  it('ignora check-in posterior ao atual', () => {
    const resultado = selectComparison({
      current: HOJE,
      history: [HOJE, checkin('futuro', '2026-09-01T12:00:00Z')],
      minDaysApart: MIN,
      baseline: null,
    });
    expect(resultado).toEqual({ status: 'nenhuma', motivo: 'sem_historico' });
  });
});

describe('propriedades', () => {
  const anteriorArb = fc
    .integer({ min: 1, max: 900 })
    .map((dias) =>
      checkin(`d${dias}`, new Date(HOJE.takenAt.getTime() - dias * 86_400_000).toISOString()),
    );

  it('o alvo e sempre um check-in que existe no historico, nunca um ponto inventado', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(anteriorArb, { selector: (c) => c.id, maxLength: 20 }),
        (historico) => {
          const resultado = selectComparison({
            current: HOJE,
            history: historico,
            minDaysApart: MIN,
            baseline: historico[historico.length - 1] ?? null,
          });
          if (resultado.status === 'nenhuma') return;
          expect(historico.some((c) => c.id === resultado.target.id)).toBe(true);
        },
      ),
    );
  });

  it('quando o status e ok, o intervalo nunca e menor que a janela', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(anteriorArb, { selector: (c) => c.id, maxLength: 20 }),
        fc.integer({ min: 1, max: 120 }),
        (historico, minimo) => {
          const resultado = selectComparison({
            current: HOJE,
            history: historico,
            minDaysApart: minimo,
            baseline: null,
          });
          if (resultado.status !== 'ok') return;
          expect(resultado.intervalDays).toBeGreaterThanOrEqual(minimo);
        },
      ),
    );
  });
});

describe('daysBetween', () => {
  it('conta dias inteiros', () => {
    expect(daysBetween(new Date('2026-08-01T12:00:00Z'), new Date('2026-08-16T12:00:00Z'))).toBe(
      15,
    );
    expect(daysBetween(new Date('2026-08-01T12:00:00Z'), new Date('2026-08-01T23:00:00Z'))).toBe(0);
  });
});
