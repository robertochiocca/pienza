// Fixtures do gate de nome antigo. Ver scripts/fixtures/mecanicas.fixtures.mjs
// para o motivo de elas viverem em diretorio proprio.

export const POSITIVAS = [
  'const nome = "Ryven";',
  'com.robertochiocca.ryven',
  'RYVEN_DB_MODO=shim',
  'import { cm } from "@ryven/domain";',
  'DB="ryven_test_$$"',
];

export const NEGATIVAS = [
  'const nome = "Pienza";',
  'com.robertochiocca.pienza',
  'import { cm } from "@pienza/domain";',
  'const derived = true;',
  'const driven = false;',
  'PIENZA_DB_MODO=shim',
];
