-- Travas de escrita. A pergunta: o que um usuario comum consegue reescrever depois
-- que a linha existe, e o app consegue fazer o seu trabalho normal?

begin;
select plan(12);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@exemplo.test');

insert into checkins (id, user_id, taken_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', now()),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', now());

insert into measurement_values (checkin_id, user_id, key, side, value, provenance) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'waist', 'na', 82, 'kept');

insert into baselines (id, user_id, checkin_id, reason) values
  ('cccccccc-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', 'initial');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- Este era o defeito: o gatilho de invalidacao apaga de proportion_ratios, onde
-- authenticated so tem SELECT, e rodava com os privilegios de quem invoca. Corrigir
-- um numero digitado errado era impossivel em producao, e a suite nao pegava porque
-- as assercoes de invalidacao rodavam como superusuario.
select lives_ok(
  $$update measurement_values set value = 81
     where checkin_id = 'aaaaaaaa-0000-0000-0000-000000000001' and key = 'waist'$$,
  'o app consegue corrigir um valor digitado errado');

select lives_ok(
  $$delete from measurement_values
     where checkin_id = 'aaaaaaaa-0000-0000-0000-000000000001' and key = 'waist'$$,
  'o app consegue apagar uma medida');

insert into measurement_values (checkin_id, user_id, key, side, value, provenance) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'waist', 'na', 82, 'kept');

-- Promover mantido para digitado seria medir retroativamente.
select throws_ok(
  $$update measurement_values set provenance = 'typed'
     where checkin_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'proveniencia nao pode ser reescrita depois de gravada');

select throws_ok(
  $$update measurement_values set key = 'chest'
     where checkin_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'a chave da medida nao pode ser trocada');

select throws_ok(
  $$update measurement_values set side = 'l'
     where checkin_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'o lado da medida nao pode ser trocado');

select throws_ok(
  $$update measurement_values set checkin_id = 'aaaaaaaa-0000-0000-0000-000000000002'
     where key = 'waist'$$,
  '42501',
  null,
  'a medida nao pode ser movida para outro check-in');

-- Fechar o baseline vigente e acao legitima. Reapontar para outro check-in trocaria
-- o denominador de toda a serie por UPDATE.
select lives_ok(
  $$update baselines set effective_to = now()
     where id = 'cccccccc-0000-0000-0000-000000000001'$$,
  'a pessoa consegue fechar o baseline vigente');

select throws_ok(
  $$update baselines set checkin_id = 'aaaaaaaa-0000-0000-0000-000000000002'
     where id = 'cccccccc-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'o baseline nao pode ser reapontado para outro check-in');

-- Quem esta sendo verificado nao atesta a propria verificacao.
select lives_ok(
  $$insert into age_verification_events (user_id, method, outcome)
    values ('11111111-1111-1111-1111-111111111111', 'self_declared', 'passed')$$,
  'o cliente pode registrar autodeclaracao');

select throws_ok(
  $$insert into age_verification_events (user_id, method, outcome)
    values ('11111111-1111-1111-1111-111111111111', 'document', 'passed')$$,
  '42501',
  null,
  'o cliente nao pode alegar conferencia de documento');

reset role;
-- papel: superusuario porque a leitura e de pg_proc, catalogo que `authenticated`
-- nao alcanca. Funcao privilegiada com search_path mutavel deixa quem controla o
-- caminho de busca sequestrar a resolucao de nome dentro dela.
select is_empty(
  $$select p.proname
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prosecdef
       and not exists (
         select 1 from unnest(coalesce(p.proconfig, array[]::text[])) c
          where c like 'search\_path=%'
       )$$,
  'toda funcao SECURITY DEFINER em public fixa search_path');

select is_empty(
  $$select p.proname
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prosecdef
       and 'search_path=""' <> all(coalesce(p.proconfig, array[]::text[]))$$,
  'e o search_path fixado e vazio, com referencia qualificada');

select * from finish();
rollback;
