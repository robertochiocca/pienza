// Fixtures do gate de segredos. Ver scripts/fixtures/mecanicas.fixtures.mjs para o
// motivo de elas viverem em diretorio proprio.

export const POSITIVAS = [
  ['supabase-service-role', 'const key = process.env.SUPABASE_SERVICE_ROLE_KEY;'],
  ['supabase-secret', 'const k = "sb_secret_9aKq2LmNqR4tYuVw";'],
  ['jwt', 'const t = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0";'],
  ['aws', 'AKIAIOSFODNN7EXAMPLE'],
  ['github', 'ghp_1234567890abcdefghijKLMNOPQRSTUVWX'],
];

export const NEGATIVAS = [
  'const url = process.env.SUPABASE_URL;',
  'const key = process.env.SUPABASE_PUBLISHABLE_KEY;',
  'const papel = "authenticated";',
  'grant select on checkins to authenticated;',
  'const servico = criarServico();',
];
