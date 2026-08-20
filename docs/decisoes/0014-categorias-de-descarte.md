# 0014 — Quatro categorias por risco de descarte, e o piso de cobertura não vale na quarta

Data: 2026-08-19
Situação: aceita

## Contexto

Enquanto a pergunta 2 da ADR 0013 estiver aberta — se um gráfico radar deve existir neste app —
todo trabalho no hexágono é trabalho que pode ser jogado fora, e o custo de jogá-lo fora cresce a
cada ciclo em que ele fica mais correto. O ciclo 9 inventariou o repositório sob essa lente e a
classificação em três categorias deixou um item de fora: a página de teste de campo.

Ela não sobrevive a tudo, não depende do radar sobreviver, e não é "não sei classificar". Ela é
instrumento de medição: o valor dela é a resposta que ela produz, e ela pode ser descartada no dia
seguinte ao teste sem perda nenhuma — inclusive se o radar sobreviver.

## Decisão

**Quatro categorias, usadas em todo inventário daqui para frente:**

1. **Sobrevive a tudo.** Domínio de unidades, sessão, comparação, telas de entrada e revisão,
   schema, RLS, gates, harness. Nenhuma decisão pendente pode apagá-lo.
2. **Sobrevive condicionalmente.** Hoje: só se o radar sobreviver. Cerca de 1.180 linhas.
3. **Não sei classificar.** A lista mais útil de um inventário, porque é onde a fronteira está
   mal desenhada — `EstadoDoEixo` morando dentro de `src/hexagon` quando o conceito sobrevive a
   qualquer saída é o exemplo vivo.
4. **Descartável por construção.** Trabalho cujo produto é a informação e não o código. A página
   de campo é o caso puro: ela existe para produzir quinze frases e depois não tem função.

A distinção entre 2 e 4 é quem decide o descarte. Na 2, uma decisão futura pode matar o código;
na 4, o código morre por ter cumprido o propósito, e isso não é perda.

**O piso de cobertura de 100% não vale para a categoria 4.** O piso existe porque o domínio é
lógica pura e uma linha sem teste ali é uma linha que ninguém escreveu teste para. Em código cujo
produto é uma resposta, cobrir 100% é escrever teste para um instrumento que vai ser descartado
assim que a medição terminar — custo real, benefício que expira junto com o código.

Hoje isso **não exige nenhuma exclusão**: o piso cobre apenas `packages/domain/src`, e a
categoria 4 inteira mora fora dele — `apps/mobile/web/campo.tsx` nunca entrou na métrica. A regra
fica escrita para o caso que ainda não aconteceu: se algum dia código de categoria 4 precisar
morar em `packages/domain`, ele é excluído nominalmente do `include` da cobertura, com o motivo
ao lado, e não por baixar o piso.

## Consequências

Classificar passa a ser trabalho de todo inventário, e a categoria 4 tende a ser subdeclarada:
é confortável chamar de permanente o que se acabou de escrever. O sinal de que algo é 4 é
poder responder "e depois que a resposta chegar?" com "aí não preciso mais dele".

O harness quase cai na 4 e não cai: ele é usado toda vez que uma tela muda, então o produto dele
não é uma resposta única. Essa é a fronteira, e ela é fina.

## O que descartei

**Três categorias, tratando a página de campo como descartável dentro da 2.** Junta duas coisas
com donos diferentes: o que morre por decisão alheia e o que morre por ter funcionado. A segunda
não deveria pesar no argumento de custo composto que motivou o inventário.

**Excluir a página de campo da cobertura agora.** Não está incluída. Exclusão preventiva de algo
que a métrica não mede seria configuração sem defeito por trás, contra a 1.1.
