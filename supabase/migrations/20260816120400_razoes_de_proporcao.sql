-- Razoes de proporcao: cache derivado, recomputavel, nunca fonte de verdade.
--
-- `ratio` guarda `current_value / reference_value` cru, sem ajuste de direcao. Isso
-- e o que mantem a decisao de apresentacao reversivel: inverter, nao inverter ou
-- comunicar direcao por rotulo sao escolhas de tela, e nenhuma delas obriga a
-- recomputar historico. No dia em que o modelo de referencia externo existir,
-- `denominator_kind` e o que permite interpretar as linhas escritas antes dele.

create table proportion_ratios (
  id                  uuid primary key default gen_random_uuid(),
  checkin_id          uuid not null,
  user_id             uuid not null,
  axis_key            text not null references proportion_axes (key),
  denominator_kind    text not null check (denominator_kind in ('baseline', 'reference')),
  baseline_checkin_id uuid,
  status              text not null check (status in ('ok', 'missing_input', 'no_baseline')),
  current_value       numeric(6, 2),
  reference_value     numeric(6, 2),
  ratio               numeric(6, 4),
  -- Medidas exatas usadas neste calculo. Sem elas, uma linha recalculada meses
  -- depois nao pode ser conferida contra a que ela substituiu.
  inputs              jsonb not null default '{}'::jsonb,
  computed_at         timestamptz not null default now(),

  unique (checkin_id, axis_key, denominator_kind),
  foreign key (checkin_id, user_id) references checkins (id, user_id) on delete cascade,
  foreign key (baseline_checkin_id, user_id) references checkins (id, user_id) on delete cascade,

  -- Eixo disponivel e eixo com razao sao a mesma coisa. Sem esta restricao existem
  -- dois jeitos de representar "sem resultado" — status marcado e razao nula — e a
  -- tela acaba tratando um deles como zero.
  constraint proportion_ratios_status_coerente
    check ((status = 'ok') = (ratio is not null)),

  constraint proportion_ratios_denominador_coerente
    check (
      (denominator_kind = 'baseline' and baseline_checkin_id is not null)
      or (denominator_kind = 'reference' and baseline_checkin_id is null)
    )
);

create index proportion_ratios_user_idx on proportion_ratios (user_id, computed_at desc);
create index proportion_ratios_checkin_idx on proportion_ratios (checkin_id);
create index proportion_ratios_baseline_idx on proportion_ratios (baseline_checkin_id)
  where baseline_checkin_id is not null;

comment on column proportion_ratios.status is
  'missing_input: falta medida para o eixo. no_baseline: ainda nao ha baseline. '
  'Em nenhum dos dois casos o eixo vale zero — ele fica indisponivel, com motivo, '
  'e a tela mostra o motivo.';

-- Invalida o derivado quando a medida muda, inclusive nos check-ins que usaram este
-- como baseline. Sem a segunda metade, editar uma medida do baseline deixaria toda
-- a serie posterior calculada contra um denominador que nao existe mais.
create function public.invalidate_proportion_ratios() returns trigger
  language plpgsql
  set search_path = ''
as $$
declare
  affected uuid := coalesce(new.checkin_id, old.checkin_id);
begin
  delete from public.proportion_ratios
   where checkin_id = affected
      or baseline_checkin_id = affected;
  return null;
end;
$$;

create trigger measurement_values_invalidate_ratios
  after insert or update or delete on measurement_values
  for each row execute function public.invalidate_proportion_ratios();

create function public.invalidate_ratios_on_baseline_change() returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  delete from public.proportion_ratios
   where user_id = new.user_id
     and denominator_kind = 'baseline';
  return null;
end;
$$;

create trigger baselines_invalidate_ratios
  after insert on baselines
  for each row execute function public.invalidate_ratios_on_baseline_change();

revoke all on proportion_ratios from anon, authenticated;
grant select on proportion_ratios to authenticated;

alter table proportion_ratios enable row level security;
alter table proportion_ratios force row level security;

create policy proportion_ratios_leitura_propria on proportion_ratios
  for select to authenticated using (user_id = (select auth.uid()));

-- So leitura, e so para o dono. Dado derivado que o cliente pode escrever deixa de
-- ser derivado: bastaria um cliente adulterado para o historico deixar de bater com
-- as medidas que o geraram. A escrita fica com a rotina de recomputo.
--
-- A leitura permanece aberta ao titular mesmo quando a interface decide nao exibir
-- o hexagono. Bloquear no SELECT trancaria a pessoa fora do proprio dado e
-- quebraria o direito de acesso e a exportacao. O que a interface esconde e
-- apresentacao; o que o titular pode obter e outra coisa.
