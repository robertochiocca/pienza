import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  buildSessionPlan,
  resolveEntries,
  stepId,
  variablesKeptAtBaseline,
  type Answer,
  type MeasurementSpec,
  type PreviousValue,
} from '../src';

const VOCABULARIO: MeasurementSpec[] = [
  {
    key: 'height',
    labelPtBr: 'Altura',
    unit: 'cm',
    bilateral: false,
    kind: 'structural',
    displayOrder: 1,
  },
  {
    key: 'waist',
    labelPtBr: 'Cintura',
    unit: 'cm',
    bilateral: false,
    kind: 'variable',
    displayOrder: 8,
  },
  {
    key: 'arm_flexed',
    labelPtBr: 'Braco',
    unit: 'cm',
    bilateral: true,
    kind: 'variable',
    displayOrder: 11,
  },
  {
    key: 'wrist',
    labelPtBr: 'Punho',
    unit: 'cm',
    bilateral: true,
    kind: 'structural',
    displayOrder: 13,
  },
];

const AGORA = new Date('2026-08-16T12:00:00Z');
const HA_UMA_SEMANA = new Date('2026-08-09T12:00:00Z');
const HA_UM_ANO = new Date('2025-08-16T12:00:00Z');

function anterior(overrides: Partial<PreviousValue> & Pick<PreviousValue, 'key'>): PreviousValue {
  return { side: 'na', value: 80, lastTypedAt: HA_UMA_SEMANA, ...overrides };
}

describe('buildSessionPlan', () => {
  it('gera um passo por lado em medida bilateral, na ordem do vocabulario', () => {
    const plano = buildSessionPlan({
      vocabulary: VOCABULARIO,
      previous: [],
      now: AGORA,
      structuralRemeasureAfterDays: 180,
      isBaseline: true,
    });

    expect(plano.steps.map((s) => s.id)).toEqual([
      'height:na',
      'waist:na',
      'arm_flexed:l',
      'arm_flexed:r',
      'wrist:l',
      'wrist:r',
    ]);
  });

  it('ordena por displayOrder mesmo se o vocabulario vier fora de ordem', () => {
    const plano = buildSessionPlan({
      vocabulary: [...VOCABULARIO].reverse(),
      previous: [],
      now: AGORA,
      structuralRemeasureAfterDays: 180,
      isBaseline: false,
    });

    expect(plano.steps[0]?.key).toBe('height');
  });

  it('na primeira sessao nada vem preenchido', () => {
    const plano = buildSessionPlan({
      vocabulary: VOCABULARIO,
      previous: [],
      now: AGORA,
      structuralRemeasureAfterDays: 180,
      isBaseline: true,
    });

    expect(plano.steps.every((s) => !s.prefilled)).toBe(true);
    expect(plano.steps.every((s) => s.previousValue === null)).toBe(true);
    expect(plano.carried).toEqual([]);
  });

  it('carrega estrutural recente sem transformar em passo', () => {
    const plano = buildSessionPlan({
      vocabulary: VOCABULARIO,
      previous: [
        anterior({ key: 'wrist', side: 'l', value: 17 }),
        anterior({ key: 'wrist', side: 'r', value: 17.2 }),
      ],
      now: AGORA,
      structuralRemeasureAfterDays: 180,
      isBaseline: false,
    });

    expect(plano.steps.map((s) => s.id)).not.toContain('wrist:l');
    expect(plano.carried).toEqual([
      { key: 'wrist', side: 'l', value: 17 },
      { key: 'wrist', side: 'r', value: 17.2 },
    ]);
  });

  it('volta a propor estrutural quando a cadencia longa vence', () => {
    const plano = buildSessionPlan({
      vocabulary: VOCABULARIO,
      previous: [anterior({ key: 'wrist', side: 'l', value: 17, lastTypedAt: HA_UM_ANO })],
      now: AGORA,
      structuralRemeasureAfterDays: 180,
      isBaseline: false,
    });

    const passo = plano.steps.find((s) => s.id === 'wrist:l');
    expect(passo?.prefilled).toBe(true);
    expect(passo?.previousValue).toBe(17);
  });

  it('preenche variavel em check-in comum', () => {
    const plano = buildSessionPlan({
      vocabulary: VOCABULARIO,
      previous: [anterior({ key: 'waist', value: 82 })],
      now: AGORA,
      structuralRemeasureAfterDays: 180,
      isBaseline: false,
    });

    expect(plano.steps.find((s) => s.id === 'waist:na')?.prefilled).toBe(true);
  });

  // Baseline parcial: manter nao bloqueia, adia. Quem paga e o eixo, que fica
  // indisponivel ate a medida ser digitada uma vez.
  it('sinaliza que manter em baseline deixa o eixo pendente, sem tirar o preenchimento', () => {
    const plano = buildSessionPlan({
      vocabulary: VOCABULARIO,
      previous: [
        anterior({ key: 'waist', value: 82 }),
        anterior({ key: 'wrist', side: 'l', value: 17 }),
      ],
      now: AGORA,
      structuralRemeasureAfterDays: 180,
      isBaseline: true,
    });

    const cintura = plano.steps.find((s) => s.id === 'waist:na');
    expect(cintura?.prefilled).toBe(true);
    expect(cintura?.keptLeavesAxisPending).toBe(true);
    // Estrutural segue carregada: la mantido e o comportamento correto.
    expect(plano.carried.map((c) => c.key)).toContain('wrist');
  });

  it('fora de baseline nenhum passo deixa eixo pendente', () => {
    const plano = buildSessionPlan({
      vocabulary: VOCABULARIO,
      previous: [anterior({ key: 'waist', value: 82 })],
      now: AGORA,
      structuralRemeasureAfterDays: 180,
      isBaseline: false,
    });

    expect(plano.steps.every((s) => !s.keptLeavesAxisPending)).toBe(true);
  });
});

describe('resolveEntries', () => {
  const plano = buildSessionPlan({
    vocabulary: VOCABULARIO,
    previous: [
      anterior({ key: 'waist', value: 82 }),
      anterior({ key: 'wrist', side: 'l', value: 17 }),
      anterior({ key: 'wrist', side: 'r', value: 17 }),
    ],
    now: AGORA,
    structuralRemeasureAfterDays: 180,
    isBaseline: false,
  });

  function responder(overrides: Record<string, Answer> = {}): Map<string, Answer> {
    const base = new Map<string, Answer>();
    for (const step of plano.steps) base.set(step.id, { kind: 'typed', value: 40 });
    for (const [id, answer] of Object.entries(overrides)) base.set(id, answer);
    return base;
  }

  it('carimba digitado e mantido de forma diferente', () => {
    const resultado = resolveEntries(plano, responder({ 'waist:na': { kind: 'kept' } }));
    expect(resultado.status).toBe('ok');
    if (resultado.status !== 'ok') return;

    const cintura = resultado.entries.find((e) => e.key === 'waist');
    expect(cintura).toEqual({ key: 'waist', side: 'na', value: 82, provenance: 'kept' });
    expect(resultado.entries.find((e) => e.key === 'height')?.provenance).toBe('typed');
  });

  it('pular nao grava linha: medida ausente e linha ausente', () => {
    const resultado = resolveEntries(plano, responder({ 'waist:na': { kind: 'skipped' } }));
    expect(resultado.status).toBe('ok');
    if (resultado.status !== 'ok') return;
    expect(resultado.entries.some((e) => e.key === 'waist')).toBe(false);
  });

  it('inclui os valores carregados como mantidos', () => {
    const resultado = resolveEntries(plano, responder());
    expect(resultado.status).toBe('ok');
    if (resultado.status !== 'ok') return;
    const punho = resultado.entries.filter((e) => e.key === 'wrist');
    expect(punho).toHaveLength(2);
    expect(punho.every((e) => e.provenance === 'kept')).toBe(true);
  });

  it('acusa passo sem resposta em vez de gravar suposicao', () => {
    const respostas = responder();
    respostas.delete('waist:na');
    const resultado = resolveEntries(plano, respostas);
    expect(resultado.status).toBe('invalid');
    if (resultado.status !== 'invalid') return;
    expect(resultado.reasons).toContain('passo sem resposta: waist:na');
  });

  it('acusa manter valor que nunca existiu', () => {
    const semAnterior = buildSessionPlan({
      vocabulary: VOCABULARIO,
      previous: [],
      now: AGORA,
      structuralRemeasureAfterDays: 180,
      isBaseline: false,
    });
    const respostas = new Map<string, Answer>();
    for (const step of semAnterior.steps) respostas.set(step.id, { kind: 'kept' });

    const resultado = resolveEntries(semAnterior, respostas);
    expect(resultado.status).toBe('invalid');
    if (resultado.status !== 'invalid') return;
    expect(resultado.reasons).toContain('passo mantido sem valor anterior: waist:na');
  });
});

describe('variablesKeptAtBaseline', () => {
  it('lista so as variaveis mantidas, sem repetir', () => {
    const pendentes = variablesKeptAtBaseline(
      [
        { key: 'waist', side: 'na', value: 82, provenance: 'kept' },
        { key: 'arm_flexed', side: 'l', value: 38, provenance: 'kept' },
        { key: 'arm_flexed', side: 'r', value: 38, provenance: 'kept' },
        { key: 'wrist', side: 'l', value: 17, provenance: 'kept' },
        { key: 'height', side: 'na', value: 178, provenance: 'typed' },
      ],
      VOCABULARIO,
    );

    expect(pendentes).toEqual(['arm_flexed', 'waist']);
  });

  it('nao acusa nada quando tudo que e variavel foi digitado', () => {
    expect(
      variablesKeptAtBaseline(
        [{ key: 'waist', side: 'na', value: 82, provenance: 'typed' }],
        VOCABULARIO,
      ),
    ).toEqual([]);
  });
});

describe('propriedades', () => {
  const specArb = fc.record({
    key: fc.string({ minLength: 1, maxLength: 8 }).filter((s) => !s.includes(':')),
    labelPtBr: fc.constant('rotulo'),
    unit: fc.constantFrom<'cm' | 'kg'>('cm', 'kg'),
    bilateral: fc.boolean(),
    kind: fc.constantFrom<'structural' | 'variable'>('structural', 'variable'),
    displayOrder: fc.integer({ min: 1, max: 100 }),
  });

  it('sem historico, todo passo exige digitacao e nada e carregado', () => {
    fc.assert(
      fc.property(fc.uniqueArray(specArb, { selector: (s) => s.key, maxLength: 12 }), (vocab) => {
        const plano = buildSessionPlan({
          vocabulary: vocab,
          previous: [],
          now: AGORA,
          structuralRemeasureAfterDays: 180,
          isBaseline: false,
        });
        expect(plano.carried).toHaveLength(0);
        expect(plano.steps.every((s) => !s.prefilled)).toBe(true);
      }),
    );
  });

  it('todo valor do vocabulario aparece exatamente uma vez, como passo ou como carregado', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(specArb, { selector: (s) => s.key, maxLength: 12 }),
        fc.boolean(),
        (vocab, isBaseline) => {
          const previous: PreviousValue[] = vocab.flatMap((spec) =>
            (spec.bilateral ? (['l', 'r'] as const) : (['na'] as const)).map((side) => ({
              key: spec.key,
              side,
              value: 50,
              lastTypedAt: HA_UMA_SEMANA,
            })),
          );

          const plano = buildSessionPlan({
            vocabulary: vocab,
            previous,
            now: AGORA,
            structuralRemeasureAfterDays: 180,
            isBaseline,
          });

          const cobertos = [
            ...plano.steps.map((s) => s.id),
            ...plano.carried.map((c) => stepId(c.key, c.side)),
          ];
          expect(new Set(cobertos).size).toBe(cobertos.length);
          expect(cobertos.length).toBe(previous.length);
        },
      ),
    );
  });
});
