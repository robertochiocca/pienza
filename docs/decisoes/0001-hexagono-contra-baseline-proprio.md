# 0001 — O hexágono compara você com você

Data: 2026-08-16
Situação: aceita

## Contexto

Eu tinha escrito duas coisas que não fechavam. Que a comparação é sempre contra você mesmo, e
que cada eixo do hexágono vale `medida_atual / medida_de_referência`, com a referência vindo de
um modelo estético externo ancorado na estrutura óssea.

O ideal externo não tinha sido eliminado. Tinha sido embutido no denominador de todos os seis
eixos. O anel externo do gráfico continuava sendo um alvo — só que anônimo, e portanto pior:
a copy ficava limpa enquanto a matemática fazia a comparação ascendente.

Some-se a isso que os dois sistemas de proporção que eu tinha em mãos, McCallum e Reeves, são
padrões estéticos masculinos de meados do século XX derivados em boa parte das medidas de
competição de um único homem. Aplicados sem alteração a um corpo feminino, produzem hexágono
desequilibrado por construção.

## Decisão

**O denominador é o baseline do próprio usuário.**

```
ratio = medida_atual / medida_no_baseline
```

O baseline é o primeiro check-in, e o usuário pode redefinir quando quiser — início de um novo
ciclo, por exemplo. A redefinição fecha o período vigente e abre outro, em `baselines`, para que
uma razão calculada antes continue auditável depois.

**Os seis eixos plotam a razão crua. Não há inversão de eixo.**

Eu tinha proposto inverter o eixo de cintura com saturação em 1,0, para que redução de cintura
não empurrasse o gráfico para fora indefinidamente. A saturação eliminava o gradiente de
incentivo, mas criava coisa pior: com valor plotado `min(1, baseline/atual)`, o eixo fica
monotônico numa direção só. Quem reduz cintura vê o vértice congelado na posição do dia 1; quem
ganha cintura vê o vértice encolher. O único evento de cintura que o gráfico consegue mostrar
passa a ser o ganho.

A raiz é que a inversão em si já é o app tomando posição sobre o que é bom. No modo de
referência externa essa posição vinha embutida no modelo e não tinha como sair. Contra o próprio
baseline ela é opcional — e eu escolho não tomá-la.

Consequências diretas no schema:

- `proportion_ratios.ratio` guarda `current_value / reference_value` cru, nunca ajustado por
  direção
- `proportion_axes` não tem coluna `lower_is_better`
- `denominator_kind` entra agora, porque muda o significado de toda linha escrita na Fase 1 e a
  Fase 3 precisa saber interpretar o histórico
- `reference_model_id` fica adiado: é `ADD COLUMN` nullable sem custo, e criá-la agora seria um
  uuid apontando para tabela que não existe, sem chave estrangeira que o segure

O modo de referência externa vai para a Fase 3, opt-in e desligado por padrão.

## Consequências

**Aceito que no dia 1 todos os ratios valem 1 e o hexágono sai regular.** Perco o gancho de
onboarding "veja onde você está mais fraco", que era o argumento mais forte do modelo externo.
Ganho um produto que funciona para qualquer corpo sem precisar de um modelo validado por
população, que não depende de nenhuma fonte que eu não consigo verificar, e cuja tese é
verdadeira no código e não só no marketing. O laço de retenção passa a ser o check-in, que é o
que importa mesmo.

**Fica um problema de leitura para a Fase 1, e ele não está resolvido.** "Para fora = bom" é
convenção forte. Um vértice de cintura recolhendo vai ser lido por parte das pessoas como piora,
mesmo o app não afirmando nada. A saída óbvia — vermelho e verde para indicar direção —
reintroduz por cor exatamente o juízo de valor que tirei da matemática, e está proibida pela ADR
0002. Se eu codificar direção, será por matiz neutro ou por rótulo. E isso precisa ser testado
com gente na Fase 1, não declarado resolvido porque eu escrevi um rótulo diferente.

**Fica em aberto como o eixo trata medida bilateral.** `proportion_axes` mapeia cada eixo para
uma chave de medida, e braço, coxa e panturrilha têm lado esquerdo e direito. Usar o maior dos
dois lisonjeia; usar a média é mais honesto; usar um lado fixo ignora assimetria real. É decisão
da Fase 1 e ainda não tomei.

## O que descartei

**Manter a referência externa com a copy blindada.** Não confio em blindagem de copy sobre uma
matemática que continua apontando para um ideal. A copy muda a cada revisão de produto; o
denominador fica.

**Inverter o eixo de cintura sem saturação.** Restauraria o gradiente que premia redução — e
pior que na versão com ideal externo, porque cada redefinição de baseline rezera a escala e o
prêmio se renova para sempre.

**Normalizar contra a média da população.** Precisaria de fonte antropométrica que eu não tenho,
e substituiria um corpo idealizado por outro.
