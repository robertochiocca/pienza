-- Check-in, medidas e baseline.
--
-- O check-in e a raiz: ele e o evento, e medidas e fotos sao carga dele. O esboco
-- anterior tinha data de aferição em duas tabelas ao mesmo tempo, o que dava duas
-- respostas possiveis para "quando isso foi medido" e uma chave estrangeira livre
-- para discordar das duas.

create table checkins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  taken_at   timestamptz not null,
  notes      text,
  created_at timestamptz not null default now(),
  -- Redundante como restricao de unicidade, ja que id e chave primaria. Existe para
  -- ser alvo das chaves estrangeiras compostas das tabelas filhas: com ela, uma
  -- linha filha nao consegue apontar para um check-in de outro dono, e isso passa a
  -- ser garantia do banco em vez de trigger ou de disciplina de aplicacao.
  unique (id, user_id)
);

create index checkins_user_taken_idx on checkins (user_id, taken_at desc);

-- Medidas em formato longo. Uma coluna por medida obrigaria migration a cada medida
-- nova, e medida ausente ficaria indistinguivel de zero. Aqui medida ausente e
-- linha ausente, que e exatamente a semantica de "eixo indisponivel".
create table measurement_values (
  checkin_id uuid not null,
  user_id    uuid not null,
  key        text not null references measurement_keys (key),
  side       text not null default 'na' check (side in ('l', 'r', 'na')),
  value      numeric(6, 2) not null,
  primary key (checkin_id, key, side),
  foreign key (checkin_id, user_id) references checkins (id, user_id) on delete cascade
);

create function public.validate_measurement_value() returns trigger
  language plpgsql
  set search_path = ''
as $$
declare
  spec public.measurement_keys%rowtype;
begin
  select * into spec from public.measurement_keys where key = new.key;

  if new.value < spec.min_value or new.value > spec.max_value then
    raise exception
      'valor % fora da faixa de integridade de % (% a %)',
      new.value, new.key, spec.min_value, spec.max_value
      using errcode = 'check_violation';
  end if;

  -- Lado so faz sentido em medida de membro par. Sem esta checagem, o mesmo braco
  -- poderia ser gravado como 'na' num check-in e como 'l' no seguinte, e a serie
  -- historica passaria a comparar coisas diferentes sem nada indicar isso.
  if spec.bilateral and new.side = 'na' then
    raise exception 'medida % e bilateral: informe o lado', new.key
      using errcode = 'check_violation';
  end if;

  if not spec.bilateral and new.side <> 'na' then
    raise exception 'medida % nao e bilateral: lado nao se aplica', new.key
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger measurement_values_validate
  before insert or update on measurement_values
  for each row execute function public.validate_measurement_value();

-- Baseline com historia. Redefinir fecha a linha vigente e abre outra, em vez de
-- sobrescrever, por dois motivos: uma razao calculada em marco continua auditavel
-- depois de um reset em abril, e a frequencia de redefinicao e um sinal que a
-- interface pode usar em leitura. Esse sinal e efemero por decisao — ele nao vira
-- coluna, flag nem registro derivado, porque persistir inferencia sobre saude
-- mental cria dado sensivel sem consentimento e sem base clinica.
create table baselines (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null,
  checkin_id     uuid not null,
  reason         text not null check (reason in ('initial', 'user_reset')),
  effective_from timestamptz not null default now(),
  effective_to   timestamptz,
  created_at     timestamptz not null default now(),
  foreign key (checkin_id, user_id) references checkins (id, user_id) on delete cascade,
  -- `>=` e nao `>`. Com `>`, fechar um baseline na mesma transacao em que ele foi
  -- aberto falha, porque `now()` e o instante da transacao e nao do comando: as
  -- duas pontas do intervalo recebem exatamente o mesmo valor. Isso apareceu no
  -- teste de redefinicao de baseline, e apareceria em producao na primeira vez que
  -- abrir e redefinir acontecessem no mesmo commit. Intervalo de duracao zero e
  -- estranho de ler e nao corrompe nada; o que garante um unico baseline aberto e
  -- o indice parcial, nao esta restricao.
  constraint baselines_intervalo_coerente
    check (effective_to is null or effective_to >= effective_from)
);

-- Indice parcial no lugar de trigger: um unico baseline aberto por usuario vira
-- propriedade do indice, e uma corrida entre duas redefinicoes simultaneas falha
-- no banco em vez de deixar dois baselines abertos.
create unique index baselines_um_ativo_por_usuario
  on baselines (user_id) where effective_to is null;

create index baselines_user_idx on baselines (user_id, effective_from desc);

revoke all on checkins, measurement_values, baselines from anon, authenticated;
grant select, insert, update, delete on checkins to authenticated;
grant select, insert, update, delete on measurement_values to authenticated;
grant select, insert, update, delete on baselines to authenticated;

alter table checkins enable row level security;
alter table checkins force row level security;
alter table measurement_values enable row level security;
alter table measurement_values force row level security;
alter table baselines enable row level security;
alter table baselines force row level security;

create policy checkins_leitura_propria on checkins
  for select to authenticated using (user_id = (select auth.uid()));
create policy checkins_insercao_propria on checkins
  for insert to authenticated with check (user_id = (select auth.uid()));
-- O `with check` no update e o que impede reatribuir a propria linha para outro
-- dono. Policy de update escrita so com `using` autoriza a operacao e nao restringe
-- a linha resultante.
create policy checkins_atualizacao_propria on checkins
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy checkins_exclusao_propria on checkins
  for delete to authenticated using (user_id = (select auth.uid()));

create policy measurement_values_leitura_propria on measurement_values
  for select to authenticated using (user_id = (select auth.uid()));
create policy measurement_values_insercao_propria on measurement_values
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy measurement_values_atualizacao_propria on measurement_values
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy measurement_values_exclusao_propria on measurement_values
  for delete to authenticated using (user_id = (select auth.uid()));

create policy baselines_leitura_propria on baselines
  for select to authenticated using (user_id = (select auth.uid()));
create policy baselines_insercao_propria on baselines
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy baselines_atualizacao_propria on baselines
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy baselines_exclusao_propria on baselines
  for delete to authenticated using (user_id = (select auth.uid()));
