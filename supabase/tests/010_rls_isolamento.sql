-- Isolamento entre usuarios. A pergunta que este arquivo responde e uma so:
-- alguem autenticado consegue alcancar dado de outra pessoa por algum caminho?

begin;
select plan(24);

-- Fixtures criadas como superusuario, que ignora RLS de proposito: o teste precisa
-- de dado de duas pessoas para depois verificar que uma nao enxerga a da outra.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@exemplo.test'),
  ('22222222-2222-2222-2222-222222222222', 'b@exemplo.test');

insert into profiles (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');

insert into checkins (id, user_id, taken_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', now()),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', now());

insert into measurement_values (checkin_id, user_id, key, side, value) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'waist', 'na', 82.5),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
   'waist', 'na', 91.0);

insert into baselines (user_id, checkin_id, reason) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', 'initial');

insert into photos (checkin_id, user_id, angle, storage_path, consent_store_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'front', '11111111-1111-1111-1111-111111111111/aaaaaaaa-0000-0000-0000-000000000001/front.jpg',
   now());

insert into proportion_ratios
  (checkin_id, user_id, axis_key, denominator_kind, baseline_checkin_id,
   status, current_value, reference_value, ratio)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'core_waist', 'baseline', 'aaaaaaaa-0000-0000-0000-000000000001',
   'ok', 82.5, 82.5, 1.0);

insert into consent_documents (id, purpose, version, body_md, effective_from) values
  ('cccccccc-0000-0000-0000-000000000001', 'store_measurements', 1, 'texto', now());

insert into consent_events (user_id, document_id, purpose, action) values
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-0000-0000-0000-000000000001',
   'store_measurements', 'granted');

insert into age_verification_events (user_id, method, outcome) values
  ('11111111-1111-1111-1111-111111111111', 'self_declared', 'passed');

insert into storage.objects (bucket_id, name) values
  ('checkin-photos',
   '11111111-1111-1111-1111-111111111111/aaaaaaaa-0000-0000-0000-000000000001/front.jpg');

-- ---------------------------------------------------------------- usuario B ----
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select is_empty(
  $$select 1 from profiles where id = '11111111-1111-1111-1111-111111111111'$$,
  'B nao le o perfil de A');

select is_empty(
  $$select 1 from checkins where user_id = '11111111-1111-1111-1111-111111111111'$$,
  'B nao le check-in de A');

select is_empty(
  $$select 1 from measurement_values where user_id = '11111111-1111-1111-1111-111111111111'$$,
  'B nao le medida de A');

select is_empty(
  $$select 1 from baselines where user_id = '11111111-1111-1111-1111-111111111111'$$,
  'B nao le baseline de A');

select is_empty(
  $$select 1 from photos where user_id = '11111111-1111-1111-1111-111111111111'$$,
  'B nao le foto de A');

select is_empty(
  $$select 1 from proportion_ratios where user_id = '11111111-1111-1111-1111-111111111111'$$,
  'B nao le razao de proporcao de A');

select is_empty(
  $$select 1 from consent_events where user_id = '11111111-1111-1111-1111-111111111111'$$,
  'B nao le consentimento de A');

select is_empty(
  $$select 1 from age_verification_events where user_id = '11111111-1111-1111-1111-111111111111'$$,
  'B nao le verificacao de idade de A');

select is_empty(
  $$select 1 from storage.objects
     where name like '11111111-1111-1111-1111-111111111111/%'$$,
  'B nao le objeto de Storage na pasta de A');

-- Escrita silenciosa e o modo de falha que mais preocupa: sem policy de update, o
-- UPDATE nao levanta erro, ele simplesmente nao encontra linha. O teste precisa
-- checar o efeito, e nao a ausencia de excecao.
update checkins set notes = 'invadido'
 where user_id = '11111111-1111-1111-1111-111111111111';

select is_empty(
  $$select 1 from checkins where notes = 'invadido'$$,
  'UPDATE de B em linha de A nao altera nada');

delete from measurement_values where user_id = '11111111-1111-1111-1111-111111111111';

reset role;
select is(
  (select count(*)::int from measurement_values
    where user_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'DELETE de B nao removeu a medida de A');

set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

-- B nao consegue plantar linha em nome de A.
select throws_ok(
  $$insert into checkins (user_id, taken_at)
    values ('11111111-1111-1111-1111-111111111111', now())$$,
  '42501',
  null,
  'B nao insere check-in em nome de A');

select throws_ok(
  $$insert into consent_events (user_id, document_id, purpose, action)
    values ('11111111-1111-1111-1111-111111111111',
            'cccccccc-0000-0000-0000-000000000001', 'store_measurements', 'granted')$$,
  '42501',
  null,
  'B nao insere consentimento em nome de A');

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('checkin-photos', '11111111-1111-1111-1111-111111111111/x/front.jpg')$$,
  '42501',
  null,
  'B nao grava objeto na pasta de A');

-- ---------------------------------------------------------------- usuario A ----
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select isnt_empty(
  $$select 1 from checkins where user_id = '11111111-1111-1111-1111-111111111111'$$,
  'A le o proprio check-in');

select isnt_empty(
  $$select 1 from proportion_ratios where user_id = '11111111-1111-1111-1111-111111111111'$$,
  'A le a propria razao de proporcao mesmo sendo dado derivado');

-- Reatribuir a propria linha para outro dono e o caso que so o WITH CHECK pega.
-- Policy de update escrita so com USING autoriza a operacao e nao restringe o
-- resultado, e a linha sairia do alcance de quem a criou.
select throws_ok(
  $$update checkins set user_id = '22222222-2222-2222-2222-222222222222'
     where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'A nao consegue transferir a propria linha para B');

-- Dado derivado nao se escreve pelo cliente.
select throws_ok(
  $$insert into proportion_ratios
      (checkin_id, user_id, axis_key, denominator_kind, baseline_checkin_id, status, ratio)
    values ('aaaaaaaa-0000-0000-0000-000000000001',
            '11111111-1111-1111-1111-111111111111', 'chest', 'baseline',
            'aaaaaaaa-0000-0000-0000-000000000001', 'ok', 9.9)$$,
  '42501',
  null,
  'A nao insere razao de proporcao');

select throws_ok(
  $$update proportion_ratios set ratio = 9.9$$,
  '42501',
  null,
  'A nao altera razao de proporcao');

select throws_ok(
  $$delete from proportion_ratios$$,
  '42501',
  null,
  'A nao apaga razao de proporcao');

-- Livro-razao nao se reescreve.
select throws_ok(
  $$update consent_events set action = 'granted'$$,
  '42501',
  null,
  'consentimento nao aceita UPDATE');

select throws_ok(
  $$delete from consent_events$$,
  '42501',
  null,
  'consentimento nao aceita DELETE');

select throws_ok(
  $$update age_verification_events set outcome = 'passed'$$,
  '42501',
  null,
  'verificacao de idade nao aceita UPDATE');

-- ------------------------------------------------------------------- anonimo --
reset role;
set local role anon;

-- Para o papel anonimo a negativa vem antes da RLS: nao ha grant, entao a tabela
-- nem chega a ser consultada. Sao duas camadas e as duas precisam estar no lugar,
-- porque um grant acidental deixaria a policy como unica defesa.
select throws_ok(
  $$select 1 from checkins$$,
  '42501',
  null,
  'anonimo nao alcanca check-in');

select * from finish();
rollback;
