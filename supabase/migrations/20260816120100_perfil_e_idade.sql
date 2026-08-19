-- Perfil e verificacao de idade.

create function public.set_updated_at() returns trigger
  language plpgsql
  -- search_path fixo e vazio: sem isso, quem conseguir criar um schema que sombreie
  -- um nome usado aqui muda o que a funcao executa. Toda referencia e qualificada.
  set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  birth_date     date,
  biological_sex text check (biological_sex in ('male', 'female', 'intersex', 'undisclosed')),
  unit_system    text not null default 'metric' check (unit_system in ('metric', 'imperial')),
  locale         text not null default 'pt-BR',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- A chave primaria e o proprio id de auth.users. Uma coluna user_id separada seria
-- uma segunda fonte de verdade para a mesma identidade, e toda policy passaria a
-- depender de as duas concordarem.
create trigger profiles_updated_at
  before update on profiles
  for each row execute function public.set_updated_at();

comment on column profiles.biological_sex is
  'Opcional, e nao entra em nenhum calculo. Existe apenas para decidir '
  'aplicabilidade de modelo de referencia externo, que e Fase 3.';

-- A idade nao vira coluna carimbada no perfil porque uma coluna so comporta um
-- metodo de verificacao, e o metodo ainda nao esta decidido. Autodeclaracao deixou
-- de ser suficiente, e o que vier no lugar — documento, provedor externo — precisa
-- caber sem migration. Por isso `method` e texto livre e nao enum.
create table age_verification_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  method       text not null,
  outcome      text not null check (outcome in ('passed', 'failed', 'inconclusive')),
  evidence_ref text,
  verified_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index age_verification_events_user_idx
  on age_verification_events (user_id, verified_at desc);

comment on column age_verification_events.evidence_ref is
  'Ponteiro opaco para comprovante mantido por quem verificou. O documento em si '
  'nunca entra no banco.';

revoke all on profiles, age_verification_events from anon, authenticated;
grant select, insert, update on profiles to authenticated;
grant select, insert on age_verification_events to authenticated;

alter table profiles enable row level security;
alter table profiles force row level security;
alter table age_verification_events enable row level security;
alter table age_verification_events force row level security;

-- `(select auth.uid())` e nao `auth.uid()`: com o subselect o planejador avalia a
-- funcao uma vez por consulta (InitPlan) em vez de uma vez por linha varrida.
create policy profiles_leitura_propria on profiles
  for select to authenticated using (id = (select auth.uid()));

create policy profiles_insercao_propria on profiles
  for insert to authenticated with check (id = (select auth.uid()));

create policy profiles_atualizacao_propria on profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy age_verification_leitura_propria on age_verification_events
  for select to authenticated using (user_id = (select auth.uid()));

create policy age_verification_insercao_propria on age_verification_events
  for insert to authenticated with check (user_id = (select auth.uid()));

-- Sem policy de update e de delete, e a ausencia e a regra: um evento de
-- verificacao que o proprio verificado pode reescrever nao verifica nada.
