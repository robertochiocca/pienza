-- Vocabulario do dominio: medidas, eixos e finalidades de consentimento.
--
-- Sao tabelas de lookup e nao tipos enum. Enum do Postgres precisa de migration
-- para ganhar valor novo, e o vocabulario de medidas cresce por dado: o sistema
-- de proporcao que fica para a Fase 3 exige circunferencia de cabeca e de joelho,
-- e nao quero que uma medida nova seja um evento de schema.

create table measurement_keys (
  key           text primary key,
  label_ptbr    text        not null,
  unit          text        not null check (unit in ('cm', 'kg')),
  bilateral     boolean     not null default false,
  min_value     numeric(6, 2) not null,
  max_value     numeric(6, 2) not null,
  display_order integer     not null,
  constraint measurement_keys_faixa_coerente check (max_value > min_value)
);

comment on column measurement_keys.min_value is
  'Guarda de digitacao, nao limiar de saude. Existe para barrar 1700 cm de cintura '
  'por dedo escorregado no teclado numerico. Nenhum valor aqui tem significado '
  'clinico e nenhum aparece na interface como faixa recomendada.';

create table proportion_axes (
  key             text primary key,
  label_ptbr      text not null,
  measurement_key text not null references measurement_keys (key),
  display_order   integer not null
);

-- Nao existe coluna de direcao nesta tabela, e a ausencia e deliberada. Marcar um
-- eixo como "menor e melhor" e o app tomando posicao sobre o corpo de quem usa.
-- O hexagono mede equilibrio, nao valor: os seis eixos plotam a razao crua contra
-- o baseline e a leitura fica com a pessoa.
comment on table proportion_axes is
  'Eixos do hexagono. Sem coluna de direcao: razao crua, sem juizo de valor.';

create table consent_purposes (
  key                text primary key,
  label_ptbr         text not null,
  requires_per_event boolean not null default false
);

-- Estas tres tabelas sao vocabulario compartilhado, nao dado de usuario: leitura
-- liberada para quem esta autenticado, escrita so por migration e seed.
revoke all on measurement_keys, proportion_axes, consent_purposes from anon, authenticated;
grant select on measurement_keys, proportion_axes, consent_purposes to authenticated;

alter table measurement_keys  enable row level security;
alter table proportion_axes   enable row level security;
alter table consent_purposes  enable row level security;
alter table measurement_keys  force row level security;
alter table proportion_axes   force row level security;
alter table consent_purposes  force row level security;

create policy measurement_keys_leitura on measurement_keys
  for select to authenticated using (true);
create policy proportion_axes_leitura on proportion_axes
  for select to authenticated using (true);
create policy consent_purposes_leitura on consent_purposes
  for select to authenticated using (true);
