# 0013 — O hexágono amplifica 4× no raio, e a ordem dos eixos move a área

Data: 2026-08-18 (reescrita em 2026-08-19: os dois achados trocaram de peso)
Situação: aceita para o que registra; **duas perguntas abertas**, na seção final

## Contexto

Dois achados saíram da mesma rodada de contas sobre o hexágono. Eles são independentes, e o
segundo é o que importa mais — a primeira versão deste documento os apresentava na ordem
inversa, e trocar essa ordem é a razão da reescrita.

### Achado principal: o fator de amplificação do mapeamento radial não estava declarado

`razaoParaRaio` leva uma razão contra o baseline para uma fração do raio, dentro de uma faixa
`[a, b]` e a partir de um raio mínimo `m`. A elasticidade na razão 1 é

    E = (1 − m) / [ (b − a) · ( m + (1 − m)·(1 − a)/(b − a) ) ]

Com os valores em vigor — `a = 0,85`, `b = 1,15`, `m = 0,25` — isso dá **exatamente 4**. Uma
razão 2% maior vira um raio 8% maior. A área de um polígono vai com o quadrado do raio, então
ela se move perto de 8 vezes o que a razão se moveu: 8 no limite, 8,3 num passo finito de 2%.

**A correção de vocabulário importa e está feita aqui:** `razaoParaRaio` amplifica **4×**, não 8.
O 8 é a área, e ele já inclui o quadrado. A primeira versão deste documento dizia "razaoParaRaio
amplifica cerca de 8 vezes", que pendura na função um fator que é metade dela e metade da
geometria do polígono. Quem ler isto daqui a um ano precisa dos dois números separados.

**Armadilha de leitura, e ela é fácil de cair:** no exemplo acima aparecem dois "8" que não são
a mesma coisa e coincidem só porque o passo escolhido foi 2%. O primeiro é *quanto o raio se
moveu* — 8%, que é 2% × 4. O segundo é a *elasticidade da área* — 8, que é um fator e não uma
porcentagem. Num passo de 3% o raio se move 12% e a elasticidade da área continua 8. Os dois
números se separam assim que o exemplo muda; se ao reconferir a conta os dois "8" pararem de
coincidir, isso é o esperado e não erro.

Os dois parâmetros puxam em sentidos opostos, e a direção do segundo é contra-intuitiva:

| escala                                | elasticidade do raio |
|---------------------------------------|----------------------|
| faixa ±5%, m = 0,25                    | 12,0                 |
| faixa ±10%, m = 0,25                   | 6,0                  |
| **faixa ±15%, m = 0,25 (em vigor)**    | **4,0**              |
| faixa ±25%, m = 0,25                   | 2,4                  |
| faixa ±15%, m = 0                      | 6,67                 |
| faixa ±15%, m = 0,5                    | 2,22                 |

Faixa mais estreita amplifica **mais**. Raio mínimo maior amplifica **menos** — com raio de
partida maior, a mesma variação absoluta vira variação relativa menor. Eu tinha escrito o
contrário sobre o raio mínimo antes de medir, e um teste pegou.

Disso sai um fato desconfortável: o raio mínimo entrou por motivo geométrico — sem ele um
vértice no mínimo da faixa cai no centro e o polígono colapsa — e é hoje o que mais segura o
exagero. Sem ele a elasticidade seria 6,67 em vez de 4. **O número que mais contém o problema
está no código por outro motivo, e ninguém o escolheu para isso.**

### Achado secundário: a ordem dos eixos move a área

A área de um radar de seis eixos igualmente espaçados é `A = (√3/4)·Σ rᵢ·rᵢ₊₁`, soma de produtos
de **vizinhos**. Vizinhança é função da ordem, então permutar os eixos muda a área sem alterar
nenhuma medida. Varrendo as 720 permutações sobre os raios plotados:

| corpo                                  | quanto a ordem move a área |
|----------------------------------------|----------------------------|
| equilibrado, razões de 0,97 a 1,03      | 1,1%                       |
| desproporcional, razões de 0,87 a 1,14  | **20,1%**                  |

Contra 13,9%, que é o quanto um ganho real de 2% em **todas** as seis medidas move a área do
corpo desproporcional. A ordem mexe 1,5 vez mais no resumo percebido do que meses de mudança no
corpo.

### Por que o parâmetro não declarado pesa mais

A ordenação tem confundidor: um `proportion_axes.display_order` congelado a neutraliza na
prática, e o comentário de coluna protege contra descongelar por engano. Ela é uma alavanca que
alguém precisa puxar.

Amplificação não se neutraliza com nada. É sistemática, vale para uma pessoa só, atinge todo
usuário toda vez, sobrevive a qualquer correção de ordem, e sobreviveria inclusive à troca do
radar por outro gráfico se o mapeamento radial fosse reaproveitado.

**E aqui é preciso ser exato sobre qual é o problema, porque a palavra errada leva ao conserto
errado.** Amplificar não é defeito: grade que não amplifica não mostra nada, e uma faixa de 0 a 2
com raio mínimo zero tornaria toda mudança real invisível. O gráfico não estava "exagerando" no
sentido de estar errado — ele estava aplicando um fator que ninguém tinha escolhido e que
ninguém sabia qual era. **O problema era não saber, não era o número.** Depois desta decisão o
fator continua 4 e está escrito.

Por isso o passo seguinte não é "baixar a amplificação". Baixar sem critério troca um número
arbitrário por outro. O critério só pode vir de decidir o que a escala deve mostrar, e essa
pergunta é prima da pergunta 2 abaixo, não da 1.

## Decisão

**1. A escala radial sai do código e vira ajuste de produto.** As quatro constantes — as duas
bordas da faixa, o raio mínimo e o limiar de estabilidade — entram em `product_settings` com
natureza e motivo escritos, como o 28 e o 180. Os motivos dizem o que é verdade: escolhidas para
a variação típica ocupar a maior parte da escala, sem fonte, arbitrárias dentro dessa intenção.

**Os valores não mudam nesta decisão.** O que muda é deixarem de ser constante de código, e o
fator que eles produzem passar a estar escrito e assertado. Corrigir os valores é decisão
separada e espera as perguntas abertas abaixo.

No domínio, os três números da escala viajam como um objeto único (`EscalaRadial`), sem valor
padrão, pelo mesmo motivo de `limiarEstavel`: eles definem juntos o fator de amplificação, e
escolher um sem os outros muda esse fator sem que ninguém tenha decidido mudá-lo.

**2. Reordenar eixos é mudança de produto, não ajuste operacional.** Um `UPDATE` em
`proportion_axes.display_order` muda retroativamente o que todos os usuários leem sobre check-ins
já gravados, sem nenhum dado ter mudado. O aviso está no comentário da coluna, que é onde quem
estiver no psql prestes a rodar o `UPDATE` vai ler, com asserção de suíte que reprova se sumir.

Existem duas colunas `display_order` e elas são independentes desde a primeira migração:
`measurement_keys.display_order` é o caminho da fita pelo corpo e **não** toca no gráfico. Essa
separação existia sem motivo escrito; agora tem. Quem for consolidá-las algum dia passa por aqui.

## As duas perguntas abertas, e quem decide cada uma

Elas se parecem e não são a mesma, e somá-las é o erro que este bloco existe para prevenir.

### Pergunta 1 — leitura. A codificação cheio/vazado é legível e aprendível?

**Quem responde: o campo.** Cinco pessoas, protocolo de três fases — A sem legenda, depois a
frase e B, depois C com a pergunta comparativa. Quinze frases literais.

Detector da leitura por área: se a primeira frase de três em cinco pessoas for sobre tamanho,
total, ou melhorou/piorou no geral, a leitura por área está confirmada.

Se confirmada, as saídas, na ordem honesta:

- **A — tirar o preenchimento.** Resolve menos e não estraga nada. A área ainda se forma na
  percepção, só mais fraca.
- **B — normalizar cada eixo pela média dos seis.** Resolve a área e cobra um enunciado que quase
  ninguém vai ler certo: normalizar **acopla** os seis eixos, porque a soma das razões
  normalizadas é constante por construção. Quem ganhou braço e manteve o resto vê cinco vértices
  recuarem sem ter perdido nada. Isso é verdade sobre repartição e é bem mais difícil de ler que
  o problema que resolve. Não é da mesma classe do matiz único: o matiz único elimina um canal
  sem criar nada, e este elimina um canal criando um acoplamento.
- **C — abandonar o radar** por seis pequenos múltiplos. Resolve tudo e custa a gestalt.

### Pergunta 2 — propósito. Um gráfico radar deve existir neste app?

**Quem responde: o Roberto. O campo não responde isto, e um resultado bom na pergunta 1 não
fecha a pergunta 2.**

**A pergunta 2 decide primeiro; o card de compartilhamento é restringido por ela e não a
restringe.** A ordem importa e é sutil: decidir o card antes responderia a pergunta 2 de fato,
porque se o card for um hexágono, o app tem um hexágono — e aí a decisão sobre o gráfico central
teria sido tomada por uma peça de marketing, sem ninguém notar que estava decidindo.

O argumento registrado antes do campo, para que não pareça ter vindo do resultado: a força do
radar é a gestalt, e aqui a gestalt **é** o resumo espúrio. Isso não é defeito corrigível — é o
gráfico fazendo o que radar faz. Para seis eixos sem valência comum, a característica principal
do gráfico é o bug. O hexágono nasceu para responder "onde estou menos desenvolvido", que
pressupõe um padrão externo; o app deixou de responder isso na ADR 0001. Pode ser resquício do
enquadramento antigo.

O que segura a saída C é o artefato de compartilhamento, que é a tese de crescimento do produto.
Mas isso não obriga o card a reusar o hexágono, e reusar seria escolher o gráfico honesto para
uso privado e o enganoso para uso público. **O card é problema de desenho separado e não deve ser
resolvido por herança.**

## Consequências

**O que depende de o radar sobreviver cresceu 36% entre os ciclos 7 e 9 — de cerca de 870 para
1.180 linhas — e esse crescimento veio de pedido meu, e não de deriva de quem implementou.** A
variante normalizada pela média, os testes de elasticidade e a migração da escala para
`product_settings` foram os três itens; cada um se defendia isoladamente, e juntos aumentaram em
mais de um terço a pilha do descartável enquanto a pergunta que a decide esperava. Fica escrito
aqui para o histórico não sugerir o contrário. A classificação por risco de descarte que saiu
disso está na ADR 0014.

Cinco pessoas dizendo que entenderam o desenho não respondem se o desenho deveria existir. O
risco concreto deste ciclo é a pergunta 2 ser dada como fechada por um teste que não a mediu, e é
por isso que ela está escrita aqui com dono nomeado.

A escala em `product_settings` cria uma duplicação: o harness web não tem banco e carrega os
quatro valores como literais. A fonte de verdade é o banco, a suíte fixa os valores do lado dele,
e a saída de verdade é o app buscar os valores em vez de o harness adivinhá-los. Dívida
declarada, registrada no próprio arquivo do harness.

## O que descartei

**Corrigir os valores agora.** Estreitar ou alargar a faixa muda o fator de amplificação, e não
sei ainda se o problema a resolver é o fator ou o gráfico inteiro. Corrigir antes do campo seria
escolher uma das saídas por conforto.

**Congelar a ordem dos eixos no código.** Tiraria a coluna do banco e impediria a única correção
legítima que pode aparecer: se o campo mostrar que a ordem atual induz uma leitura ruim, mudar a
ordem é dado e não deploy.

**Unificar as duas colunas `display_order`.** Elas guardam ordens quase iguais e a duplicação
parece acidental. Unificar acoplaria a leitura do gráfico ao caminho da fita, que é exatamente o
acidente que este documento previne.

**Ordenar os eixos por valor** para a área ficar estável. Faria os eixos trocarem de lugar entre
check-ins, e a pessoa perderia a referência espacial que faz o gráfico ser comparável consigo
mesmo.
