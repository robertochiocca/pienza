-- Operacao: exclusao de conta e trilha de auditoria.

create table deletion_requests (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null,
  requested_at           timestamptz not null default now(),
  confirmed_at           timestamptz,
  purged_at              timestamptz,
  storage_objects_purged integer,
  -- Quando as copias em backup contendo este usuario expiram. A exclusao imediata
  -- e verificavel em producao; dentro de snapshot nao existe exclusao seletiva, so
  -- expiracao. Guardar a data e o que permite dizer ao titular uma coisa
  -- verdadeira em vez de uma promessa que a infraestrutura nao cumpre.
  backup_expiry_at       timestamptz,
  notes                  text
);

create index deletion_requests_user_idx on deletion_requests (user_id, requested_at desc);

create table audit_log (
  id          bigserial primary key,
  actor_id    uuid,
  actor_role  text not null check (actor_role in ('user', 'professional', 'system')),
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  metadata    jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index audit_log_entity_idx on audit_log (entity, entity_id, occurred_at desc);

-- Nenhum acesso para anon nem para authenticated. Sao tabelas de operacao: quem
-- escreve e quem le e rotina de servidor. RLS fica ligado assim mesmo, para que a
-- ausencia de policy seja negativa explicita e nao dependa so da ausencia de grant.
revoke all on deletion_requests, audit_log from anon, authenticated;
revoke all on sequence audit_log_id_seq from anon, authenticated;

alter table deletion_requests enable row level security;
alter table deletion_requests force row level security;
alter table audit_log enable row level security;
alter table audit_log force row level security;
