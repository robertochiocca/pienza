-- Camada profissional.
--
-- A funcionalidade e Fase 4 e nada aqui tem escritor ainda. As tabelas existem
-- antes porque a restricao abaixo e uma trava, nao um habilitador: o valor dela e
-- justamente existir antes da funcionalidade, para que a funcionalidade nao possa
-- nascer entregando plano sem revisao.

create table professionals (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid unique references auth.users (id) on delete set null,
  full_name           text not null,
  council             text not null check (council in ('CREF', 'CRN')),
  registration_number text not null,
  uf                  char(2) not null,
  verified_at         timestamptz,
  active              boolean not null default false,
  created_at          timestamptz not null default now(),
  unique (council, registration_number, uf)
);

create table plans (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  kind             text not null check (kind in ('training', 'nutrition')),
  status           text not null default 'draft_ai'
                   check (status in ('draft_ai', 'pending_review', 'changes_requested',
                                     'approved', 'delivered', 'revoked', 'expired')),
  draft_content    jsonb not null,
  reviewed_content jsonb,
  periodization    jsonb,
  professional_id  uuid references professionals (id),
  reviewed_at      timestamptz,
  signature_ref    text,
  consent_event_id uuid references consent_events (id),
  delivered_at     timestamptz,
  expires_at       timestamptz,
  created_at       timestamptz not null default now(),

  -- Prescricao de dieta e de exercicio sao privativas de profissional registrado.
  -- Deixar essa fronteira como convencao de codigo significa que um bug de fluxo
  -- entrega plano nao assinado; como restricao de banco, o INSERT falha. Nenhum
  -- caminho de aplicacao consegue marcar como entregue sem profissional, data de
  -- revisao, assinatura, periodizacao e termo de consentimento.
  constraint plans_entrega_exige_revisao_assinada check (
    status <> 'delivered'
    or (
      professional_id  is not null
      and reviewed_at      is not null
      and signature_ref    is not null
      and periodization    is not null
      and consent_event_id is not null
    )
  )
);

create index plans_user_idx on plans (user_id, created_at desc);
create index plans_revisor_idx on plans (professional_id) where professional_id is not null;

revoke all on professionals, plans from anon, authenticated;
grant select on professionals to authenticated;
grant select on plans to authenticated;

alter table professionals enable row level security;
alter table professionals force row level security;
alter table plans enable row level security;
alter table plans force row level security;

-- Quem esta autenticado le apenas os profissionais ativos, que sao os que podem
-- aparecer assinando um plano. Cadastro e verificacao nao passam pelo cliente.
create policy professionals_leitura_ativos on professionals
  for select to authenticated using (active);

-- Rascunho de IA fica invisivel ao usuario por RLS, e nao por condicional de tela.
-- A diferenca importa: com a policy, um cliente adulterado tambem nao ve.
create policy plans_leitura_entregues on plans
  for select to authenticated
  using (user_id = (select auth.uid()) and status = 'delivered');

create policy plans_leitura_revisor on plans
  for select to authenticated
  using (
    exists (
      select 1 from professionals p
       where p.user_id = (select auth.uid())
         and p.id = plans.professional_id
         and p.active
    )
  );

-- Nenhuma escrita para authenticated: transicao de status e ato profissional e so
-- acontece por rotina de servidor.
