-- Travas que nao dependem de quem esta autenticado: restricoes que o banco impoe a
-- qualquer escritor. Sao as regras que eu nao quero que dependam de nenhuma camada
-- de aplicacao lembrar delas.
--
-- Toda assercao roda sob papel declarado. Onde o papel e superusuario, ele esta
-- marcado com o motivo — ver scripts/gate-suite-papel.mjs.

begin;
select plan(19);

-- Fixtures como superusuario: auth.users nao e escrita pelo cliente.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@exemplo.test'),
  ('22222222-2222-2222-2222-222222222222', 'b@exemplo.test');

insert into checkins (id, user_id, taken_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', now()),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', now()),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', now());

insert into professionals (id, full_name, council, registration_number, uf, active)
values ('dddddddd-0000-0000-0000-000000000001', 'Profissional Teste', 'CREF', '000000', 'SP', true);

insert into consent_documents (id, purpose, version, body_md, effective_from)
values ('cccccccc-0000-0000-0000-000000000001', 'professional_review', 1, 'termo', now());

insert into consent_events (id, user_id, document_id, purpose, action)
values ('eeeeeeee-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
        'cccccccc-0000-0000-0000-000000000001', 'professional_review', 'granted');

-- ------------------------------------------------------------ como o app roda ---
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select throws_ok(
  $$insert into measurement_values (checkin_id, user_id, key, side, value, provenance)
    values ('aaaaaaaa-0000-0000-0000-000000000001',
            '22222222-2222-2222-2222-222222222222', 'waist', 'na', 80, 'typed')$$,
  '42501',
  null,
  'medida com dono diferente do check-in e barrada antes mesmo da chave composta');

select throws_ok(
  $$insert into measurement_values (checkin_id, user_id, key, side, value, provenance)
    values ('aaaaaaaa-0000-0000-0000-000000000001',
            '11111111-1111-1111-1111-111111111111', 'waist', 'na', 1700, 'typed')$$,
  '23514',
  null,
  'valor absurdo e barrado pela guarda de integridade');

select throws_ok(
  $$insert into measurement_values (checkin_id, user_id, key, side, value, provenance)
    values ('aaaaaaaa-0000-0000-0000-000000000001',
            '11111111-1111-1111-1111-111111111111', 'calf', 'na', 38, 'typed')$$,
  '23514',
  null,
  'medida bilateral exige lado');

select throws_ok(
  $$insert into measurement_values (checkin_id, user_id, key, side, value, provenance)
    values ('aaaaaaaa-0000-0000-0000-000000000001',
            '11111111-1111-1111-1111-111111111111', 'waist', 'l', 80, 'typed')$$,
  '23514',
  null,
  'medida nao bilateral recusa lado');

select lives_ok(
  $$insert into measurement_values (checkin_id, user_id, key, side, value, provenance)
    values ('aaaaaaaa-0000-0000-0000-000000000001',
            '11111111-1111-1111-1111-111111111111', 'calf', 'l', 38, 'typed')$$,
  'medida bilateral com lado e aceita');

-- ---------------------------------------------------------------- baseline ----
insert into baselines (user_id, checkin_id, reason) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', 'initial');

select throws_ok(
  $$insert into baselines (user_id, checkin_id, reason)
    values ('11111111-1111-1111-1111-111111111111',
            'aaaaaaaa-0000-0000-0000-000000000002', 'user_reset')$$,
  '23505',
  null,
  'dois baselines abertos ao mesmo tempo sao rejeitados');

update baselines set effective_to = now()
 where user_id = '11111111-1111-1111-1111-111111111111' and effective_to is null;

select lives_ok(
  $$insert into baselines (user_id, checkin_id, reason)
    values ('11111111-1111-1111-1111-111111111111',
            'aaaaaaaa-0000-0000-0000-000000000002', 'user_reset')$$,
  'redefinir baseline depois de fechar o anterior e aceito');

-- ------------------------------------------------------------------- fotos ----
select throws_ok(
  $$insert into photos (checkin_id, user_id, angle, storage_path, consent_store_at)
    values ('aaaaaaaa-0000-0000-0000-000000000001',
            '11111111-1111-1111-1111-111111111111', 'front',
            '22222222-2222-2222-2222-222222222222/x/front.jpg', now())$$,
  '23514',
  null,
  'caminho de Storage fora da pasta do dono e rejeitado');

-- Quem barra aqui e o CHECK, e nao a policy: a linha e do proprio dono, e so o
-- caminho aponta para a pasta de outro. Sao duas camadas cobrindo coisas
-- diferentes, e a policy sozinha deixaria essa passar.

-- ------------------------------------------------------- razoes derivadas -----
reset role;
-- papel: superusuario porque proportion_ratios e escrita so pela rotina de recomputo;
-- `authenticated` nao tem grant de insert, e o teste aqui e das restricoes que a
-- propria rotina precisa respeitar.
select throws_ok(
  $$insert into proportion_ratios
      (checkin_id, user_id, axis_key, denominator_kind, status, ratio,
       current_provenance, reference_provenance)
    values ('aaaaaaaa-0000-0000-0000-000000000001',
            '11111111-1111-1111-1111-111111111111', 'chest', 'baseline', 'ok', 1.0,
            'typed', 'typed')$$,
  '23514',
  null,
  'razao contra baseline exige registrar qual baseline foi usado');

select throws_ok(
  $$insert into proportion_ratios
      (checkin_id, user_id, axis_key, denominator_kind, baseline_checkin_id, status,
       current_provenance, reference_provenance)
    values ('aaaaaaaa-0000-0000-0000-000000000001',
            '11111111-1111-1111-1111-111111111111', 'chest', 'baseline',
            'aaaaaaaa-0000-0000-0000-000000000001', 'ok', 'typed', 'typed')$$,
  '23514',
  null,
  'eixo marcado como ok sem razao e rejeitado');

select throws_ok(
  $$insert into proportion_ratios
      (checkin_id, user_id, axis_key, denominator_kind, baseline_checkin_id, status, ratio,
       current_provenance, reference_provenance)
    values ('aaaaaaaa-0000-0000-0000-000000000001',
            '11111111-1111-1111-1111-111111111111', 'chest', 'baseline',
            'bbbbbbbb-0000-0000-0000-000000000001', 'ok', 1.0, 'typed', 'typed')$$,
  '23503',
  null,
  'baseline de outro usuario e rejeitado pela chave composta');

-- ---------------------------------------------------- gate legal do plano -----
-- papel: superusuario porque transicao de status de plano e ato de servidor, e
-- `authenticated` nao tem grant de escrita em plans.
select throws_ok(
  $$insert into plans (user_id, kind, status, draft_content)
    values ('11111111-1111-1111-1111-111111111111', 'training', 'delivered', '{}'::jsonb)$$,
  '23514',
  null,
  'plano nao pode ser entregue sem revisao assinada');

select lives_ok(
  $$insert into plans
      (user_id, kind, status, draft_content, reviewed_content, periodization,
       professional_id, reviewed_at, signature_ref, consent_event_id, delivered_at)
    values ('11111111-1111-1111-1111-111111111111', 'training', 'delivered',
            '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
            'dddddddd-0000-0000-0000-000000000001', now(), 'assinatura',
            'eeeeeeee-0000-0000-0000-000000000001', now())$$,
  'plano com revisao, assinatura, periodizacao e consentimento e aceito');

-- ------------------------------------------------- invalidacao do derivado ----
-- A linha derivada entra pela rotina; quem edita a medida e o app. O teste precisa
-- dos dois papeis, e por isso a leitura final volta para authenticated.
insert into proportion_ratios
  (checkin_id, user_id, axis_key, denominator_kind, baseline_checkin_id, status,
   current_value, reference_value, ratio, current_provenance, reference_provenance)
values
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'core_waist', 'baseline', 'aaaaaaaa-0000-0000-0000-000000000001', 'ok', 80, 82, 0.9756,
   'typed', 'typed');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

update measurement_values set value = 81
 where checkin_id = 'aaaaaaaa-0000-0000-0000-000000000001' and key = 'calf';

select is_empty(
  $$select 1 from proportion_ratios
     where baseline_checkin_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  'editar medida do baseline invalida as razoes calculadas contra ele');

-- A ordem dos eixos do hexagono muda a area do poligono sem mudar dado nenhum, e o
-- comentario da coluna e o unico lugar onde quem esta no psql, prestes a rodar o
-- UPDATE, vai ler isso. Comentario some em silencio numa recriacao de tabela; estas
-- duas assercoes sao o que impede. Ver docs/decisoes/0013-ordem-dos-eixos.md.
-- papel: superusuario porque col_description le o catalogo do sistema
set local role postgres;

select matches(
  (select col_description(a.attrelid, a.attnum)
     from pg_attribute a
    where a.attrelid = 'proportion_axes'::regclass and a.attname = 'display_order'),
  'docs/decisoes/0013',
  'a ordem dos eixos avisa no proprio catalogo que reordenar muda o que todos leem');

select matches(
  (select col_description(a.attrelid, a.attnum)
     from pg_attribute a
    where a.attrelid = 'measurement_keys'::regclass and a.attname = 'display_order'),
  'nao governa a ordem dos eixos',
  'a ordem da fita diz explicitamente que nao e a ordem do grafico');

-- A escala radial do hexagono governa o quanto o desenho amplifica, e os tres numeros
-- so fazem sentido escolhidos juntos. Estas assercoes existem para que mexer em um
-- deles seja um ato: quem mudar tem que passar por aqui.
select set_eq(
  $$select key from product_settings where key like 'hexagon\_%'$$,
  $$values ('hexagon_scale_ratio_min'), ('hexagon_scale_ratio_max'),
           ('hexagon_scale_min_radius'), ('hexagon_stable_threshold')$$,
  'a escala do hexagono vive em product_settings, e nao em constante de codigo');

select is_empty(
  $$select key from product_settings where key like 'hexagon\_%' and nature <> 'produto'$$,
  'nenhum numero da escala do hexagono se apresenta como clinico');

-- A simetria em torno de 1 e deliberada: faixa assimetrica daria mais espaco de desenho
-- a uma das direcoes, que e o grafico opinando sobre qual delas importa.
select is(
  (select sum(value) from product_settings
    where key in ('hexagon_scale_ratio_min', 'hexagon_scale_ratio_max')),
  2.00::numeric,
  'a faixa de razao e simetrica em torno de 1');

reset role;

select * from finish();
rollback;
