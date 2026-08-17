-- Ajustes de produto: numeros que governam comportamento e nao sao clinicos.
--
-- Eles vivem em tabela, e nao em constante, por dois motivos. Um: sao decisoes de
-- produto e vao ser revistas quando houver gente medindo, e revisar constante e
-- deploy enquanto revisar linha e edicao. Dois: cada um carrega o motivo e a
-- natureza escritos ao lado, e uma constante no codigo perde isso na primeira vez
-- que alguem copia o valor para outro lugar.

create table product_settings (
  key       text primary key,
  value     numeric(10, 2) not null,
  unit      text not null,
  -- 'produto' ou 'clinico'. Nenhum valor clinico entra sem fonte e sem revisao de
  -- profissional habilitado; hoje nao existe nenhum, e a coluna existe para que a
  -- diferenca seja explicita no dia em que existir.
  nature    text not null check (nature in ('produto', 'clinico')),
  source    text,
  rationale text not null,
  updated_at timestamptz not null default now(),
  constraint product_settings_clinico_exige_fonte
    check (nature <> 'clinico' or (source is not null and length(btrim(source)) > 0))
);

revoke all on product_settings from anon, authenticated;
grant select on product_settings to authenticated;

alter table product_settings enable row level security;
alter table product_settings force row level security;

create policy product_settings_leitura on product_settings
  for select to authenticated using (true);

insert into product_settings (key, value, unit, nature, rationale) values
  (
    'comparison_min_days',
    28,
    'dias',
    'produto',
    'Janela padrao de comparacao do hexagono: o alvo e o check-in mais recente que '
    'seja pelo menos este numero de dias mais antigo que o atual. Vinte e oito e o '
    'intervalo mais curto em que mudanca de circunferencia tende a superar variacao '
    'de hidratacao, alimentacao e hora do dia somada ao erro de fita. E numero de '
    'produto, nao clinico, e existe para o padrao nao apresentar ruido como sinal. '
    'A pessoa pode escolher outra janela.'
  ),
  (
    'structural_remeasure_days',
    180,
    'dias',
    'produto',
    'Ha quantos dias uma medida estrutural volta a ser proposta na sessao guiada. '
    'Punho, tornozelo, joelho, cabeca, altura e envergadura ancoram proporcao por '
    'nao mudarem, e remedi-las toda semana e atrito com ganho de informacao zero. '
    'Numero de produto, sem base clinica, a revisar quando houver gente medindo.'
  );
