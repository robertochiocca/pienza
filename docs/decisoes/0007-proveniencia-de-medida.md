# 0007 — Toda medida carrega como entrou

Data: 2026-08-16
Situação: aceita

## Contexto

A entrada de medidas é o ato repetido do produto, e é onde o app morre por atrito. Pré-preencher
cada campo com o valor do check-in anterior é a alavanca mais óbvia: a pessoa confirma o que não
mudou e a sessão encolhe.

A objeção levantada contra isso era boa e eu não a descartei: pré-preencher convida a confirmar
sem medir. A série vira uma linha reta que descreve o hábito de tocar em "próximo", não o corpo.
E como o denominador de todos os eixos é o baseline (ADR 0001), um baseline contaminado estraga
os seis eixos de uma vez.

Mas o defeito não é o pré-preenchimento. É ele produzir um valor **cuja proveniência não é
registrada**, indistinguível de medição real. Esse é o mesmo problema que este repositório já
resolveu duas vezes: estado inválido não vira `null` silencioso, vira resultado carimbado com
motivo; e `proportion_ratios.inputs` anota quais lados entraram, porque um eixo com um lado não é
estritamente comparável a um com dois.

Aplico o mesmo padrão um nível acima.

## Decisão

**Toda medida carrega como entrou.** Coluna `provenance` em `measurement_values`, com dois
valores:

- `typed` — a pessoa digitou naquele check-in
- `kept` — veio do check-in anterior sem ser remedida

É coluna, não inferência. Comparar com o valor anterior para deduzir se mudou não distingue
"mediu e deu igual" de "não mediu": os dois casos produzem o mesmo número, e são fatos diferentes
sobre o mundo.

Os identificadores ficam em inglês porque todo o resto do schema é (`status`, `denominator_kind`,
`angle`, `front`). `typed` corresponde a digitado e `kept` a mantido.

### Consequências mecânicas, nenhuma delas julgando quem usa

**Baseline só se estabelece a partir de valor digitado.** _(Revisto na ADR 0011: o baseline
passou a abrir parcial, e a proteção migrou do gatilho para a restrição de `proportion_ratios`.
O parágrafo abaixo descreve a regra original.)_ É o único lugar onde a contaminação é
irreversível — um baseline ruim desloca todos os eixos para sempre, e não há como saber depois
que ele era ruim. A regra é trava de banco, não convenção: um gatilho rejeita abrir baseline num
check-in que tenha medida variável com `provenance = 'kept'`. Se a pessoa redefinir baseline,
aquele check-in exige digitação.

**`proportion_ratios` anota a proveniência dos dois lados da razão**, em colunas próprias
(`current_provenance`, `reference_provenance`), do mesmo jeito que já anota os lados do corpo. Um
eixo cujo numerador ou denominador é `kept` não é o mesmo objeto que um eixo medido nas duas
pontas, e a diferença precisa ser consultável e não só inferível.

**A tela mostra a proveniência de forma neutra.** Marcador discreto na linha. Sem cor de alerta,
sem contagem, sem tom de cobrança, sem "você não mede isso há três semanas". É informação sobre o
dado, não sobre a pessoa — e a fronteira entre as duas coisas é a mesma que a ADR 0002 defende.

**Sem nudge, sem lembrete, sem selo.** Cairia direto na lista da ADR 0002.

## Divisão estrutural / variável

Nem toda medida muda, e tratar todas igual é atrito com ganho de informação zero.

Punho, tornozelo, joelho, cabeça, altura e envergadura são **estruturais**: ancoram os modelos de
proporção justamente por não mudarem. Remedir o punho toda semana não produz informação.

Pescoço, ombros, peito, cintura, quadril, braço, antebraço, coxa, panturrilha e peso são
**variáveis**. São as que se movem e são as que o hexágono usa para detectar mudança.

- Em medida estrutural, `kept` é o comportamento correto, não uma concessão. Ela não entra na
  trava do baseline e a remedição é proposta em cadência longa.
- Em medida variável, `kept` é um estado com consequência real nas regras acima.

Isso tira nove dos vinte e cinco valores da sessão recorrente sem tocar em nada que o hexágono
usa.

A classificação vive em `measurement_keys.kind`, em tabela e não em constante de código, porque
classificar uma medida é decisão de domínio e vai ser revista.

## Consequências

`measurement_values.provenance` é `not null` sem valor padrão. Sem padrão de propósito: quem
escreve tem que dizer como o valor entrou, e um `insert` que esqueça falha em vez de gravar uma
suposição.

O gatilho do baseline roda em `insert` de `baselines`, e a mensagem de erro nomeia as medidas que
faltam digitar — erro que não diz o que fazer vira suporte.

Aceito que a pessoa pode digitar um número inventado, e nenhuma coluna resolve isso. A
proveniência não mede honestidade; ela separa "o app preencheu" de "a pessoa preencheu", que é a
parte que o app sabe e é responsável por registrar.

## O que descartei

**Não pré-preencher.** Resolveria a integridade sacrificando exatamente o problema central da
Fase 1. A proveniência entrega as duas coisas.

**Inferir proveniência comparando com o valor anterior.** Ver acima: confunde dois fatos
diferentes.

**Guardar a proveniência só em `inputs` de `proportion_ratios`.** `inputs` é diagnóstico livre. A
regra do baseline precisa de coluna consultável e restringível.
