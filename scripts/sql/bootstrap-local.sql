-- APENAS PARA TESTE LOCAL E CI. Nao e migration e nunca roda em ambiente real.
--
-- No Supabase, o schema `auth`, a funcao `auth.uid()`, os papeis `anon` /
-- `authenticated` / `service_role` e o schema `storage` ja existem antes da
-- primeira migration. Num Postgres cru eles nao existem, e sem eles as migrations
-- nao aplicam e as policies nao tem contra o que ser testadas.
--
-- O objetivo aqui e reproduzir a superficie de que as migrations dependem, e nada
-- alem disso. Se este arquivo comecar a definir comportamento que as migrations
-- assumem mas o Supabase nao fornece, os testes passam a verificar uma fantasia.

create extension if not exists pgcrypto;
create extension if not exists pgtap;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

grant usage on schema public to anon, authenticated, service_role;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id         uuid primary key,
  email      text,
  created_at timestamptz not null default now()
);

-- Mesma leitura de claim que o Supabase usa: o `sub` do JWT, exposto pelo PostgREST
-- em `request.jwt.claims`. O `true` no current_setting evita erro quando a
-- configuracao nao esta definida — que e o caso de uma conexao anonima.
create or replace function auth.uid() returns uuid
  language sql stable
as $$
  select nullif(
    coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ),
    ''
  )::uuid
$$;

create schema if not exists storage;
grant usage on schema storage to anon, authenticated, service_role;

create table if not exists storage.buckets (
  id                 text primary key,
  name               text not null,
  public             boolean not null default false,
  file_size_limit    bigint,
  allowed_mime_types text[],
  created_at         timestamptz not null default now()
);

create table if not exists storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text references storage.buckets (id),
  name       text not null,
  owner      uuid,
  created_at timestamptz not null default now()
);

alter table storage.objects enable row level security;
alter table storage.objects force row level security;
revoke all on storage.objects from anon, authenticated;
grant select, insert, delete on storage.objects to authenticated;

-- Devolve as pastas do caminho, sem o nome do arquivo, como no Supabase.
create or replace function storage.foldername(name text) returns text[]
  language plpgsql immutable
as $$
declare
  parts text[];
begin
  parts := string_to_array(name, '/');
  return parts[1:array_length(parts, 1) - 1];
end;
$$;
