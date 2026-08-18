-- A ordem dos eixos do hexagono nao e cosmetica.
--
-- A area de um poligono radar de seis eixos igualmente espacados e
--   A = (raiz(3)/4) * soma de r_i * r_{i+1}, ciclico
-- Ela soma produtos de VIZINHOS, e vizinhanca e funcao da ordem. Permutar os eixos
-- muda a area sem alterar nenhuma medida.
--
-- Medido sobre os raios que o app de fato desenha, varrendo as 720 permutacoes:
-- corpo equilibrado 1,1%; corpo desproporcional 20,1%. E um ganho real de 2% em todas
-- as seis medidas move a area em 13,9%. A ordem mexe uma vez e meia mais no resumo
-- percebido do que a mudanca do corpo, e o efeito e maior justamente para quem tem o
-- corpo mais desproporcional.
--
-- Consequencia pratica: um UPDATE nesta coluna muda retroativamente o que todos os
-- usuarios leem sobre check-ins ja gravados. Nao e ajuste operacional.
--
-- Esta coluna e a de measurement_keys.display_order sao coisas diferentes e continuam
-- separadas de proposito: aquela e o caminho da fita pelo corpo e nao toca no grafico.
-- Ver docs/decisoes/0013-ordem-dos-eixos.md.
comment on column proportion_axes.display_order is
  'Ordem dos eixos ao redor do hexagono. NAO e cosmetica: a area do poligono soma '
  'produtos de vizinhos, entao reordenar muda o resumo percebido sem mudar dado '
  'nenhum — ate 20% para um corpo desproporcional, contra 14% de um ganho real de 2% '
  'em todas as medidas. Alterar aqui e mudanca de produto, retroativa sobre todos os '
  'check-ins ja gravados. Ver docs/decisoes/0013-ordem-dos-eixos.md.';

comment on column measurement_keys.display_order is
  'Ordem dos passos da sessao guiada, seguindo o caminho da fita pelo corpo. Livre '
  'para ajustar: nao governa a ordem dos eixos do hexagono, que vive em '
  'proportion_axes.display_order e tem consequencia bem diferente.';
