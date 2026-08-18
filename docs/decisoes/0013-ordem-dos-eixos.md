# 0013 — A ordem dos eixos move o resumo que o gráfico dá, e a coluna é `proportion_axes`

Data: 2026-08-18
Situação: aceita

## Contexto

Existem **duas** colunas `display_order` neste schema, e a distinção entre elas passou a
importar:

- `measurement_keys.display_order` — a ordem da sessão guiada, que segue o caminho da fita pelo
  corpo. Foi ela que motivou levar a ordem para o banco: ajustar o caminho depois de ver alguém
  medindo tem que ser mudança de dado e não de código.
- `proportion_axes.display_order` — a ordem dos eixos ao redor do hexágono.

Elas são independentes desde a primeira migração, e **é a segunda que este documento trata.**
Registro isso explicitamente porque a suposição natural — e a que eu mesmo carreguei ao começar a
escrever — é que a ordem da fita governa a ordem do gráfico. Não governa. Mexer no caminho da
fita não move o hexágono de ninguém, e a liberdade que motivou aquela decisão continua intacta.

O que apareceu no ciclo 7: **a ordem dos eixos muda a área do polígono com os dados intactos.**

A área de um polígono radar de seis eixos igualmente espaçados é

    A = (√3/4) · Σ rᵢ · rᵢ₊₁     (índices cíclicos)

Ela soma produtos de **vizinhos**, não de todos os pares. Vizinhança é função da ordem, então
permutar os eixos muda a área sem alterar uma única medida — grandes contra grandes somam mais
que grandes intercalados com pequenos.

Medido sobre os raios que este app de fato desenha (`razaoParaRaio`, faixa 0,85–1,15, raio mínimo
0,25), varrendo as 720 permutações:

| corpo                                      | quanto a ordem move a área |
|--------------------------------------------|---------------------------|
| equilibrado, razões de 0,97 a 1,03           | 1,1%                      |
| desproporcional, razões de 0,87 a 1,14       | **20,1%**                 |
| desproporcional saindo da faixa, 0,65 a 1,45 | 37,5%                     |

E a comparação que decide: para o corpo desproporcional, um ganho real de 2% em **todas** as seis
medidas move a área em 13,9%. Reordenar os eixos move 20,1%. **A ordem mexe 1,5 vez mais no
"resumo" percebido do que meses de mudança no corpo** — e o efeito é maior exatamente para a
pessoa cujo corpo é mais desproporcional, que é de quem o gráfico mais trata.

## Decisão

**`display_order` é dado que afeta a leitura do gráfico, e alterá-lo é mudança de produto
sujeita a gate humano, não ajuste operacional.**

Concretamente:

- Um `UPDATE` em `proportion_axes.display_order` muda o resumo percebido de **todos** os
  usuários, retroativamente, sobre check-ins já gravados, sem que nenhum dado tenha mudado.
- `measurement_keys.display_order` segue livre: ela é o caminho da fita e não toca no gráfico.
- A coluna carrega um comentário de banco dizendo isso, porque quem for mexer nela vai estar no
  psql e não neste arquivo.
- Nenhuma rotina automática — seed, migração de conveniência, script de manutenção — reordena.

Isto **não** decide nada sobre a leitura por área em si. A área ser um canal de informação não
intencional é problema aberto, e as saídas possíveis (tirar o preenchimento, normalizar pela
média dos seis, ou abandonar o radar) esperam o teste de campo. Este documento registra apenas
que, enquanto o radar existir, a ordem dos eixos é uma alavanca sobre o que as pessoas leem.

## Consequências

A separação das duas colunas, que existia desde a primeira migração sem que ninguém tivesse
escrito por quê, passa a ter motivo escrito. Ela deixa de ser detalhe de modelagem e vira a coisa
que impede um ajuste no caminho da fita de reescrever o gráfico de todo mundo. Quem for
consolidar as duas colunas algum dia — e a tentação existe, porque hoje elas guardam quase a
mesma ordem — precisa ler isto antes.

Um segundo achado do mesmo cálculo, registrado aqui porque tem a mesma origem e não tem ADR
próprio ainda: **`razaoParaRaio` amplifica cerca de 8 vezes.** Com a faixa em 0,85–1,15 e raio
mínimo 0,25, uma razão 2% maior vira um raio 8% maior e uma área 16,6% maior. O gráfico exagera
a mudança quase uma ordem de grandeza, e isso é independente do problema de ordenação — vale
mesmo com a ordem congelada. Também espera o campo.

## O que descartei

**Congelar a ordem dos eixos no código.** Resolveria o efeito retroativo tirando a coluna do
banco, e o problema não é ela ser editável — é a consequência de editá-la nunca ter sido escrita.
Congelar também impediria a única correção legítima que pode aparecer: se o campo mostrar que a
ordem atual induz uma leitura ruim, mudar a ordem é dado e não deploy.

**Unificar as duas colunas.** Elas guardam ordens quase iguais hoje e a duplicação parece
acidental. Unificar acoplaria a leitura do gráfico ao caminho da fita, que é exatamente o
acidente que este documento existe para prevenir.

**Ordenar os eixos do gráfico por valor**, para a área ficar estável. Deixaria a área quase
constante e faria os eixos trocarem de lugar entre check-ins, o que é pior: a pessoa perderia a
referência espacial que faz o gráfico ser comparável consigo mesmo.

**Tratar isto como bug do gráfico e corrigir agora.** A correção certa depende de qual leitura as
pessoas de fato fazem, e isso está sendo medido em campo. Corrigir antes do teste seria escolher
uma das três saídas por conforto.
