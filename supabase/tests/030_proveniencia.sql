-- Proveniencia de medida. Ver docs/decisoes/0007-proveniencia-de-medida.md.
--
-- A pergunta deste arquivo: e possivel gravar um valor sem dizer como ele entrou, e
-- e possivel abrir baseline sobre valor que ninguem mediu?

begin;
select plan(11);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@exemplo.test');

insert into checkins (id, user_id, taken_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', now()),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', now()),
  ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', now());

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

-- ------------------------------------------------------------------- baseline --
-- Um baseline contaminado desloca os seis eixos para sempre. E o unico ponto onde a
-- contaminacao e irreversivel, entao a regra e trava de banco.
insert into measurement_values (checkin_id, user_id, key, side, value, provenance) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'waist', 'na', 82, 'kept');

select throws_ok(
  $$insert into baselines (user_id, checkin_id, reason)
    values ('11111111-1111-1111-1111-111111111111',
            'aaaaaaaa-0000-0000-0000-000000000001', 'initial')$$,
  '23514',
  null,
  'baseline sobre medida variavel mantida e rejeitado');

-- A mensagem nomeia o que falta: erro que nao diz o que fazer vira suporte.
select throws_like(
  $$insert into baselines (user_id, checkin_id, reason)
    values ('11111111-1111-1111-1111-111111111111',
            'aaaaaaaa-0000-0000-0000-000000000001', 'initial')$$,
  '%waist%',
  'o erro nomeia a medida que precisa ser digitada');

-- Medida estrutural mantida nao impede baseline: ali `kept` e o comportamento certo.
insert into measurement_values (checkin_id, user_id, key, side, value, provenance) values
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'waist', 'na', 82, 'typed'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'wrist', 'l', 17, 'kept'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'height', 'na', 178, 'kept');

select lives_ok(
  $$insert into baselines (user_id, checkin_id, reason)
    values ('11111111-1111-1111-1111-111111111111',
            'aaaaaaaa-0000-0000-0000-000000000002', 'initial')$$,
  'baseline com variaveis digitadas e estruturais mantidas e aceito');

-- ------------------------------------------------------- razoes de proporcao ---
select throws_ok(
  $$insert into proportion_ratios
      (checkin_id, user_id, axis_key, denominator_kind, baseline_checkin_id,
       status, current_value, reference_value, ratio)
    values ('aaaaaaaa-0000-0000-0000-000000000003',
            '11111111-1111-1111-1111-111111111111', 'core_waist', 'baseline',
            'aaaaaaaa-0000-0000-0000-000000000002', 'ok', 80, 82, 0.9756)$$,
  '23514',
  null,
  'eixo ok exige a proveniencia das duas pontas da razao');

select lives_ok(
  $$insert into proportion_ratios
      (checkin_id, user_id, axis_key, denominator_kind, baseline_checkin_id,
       status, current_value, reference_value, ratio,
       current_provenance, reference_provenance)
    values ('aaaaaaaa-0000-0000-0000-000000000003',
            '11111111-1111-1111-1111-111111111111', 'core_waist', 'baseline',
            'aaaaaaaa-0000-0000-0000-000000000002', 'ok', 80, 82, 0.9756,
            'kept', 'typed')$$,
  'eixo com numerador mantido e registrado como tal, nao recusado');

-- Eixo indisponivel nao exige proveniencia: nao ha razao para carimbar.
select lives_ok(
  $$insert into proportion_ratios
      (checkin_id, user_id, axis_key, denominator_kind, baseline_checkin_id, status)
    values ('aaaaaaaa-0000-0000-0000-000000000003',
            '11111111-1111-1111-1111-111111111111', 'chest', 'baseline',
            'aaaaaaaa-0000-0000-0000-000000000002', 'missing_input')$$,
  'eixo indisponivel nao exige proveniencia');

select * from finish();
rollback;
