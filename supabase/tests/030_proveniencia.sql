-- Proveniencia de medida e baseline parcial.
-- Ver docs/decisoes/0007-proveniencia-de-medida.md.
--
-- A pergunta: e possivel gravar um valor sem dizer como ele entrou, e e possivel um
-- eixo usar como denominador um numero que ninguem aferiu?

begin;
select plan(11);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@exemplo.test');

insert into checkins (id, user_id, taken_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', now()),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', now());

-- ------------------------------------------------------------- classificacao ---
select is(
  (select array_agg(key order by key)::text
     from measurement_keys where kind = 'structural'),
  '{ankle,head,height,knee,wingspan,wrist}',
  'estruturais sao as medidas que ancoram proporcao por nao mudarem');

select is(
  (select count(*)::int from measurement_keys where kind = 'variable'),
  11,
  'as demais sao variaveis');

-- Chave nova tem que declarar a classificacao: sem default, esquecer reprova em vez
-- de herdar um palpite.
select throws_ok(
  $$insert into measurement_keys
      (key, label_ptbr, unit, bilateral, min_value, max_value, display_order)
    values ('biceps_femoral', 'Teste', 'cm', false, 10, 100, 99)$$,
  '23502',
  null,
  'chave de medida nova exige classificacao explicita');

-- --------------------------------------------------------------- proveniencia --
select throws_ok(
  $$insert into measurement_values (checkin_id, user_id, key, side, value)
    values ('aaaaaaaa-0000-0000-0000-000000000001',
            '11111111-1111-1111-1111-111111111111', 'waist', 'na', 82)$$,
  '23502',
  null,
  'gravar medida sem dizer como ela entrou e rejeitado');

select throws_ok(
  $$insert into measurement_values (checkin_id, user_id, key, side, value, provenance)
    values ('aaaaaaaa-0000-0000-0000-000000000001',
            '11111111-1111-1111-1111-111111111111', 'waist', 'na', 82, 'inferido')$$,
  '23514',
  null,
  'proveniencia so aceita typed ou kept');

-- ---------------------------------------------------------- baseline parcial ---
-- A protecao nao esta mais em recusar o baseline. Se redefinir baseline for caro, a
-- pessoa nao redefine, e comparar contra baseline velho e pior que o atrito que a
-- recusa evitava. O baseline abre com o que houver.
insert into measurement_values (checkin_id, user_id, key, side, value, provenance) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'waist', 'na', 82, 'kept'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'chest', 'na', 100, 'typed');

select lives_ok(
  $$insert into baselines (user_id, checkin_id, reason)
    values ('11111111-1111-1111-1111-111111111111',
            'aaaaaaaa-0000-0000-0000-000000000001', 'initial')$$,
  'baseline abre mesmo com medida variavel mantida');

-- A protecao passou para ca: o eixo nao pode usar como denominador um numero que
-- ninguem digitou. Ele fica indisponivel e passa a valer quando for medido.
select throws_ok(
  $$insert into proportion_ratios
      (checkin_id, user_id, axis_key, denominator_kind, baseline_checkin_id,
       status, current_value, reference_value, ratio,
       current_provenance, reference_provenance)
    values ('aaaaaaaa-0000-0000-0000-000000000002',
            '11111111-1111-1111-1111-111111111111', 'core_waist', 'baseline',
            'aaaaaaaa-0000-0000-0000-000000000001', 'ok', 80, 82, 0.9756,
            'typed', 'kept')$$,
  '23514',
  null,
  'eixo valido nao pode ter denominador mantido');

select lives_ok(
  $$insert into proportion_ratios
      (checkin_id, user_id, axis_key, denominator_kind, baseline_checkin_id,
       status, current_value, reference_value, ratio,
       current_provenance, reference_provenance)
    values ('aaaaaaaa-0000-0000-0000-000000000002',
            '11111111-1111-1111-1111-111111111111', 'chest', 'baseline',
            'aaaaaaaa-0000-0000-0000-000000000001', 'ok', 101, 100, 1.01,
            'kept', 'typed')$$,
  'numerador mantido e aceito: significa que a pessoa nao remediu, e a razao segue verdadeira');

-- O eixo que espera medicao tem status proprio, com motivo, e nao vale zero.
select lives_ok(
  $$insert into proportion_ratios
      (checkin_id, user_id, axis_key, denominator_kind, baseline_checkin_id, status)
    values ('aaaaaaaa-0000-0000-0000-000000000002',
            '11111111-1111-1111-1111-111111111111', 'core_waist', 'baseline',
            'aaaaaaaa-0000-0000-0000-000000000001', 'baseline_not_typed')$$,
  'eixo com baseline nao digitado fica indisponivel, com motivo');

select throws_ok(
  $$insert into proportion_ratios
      (checkin_id, user_id, axis_key, denominator_kind, baseline_checkin_id, status)
    values ('aaaaaaaa-0000-0000-0000-000000000002',
            '11111111-1111-1111-1111-111111111111', 'arms', 'baseline',
            'aaaaaaaa-0000-0000-0000-000000000001', 'sei_la')$$,
  '23514',
  null,
  'status fora do vocabulario e rejeitado');

-- ------------------------------------------------------- contexto de medicao ---
select lives_ok(
  $$insert into checkins (user_id, taken_at, training_state, taken_at_utc_offset_minutes)
    values ('11111111-1111-1111-1111-111111111111', now(), 'before_training', -180)$$,
  'contexto de medicao e opcional e nao bloqueia o check-in');

select * from finish();
rollback;
