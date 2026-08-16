# 0005 — Medida bilateral entra no eixo pela média, e assimetria não vira métrica

Data: 2026-08-16
Situação: aceita

## Contexto

Três dos seis eixos do hexágono apontam para medidas de membro par: braço, coxa e panturrilha.
`measurement_values` guarda os dois lados. Faltava decidir o que o eixo faz com dois números.

## Decisão

**O eixo plota a média dos dois lados. Os dois lados são sempre gravados e sempre exibidos como
números crus na tela de medidas.**

Descartei as outras três:

- **Maior dos dois** lisonjeia, e o defeito pior é outro: se o lado dominante mudar entre
  check-ins, o eixo salta sem o corpo ter mudado. O gráfico registraria um evento que não
  aconteceu.
- **Lado fixo** é arbitrário e joga fora metade do dado coletado.
- **Média** esconde assimetria, e aceito isso: o hexágono não é o lugar de mostrar assimetria.

**E não computo nenhuma métrica de assimetria.** Sem delta calculado entre os lados, sem
percentual, sem rótulo, sem direção. Dois números lado a lado e pronto — quem lê tira suas
conclusões.

Dois motivos, e o primeiro é o que fecha a questão:

1. **Fita métrica na mão da própria pessoa tem erro de medição que frequentemente supera a
   assimetria real.** Exibir "seu braço direito está 0,4 cm maior" é apresentar ruído como
   achado. Fugir disso exigiria um limiar de erro plausível de aferição, e esse número eu teria
   que inventar. Não invento.
2. **Assimetria tem causas que vão de dominância manual a lesão.** O app não pode interpretá-las,
   e qualquer rótulo que eu colocasse seria afirmação clínica sem base.

## Consequências

Nenhuma mudança de schema: `measurement_values` já tem `side`, e a média é cálculo de
apresentação e de eixo, feito em `packages/domain`.

Quando faltar um dos lados, o eixo usa o lado presente. É melhor que devolver indisponível, e a
alternativa — exigir os dois — transformaria uma medida esquecida em eixo apagado. Fica anotado
em `inputs` de `proportion_ratios` quais lados entraram, porque um eixo calculado com um lado num
check-in e com dois no seguinte não é estritamente comparável, e eu quero conseguir enxergar isso
depois.

Aceito que a média pode mascarar uma mudança que só aconteceu de um lado. Os números crus estão
na tela de medidas para quem quiser olhar.

## O que isso proíbe

Este item entra na lista da ADR 0002 como proibição explícita, com gate. Métrica de assimetria é
exatamente o tipo de feature que parece útil, é fácil de implementar a partir do dado que já
existe, e não tem como ser honesta com o instrumento de medição disponível.
