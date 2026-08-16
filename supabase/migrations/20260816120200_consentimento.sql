-- Consentimento como livro-razao, nao como conjunto de flags.
--
-- Um jsonb de flags no perfil responde "esta consentido?" e nao responde "desde
-- quando" nem "qual texto a pessoa aceitou". Como o onus da prova do consentimento
-- e de quem controla o dado, a resposta que importa e a segunda. Revogar aqui e
-- inserir linha, nunca apagar: o granted revogado continua sendo a prova de que
-- houve consentimento no periodo em que o dado foi tratado.

create table consent_documents (
  id             uuid primary key default gen_random_uuid(),
  purpose        text not null references consent_purposes (key),
  version        integer not null,
  locale         text not null default 'pt-BR',
  body_md        text not null,
  effective_from timestamptz not null,
  created_at     timestamptz not null default now(),
  unique (purpose, version, locale)
);

create table consent_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  document_id uuid not null references consent_documents (id),
  purpose     text not null references consent_purposes (key),
  action      text not null check (action in ('granted', 'revoked')),
  -- Identificador do objeto ao qual este consentimento se refere, quando a
  -- finalidade e por evento e nao por conta. O caso concreto e a foto: cada upload
  -- carrega o seu, e um consentimento de conta nao serve como consentimento de foto.
  subject_ref text,
  occurred_at timestamptz not null default now(),
  user_agent  text
);

create index consent_events_user_idx on consent_events (user_id, occurred_at desc);
create index consent_events_subject_idx on consent_events (subject_ref)
  where subject_ref is not null;

revoke all on consent_documents, consent_events from anon, authenticated;
grant select on consent_documents to authenticated;
grant select, insert on consent_events to authenticated;

alter table consent_documents enable row level security;
alter table consent_documents force row level security;
alter table consent_events enable row level security;
alter table consent_events force row level security;

create policy consent_documents_leitura on consent_documents
  for select to authenticated using (true);

create policy consent_events_leitura_propria on consent_events
  for select to authenticated using (user_id = (select auth.uid()));

create policy consent_events_insercao_propria on consent_events
  for insert to authenticated with check (user_id = (select auth.uid()));

-- Sem update e sem delete, de proposito: um registro de consentimento editavel
-- por quem consentiu deixa de ser registro.
