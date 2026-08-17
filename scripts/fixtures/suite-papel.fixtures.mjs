// Fixtures do gate de papel da suite. Ver scripts/fixtures/mecanicas.fixtures.mjs
// para o motivo de elas viverem em diretorio proprio.

/** Cada caso e um arquivo SQL inteiro, porque o gate e um automato sobre o arquivo. */
export const POSITIVAS = [
  [
    'assercao sem papel declarado, no topo do arquivo',
    ['begin;', 'select plan(1);', "select ok(true, 'oi');", 'rollback;'].join('\n'),
  ],
  [
    'assercao depois de reset role, sem marcador',
    [
      'begin;',
      'select plan(1);',
      'set local role authenticated;',
      'reset role;',
      "select ok(true, 'oi');",
      'rollback;',
    ].join('\n'),
  ],
  [
    'marcador sem motivo escrito',
    [
      'begin;',
      'select plan(1);',
      '-- papel: superusuario porque',
      "select ok(true, 'oi');",
      'rollback;',
    ].join('\n'),
  ],
  [
    'marcador nao sobrevive a troca de papel',
    [
      'begin;',
      'select plan(1);',
      '-- papel: superusuario porque a rotina de servidor escreve aqui',
      "select ok(true, 'um');",
      'set local role authenticated;',
      'reset role;',
      "select ok(true, 'dois');",
      'rollback;',
    ].join('\n'),
  ],
];

export const NEGATIVAS = [
  [
    'assercao sob authenticated',
    [
      'begin;',
      'select plan(1);',
      'set local role authenticated;',
      "select ok(true, 'oi');",
      'rollback;',
    ].join('\n'),
  ],
  [
    'superusuario com marcador e motivo',
    [
      'begin;',
      'select plan(1);',
      '-- papel: superusuario porque le pg_proc, que authenticated nao alcanca',
      "select is_empty($$select 1$$, 'oi');",
      'rollback;',
    ].join('\n'),
  ],
  [
    'insert de fixture antes do papel nao e assercao',
    [
      'begin;',
      'select plan(1);',
      "insert into checkins (user_id) values ('x');",
      'set local role authenticated;',
      "select ok(true, 'oi');",
      'rollback;',
    ].join('\n'),
  ],
  [
    'plan e finish nao sao assercoes',
    ['begin;', 'select plan(0);', 'select * from finish();', 'rollback;'].join('\n'),
  ],
];
