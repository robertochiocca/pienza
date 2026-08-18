-- A escala radial do hexagono sai do codigo e vira ajuste de produto.
--
-- Motivo, e ele e o achado principal do ciclo 7: o mapeamento de razao para raio
-- amplifica. Na razao 1, a elasticidade e
--
--   E = (1-m) / [ (b-a) * (m + (1-m)*(1-a)/(b-a)) ]
--
-- com a e b as bordas da faixa e m o raio minimo. Nos valores em vigor da exatamente 4:
-- uma razao 2% maior vira um raio 8% maior, e como a area de um poligono vai com o
-- quadrado do raio, ela se move perto de 8 vezes o que a razao se moveu.
--
-- Um app cuja tese e honestidade de medida estava exagerando a mudanca em quatro vezes
-- no raio por uma escolha de desenho que nunca passou por decisao. Os numeros nao mudam
-- aqui; o que muda e eles deixarem de ser constante de codigo e passarem a carregar
-- natureza e motivo, como o 28 e o 180.
--
-- Diferente da ordenacao dos eixos, isto nao tem confundidor e nao se neutraliza com
-- nada: vale para uma pessoa so, atinge todo usuario toda vez, e sobrevive a qualquer
-- correcao de ordem. Ver docs/decisoes/0013-ordem-dos-eixos.md.

insert into product_settings (key, value, unit, nature, rationale) values
  (
    'hexagon_scale_ratio_min',
    0.85,
    'razao',
    'produto',
    'Razao que cai na borda de dentro da grade do hexagono. Junto com o maximo e o raio '
    'minimo, define o quanto o desenho amplifica: faixa mais estreita amplifica mais. '
    'Escolhida para a variacao tipica ocupar a maior parte da escala, em vez de o '
    'poligono ficar colado no anel do baseline sem mostrar nada. Nao ha fonte e nao ha '
    'medicao: dentro dessa intencao o valor e arbitrario, e 0,80 ou 0,88 serviriam a '
    'mesma intencao com outro fator de amplificacao. Os tres numeros da escala sao uma '
    'decisao so e nao devem ser mexidos separadamente.'
  ),
  (
    'hexagon_scale_ratio_max',
    1.15,
    'razao',
    'produto',
    'Razao que cai na borda de fora da grade. Simetrica ao minimo em torno de 1, e a '
    'simetria e deliberada: uma faixa assimetrica daria mais espaco de desenho a uma '
    'das direcoes e seria o grafico opinando sobre qual delas importa. Mesma ausencia '
    'de fonte do minimo. Razao fora da faixa gruda na borda em vez de sair do grafico, '
    'entao alargar a faixa e o que atende quem se move muito.'
  ),
  (
    'hexagon_scale_min_radius',
    0.25,
    'fracao do raio',
    'produto',
    'Fracao do raio ocupada pela borda de dentro. Existe por geometria: com zero, um '
    'vertice no minimo da faixa cai no centro, o poligono colapsa em cima de si mesmo e '
    'dois eixos no minimo desenham a mesma figura que um. '
    'Tem um segundo efeito que eu descobri medindo e nao ao escolhe-lo: ele amortece a '
    'amplificacao, porque com raio de partida maior a mesma variacao absoluta vira '
    'variacao relativa menor. Com a faixa em vigor, este 0,25 segura a elasticidade em '
    '4; em zero ela seria 6,67. Ou seja, o numero que esta aqui por motivo geometrico e '
    'o que hoje mais contem o exagero, e isso e coincidencia e nao projeto.'
  ),
  (
    'hexagon_stable_threshold',
    0.01,
    'razao',
    'produto',
    'Variacao absoluta em torno de 1 abaixo da qual o vertice conta como estavel e nao '
    'recebe carimbo de direcao. Numero de produto sem medicao nenhuma por tras: ninguem '
    'mediu quanto de variacao e ruido de fita, de hidratacao ou de hora do dia, e '
    'medir isso seria afirmacao empirica sobre corpos, que neste repositorio exige '
    'fonte e revisao. Um por cento e o palpite de que abaixo disso nao vale carimbar '
    'direcao. Entrou aqui junto com os tres da escala por ser da mesma classe: numero '
    'de desenho que governa o que a pessoa le.'
  );
