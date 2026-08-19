-- Fotos de check-in.

create table photos (
  id         uuid primary key default gen_random_uuid(),
  checkin_id uuid not null,
  user_id    uuid not null,
  angle      text not null check (angle in ('front', 'side', 'back')),
  bucket     text not null default 'checkin-photos',
  storage_path text not null unique,
  content_hash text,
  byte_size  integer check (byte_size is null or byte_size > 0),
  captured_at timestamptz,

  -- Tres carimbos separados porque sao tres decisoes separadas, e o consentimento
  -- de uma nao vale para as outras. Guardar a foto no operador contratado nao
  -- autoriza manda-la para analise de terceiro, e nenhum dos dois autoriza publicar.
  consent_store_at               timestamptz not null,
  consent_external_processing_at timestamptz,
  consent_share_at               timestamptz,

  deleted_at timestamptz,
  created_at timestamptz not null default now(),

  foreign key (checkin_id, user_id) references checkins (id, user_id) on delete cascade,

  -- Amarra a linha ao caminho no Storage. A policy de storage.objects autoriza pela
  -- primeira pasta do caminho; sem esta restricao, as duas camadas podem discordar
  -- em silencio e uma linha apontar para um objeto que ela nao deveria alcancar.
  constraint photos_caminho_do_dono
    check (storage_path like (user_id::text || '/%'))
);

create index photos_checkin_idx on photos (checkin_id);
create index photos_user_idx on photos (user_id, created_at desc)
  where deleted_at is null;

comment on column photos.consent_external_processing_at is
  'Nulo enquanto a foto nunca saiu do perimetro. Nao existe funcionalidade que '
  'preencha esta coluna hoje, e ela so passa a ser preenchida por consentimento '
  'dado no proprio evento de envio.';

revoke all on photos from anon, authenticated;
grant select, insert, update, delete on photos to authenticated;

alter table photos enable row level security;
alter table photos force row level security;

create policy photos_leitura_propria on photos
  for select to authenticated using (user_id = (select auth.uid()));
create policy photos_insercao_propria on photos
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy photos_atualizacao_propria on photos
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy photos_exclusao_propria on photos
  for delete to authenticated using (user_id = (select auth.uid()));

-- Bucket privado. `public = false` e o que faz o objeto exigir URL assinada em vez
-- de ficar acessivel por caminho adivinhavel.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'checkin-photos',
  'checkin-photos',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

-- Caminho canonico: {user_id}/{checkin_id}/{angulo}-{uuid}.jpg
-- `storage.foldername(name)[1]` e a primeira pasta, que e o dono.
create policy photos_storage_leitura_propria on storage.objects
  for select to authenticated
  using (
    bucket_id = 'checkin-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy photos_storage_insercao_propria on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'checkin-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy photos_storage_exclusao_propria on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'checkin-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Sem policy de update: foto e imutavel. Corrigir enquadramento e enviar outra
-- foto, o que preserva o que foi de fato registrado em cada data.
