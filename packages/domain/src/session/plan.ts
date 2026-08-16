import type {
  Answer,
  CarriedValue,
  MeasurementSpec,
  PreviousValue,
  ResolveResult,
  ResolvedEntry,
  SessionPlan,
  SessionStep,
  Side,
} from './types';

const MILLISECONDS_PER_DAY = 86_400_000;

export function stepId(key: string, side: Side): string {
  return `${key}:${side}`;
}

function sidesOf(spec: MeasurementSpec): readonly Side[] {
  // Medida de membro par vira dois passos adjacentes. Medir os dois bracos antes de
  // descer para o antebraco e o que evita subir e descer com a fita na mao.
  return spec.bilateral ? ['l', 'r'] : ['na'];
}

export interface SessionPlanInput {
  readonly vocabulary: readonly MeasurementSpec[];
  readonly previous: readonly PreviousValue[];
  readonly now: Date;
  /**
   * Ha quantos dias uma medida estrutural volta a ser proposta. Sem valor padrao de
   * proposito: e numero de produto, e nao ha nada no dominio que o justifique. Quem
   * chama decide, e a decisao fica visivel no ponto de chamada.
   */
  readonly structuralRemeasureAfterDays: number;
  /**
   * Check-in que vai abrir baseline. Um baseline contaminado desloca os seis eixos
   * para sempre, e o banco rejeita abri-lo sobre medida variavel mantida.
   */
  readonly isBaseline: boolean;
}

/**
 * Monta a sequencia guiada de um check-in.
 *
 * A ordem vem de `displayOrder` do vocabulario, e nao de uma lista aqui dentro: ela
 * segue o caminho da fita pelo corpo, e mudar esse caminho tem que ser mudanca de
 * dado e nao de codigo.
 */
export function buildSessionPlan(input: SessionPlanInput): SessionPlan {
  const anterior = new Map<string, PreviousValue>();
  for (const valor of input.previous) {
    anterior.set(stepId(valor.key, valor.side), valor);
  }

  const steps: SessionStep[] = [];
  const carried: CarriedValue[] = [];

  const ordenado = [...input.vocabulary].sort((a, b) => a.displayOrder - b.displayOrder);

  for (const spec of ordenado) {
    for (const side of sidesOf(spec)) {
      const id = stepId(spec.key, side);
      const previo = anterior.get(id);

      if (spec.kind === 'structural' && previo !== undefined) {
        const diasDesdeAfericao =
          (input.now.getTime() - previo.lastTypedAt.getTime()) / MILLISECONDS_PER_DAY;
        if (diasDesdeAfericao < input.structuralRemeasureAfterDays) {
          // Nao vira passo: remedir o punho toda semana e atrito com ganho de
          // informacao zero. Aqui `kept` e o comportamento correto, nao concessao.
          carried.push({ key: spec.key, side, value: previo.value });
          continue;
        }
      }

      // Em check-in de baseline, medida variavel nunca abre preenchida. Se abrisse, a
      // pessoa avancaria confirmando, o valor sairia como mantido, e o banco recusaria
      // o baseline no fim da sessao — erro tardio sobre trabalho ja feito.
      const prefilled = previo !== undefined && !(input.isBaseline && spec.kind === 'variable');

      steps.push({
        id,
        key: spec.key,
        side,
        labelPtBr: spec.labelPtBr,
        unit: spec.unit,
        kind: spec.kind,
        previousValue: previo?.value ?? null,
        prefilled,
      });
    }
  }

  return { steps, carried };
}

/**
 * Transforma as respostas da sessao em linhas de `measurement_values`.
 *
 * Devolve resultado carimbado em vez de lancar: entrada incoerente e um estado que a
 * tela precisa saber tratar, e uma excecao aqui viraria um `catch` generico longe do
 * ponto em que da para explicar o que aconteceu.
 */
export function resolveEntries(
  plan: SessionPlan,
  answers: ReadonlyMap<string, Answer>,
): ResolveResult {
  const entries: ResolvedEntry[] = [];
  const reasons: string[] = [];

  for (const step of plan.steps) {
    const answer = answers.get(step.id);

    if (answer === undefined) {
      reasons.push(`passo sem resposta: ${step.id}`);
      continue;
    }

    switch (answer.kind) {
      case 'typed':
        entries.push({ key: step.key, side: step.side, value: answer.value, provenance: 'typed' });
        break;

      case 'kept':
        if (step.previousValue === null) {
          reasons.push(`passo mantido sem valor anterior: ${step.id}`);
          break;
        }
        entries.push({
          key: step.key,
          side: step.side,
          value: step.previousValue,
          provenance: 'kept',
        });
        break;

      // Pular nao grava nada. Medida ausente e linha ausente, que e a semantica de
      // eixo indisponivel — nunca zero, que se confunde com "nao mudou".
      case 'skipped':
        break;
    }
  }

  for (const valor of plan.carried) {
    entries.push({ key: valor.key, side: valor.side, value: valor.value, provenance: 'kept' });
  }

  if (reasons.length > 0) {
    return { status: 'invalid', reasons };
  }

  return { status: 'ok', entries };
}

/**
 * Medidas variaveis que sairiam mantidas, e por isso impediriam abrir baseline.
 *
 * Existe para a tela poder avisar antes, no proprio passo, em vez de deixar o banco
 * recusar o baseline depois da sessao inteira preenchida.
 */
export function variablesBlockingBaseline(
  entries: readonly ResolvedEntry[],
  vocabulary: readonly MeasurementSpec[],
): readonly string[] {
  const variavel = new Set(
    vocabulary.filter((spec) => spec.kind === 'variable').map((spec) => spec.key),
  );
  const bloqueando = entries
    .filter((entry) => entry.provenance === 'kept' && variavel.has(entry.key))
    .map((entry) => entry.key);
  return [...new Set(bloqueando)].sort();
}
