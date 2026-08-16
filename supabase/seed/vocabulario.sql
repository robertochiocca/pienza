-- Vocabulario inicial. Seed e nao migration porque sao dados de referencia que eu
-- espero editar sem versionar cada ajuste de rotulo como mudanca de schema.

insert into measurement_keys
  (key, label_ptbr, unit, bilateral, min_value, max_value, display_order)
values
  -- As faixas sao propositalmente largas. Elas existem para barrar erro de
  -- digitacao, nao para dizer a alguem que o corpo dele esta fora de uma faixa.
  ('height',      'Altura',              'cm', false,  50,  260,  1),
  ('weight',      'Peso',                'kg', false,  20,  400,  2),
  ('wingspan',    'Envergadura',         'cm', false,  50,  280,  3),
  ('head',        'Cabeca',              'cm', false,  30,   80,  4),
  ('neck',        'Pescoco',             'cm', false,  15,   90,  5),
  ('shoulders',   'Ombros',              'cm', false,  50,  250,  6),
  ('chest',       'Peito',               'cm', false,  40,  250,  7),
  ('waist',       'Cintura',             'cm', false,  30,  250,  8),
  ('hips',        'Quadril',             'cm', false,  40,  250,  9),
  ('arm_relaxed', 'Braco relaxado',      'cm', true,   10,  100, 10),
  ('arm_flexed',  'Braco contraido',     'cm', true,   10,  100, 11),
  ('forearm',     'Antebraco',           'cm', true,   10,   80, 12),
  ('wrist',       'Punho',               'cm', true,    8,   40, 13),
  ('thigh',       'Coxa',                'cm', true,   20,  120, 14),
  ('knee',        'Joelho',              'cm', true,   15,   90, 15),
  ('calf',        'Panturrilha',         'cm', true,   15,   90, 16),
  ('ankle',       'Tornozelo',           'cm', true,   10,   60, 17)
on conflict (key) do nothing;

-- `head` e `knee` nao sao usadas por nada hoje. Entram agora porque o sistema de
-- proporcao de Reeves depende das duas, e incluir uma chave custa uma linha
-- enquanto adicionar depois custa migration com dado ja em producao.

insert into proportion_axes (key, label_ptbr, measurement_key, display_order)
values
  ('shoulders_back', 'Ombros e costas', 'shoulders',  1),
  ('chest',          'Peito',           'chest',      2),
  ('arms',           'Bracos',          'arm_flexed', 3),
  ('core_waist',     'Core e cintura',  'waist',      4),
  ('legs',           'Pernas',          'thigh',      5),
  ('calves',         'Panturrilhas',    'calf',       6)
on conflict (key) do nothing;

insert into consent_purposes (key, label_ptbr, requires_per_event)
values
  ('store_measurements',      'Guardar minhas medidas',                  false),
  ('store_photos',            'Guardar minhas fotos',                    true),
  ('process_photos_external', 'Enviar foto para analise de terceiro',    true),
  ('share_card',              'Gerar imagem para compartilhar',          true),
  ('professional_review',     'Enviar meus dados para revisao profissional', true)
on conflict (key) do nothing;
