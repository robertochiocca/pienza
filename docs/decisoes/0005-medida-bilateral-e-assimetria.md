# 0005 — Medida bilateral: eixo pela média, diferença visível

Data: 2026-08-16 (revisada; a primeira versão escondia a diferença)
Situação: aceita

## Contexto

Três dos seis eixos apontam para medidas de membro par. `measurement_values` guarda os dois
lados. Faltava decidir o que o eixo faz com dois números, e o que a tela mostra.

**A primeira versão desta ADR errou por excesso.** Eu tinha decidido não exibir nenhuma
diferença entre lados, com o argumento de que erro de fita frequentemente supera a assimetria
real. O argumento está certo e não muda; a conclusão que tirei dele estava larga demais.

Ele justifica **não calcular um índice**. Não justifica esconder a diferença. Corpo assimétrico é
fato, e saber disso é interesse legítimo de quem mede o próprio corpo. O que fazer com a
informação é decisão da pessoa, não minha.

## Decisão

**O eixo do hexágono usa a média dos dois lados.**

Descartei as alternativas:

- **Maior dos dois** lisonjeia, e o defeito pior é outro: se o lado dominante mudar entre
  check-ins, o eixo salta sem o corpo ter mudado. O gráfico registraria um evento que não
  aconteceu.
- **Lado fixo** é arbitrário e joga fora metade do dado coletado.

**Os dois lados aparecem, e a diferença em cm aparece com eles:**

```
D 38,2 · E 37,4 · dif 0,8
```

- A diferença é **número cru: sem cor, sem rótulo, sem direção.** Não é "desequilíbrio", não é
  "assimetria", não é score. É a subtração, exibida.
- **O hexágono continua com a média.** Seis eixos em unidades comparáveis é o que faz o gráfico
  funcionar; um sétimo eixo em outra unidade quebra isso. Diferença entre lados tem tela própria.
- **O app não recomenda nada.** Nada de "treine mais o lado esquerdo", nada de sugerir trabalho
  unilateral. Isso é prescrição de exercício, privativa de profissional registrado, e já está na
  ADR 0002 por motivo independente. Mostrar o número informa; dizer o que fazer com ele
  prescreve.

**O que continua proibido é índice ou score de assimetria**, e o item 11 da ADR 0002 foi
estreitado para dizer exatamente isso. A fronteira: a subtração é o dado; um número que
transforma a subtração em avaliação precisaria de um limiar de erro plausível de aferição, e esse
limiar eu teria que inventar.

## O protocolo passou a importar mais

Se a diferença entre lados vai para a tela, o método de medição deixa de ser detalhe: erro de
aferição supera com facilidade a assimetria real, e boa parte desse erro é hora do dia e estado
de treino.

`checkins` ganhou captura opcional de contexto — `training_state` e o deslocamento de fuso, que é
o que torna a hora local recuperável a partir de um `timestamptz`. Nada disso entra em cálculo e
nada bloqueia o check-in. Existe para a série ser interpretável depois, não para corrigir a
medida.

## Consequências

Nenhuma mudança de schema para a exibição: `measurement_values` já tem `side`, e média e
diferença são cálculo de apresentação.

Quando faltar um dos lados, o eixo usa o lado presente. Exigir os dois transformaria uma medida
esquecida em eixo apagado. `proportion_ratios.inputs` anota quais lados entraram, porque um eixo
calculado com um lado num check-in e com dois no seguinte não é estritamente comparável.

Aceito que a média mascara mudança que só aconteceu de um lado. Os números crus estão na tela de
medidas, e agora a diferença também.

## O que descartei

**Esconder a diferença** — era a versão anterior desta ADR, e ela decidia pela pessoa o que ela
pode saber sobre o próprio corpo.

**Exibir a diferença com rótulo ou cor.** Rótulo nomeia, e nomear é avaliar. Cor idem, e a ADR
0010 tem um matiz só justamente para isso não estar disponível.
