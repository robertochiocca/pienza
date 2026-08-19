-- Reescreve o motivo de comparison_min_days e de structural_remeasure_days.
--
-- Os dois textos anteriores afirmavam fato sobre corpos com a etiqueta de numero de
-- produto, e as duas coisas nao cabem juntas neste repositorio. "O intervalo mais
-- curto em que mudanca de circunferencia tende a superar a variacao de hidratacao,
-- alimentacao e hora do dia" e uma afirmacao empirica: ou tem fonte, e entao o valor
-- e clinico e cai na regra de revisao por profissional habilitado, ou nao tem, e
-- entao nao pode estar escrita como constatacao. Nao tem.
--
-- Nenhum dos dois numeros muda. O que muda e o que a proxima pessoa le antes de
-- decidir se pode mexer neles — hoje ela leria uma justificativa fisiologica e
-- concluiria, corretamente, que nao tem autoridade para mexer. A justificativa
-- verdadeira e mais fraca e devolve a decisao para quem vier.

update product_settings
set rationale =
  'Janela padrao de comparacao do hexagono: o alvo e o check-in mais recente que '
  'seja pelo menos este numero de dias mais antigo que o atual. '
  'Vinte e oito foi escolhido para ser longo o bastante que variacao de curto prazo '
  '— hidratacao, alimentacao, hora do dia, erro de fita — nao domine a leitura. '
  'Nao ha fonte para o numero, e dentro dessa intencao ele e arbitrario: trinta ou '
  'vinte e um serviriam a mesma intencao. Nao houve medicao que o justifique e nao '
  'ha afirmacao aqui sobre em quanto tempo um corpo muda. '
  'Por isso e produto e nao clinico, e por isso pode ser revisto sem revisao de '
  'profissional — o que ele governa e o padrao de apresentacao, e a pessoa pode '
  'escolher outra janela.',
  updated_at = now()
where key = 'comparison_min_days';

update product_settings
set rationale =
  'Ha quantos dias uma medida estrutural volta a ser proposta na sessao guiada. '
  'Estrutural aqui e uma classificacao deste app, em measurement_keys.kind, e nao '
  'um fato sobre o corpo: punho, tornozelo, joelho, cabeca, altura e envergadura '
  'sao tratados como ancora de proporcao porque mudam pouco na janela de uso '
  'esperada. Elas mudam — em adolescencia, em variacao grande de peso, depois de '
  'lesao — e este numero nao afirma o contrario. '
  'Cento e oitenta foi escolhido pelo custo do lado errado do erro: propor de menos '
  'deixa a ancora velha, e a pessoa pode remedir quando quiser; propor demais '
  'alonga toda sessao com passo que quase nunca muda de valor, e sessao longa e '
  'sessao que ninguem faz. Nao ha fonte, e o numero e arbitrario dentro dessa '
  'intencao.',
  updated_at = now()
where key = 'structural_remeasure_days';
