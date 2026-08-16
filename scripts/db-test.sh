#!/usr/bin/env bash
#
# Aplica as migrations num banco descartavel e roda a suite pgTAP.
#
# Nao usa a CLI do Supabase de proposito: a CLI sobe uma pilha inteira em Docker, e
# o que precisa ser verificado aqui e apenas o que o Postgres decide — restricoes,
# gatilhos e RLS. Um Postgres cru mais o shim de `supabase/tests/00_bootstrap_local.sql`
# cobrem isso e rodam em segundos, o que e a diferenca entre a suite rodar em todo
# commit e a suite rodar quando alguem lembra.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PGHOST="${PGHOST:-/tmp}"
export PGPORT="${PGPORT:-55432}"
export PGUSER="${PGUSER:-postgres}"

DB="ryven_test_$$"
falhas=0

limpar() {
  dropdb --if-exists "$DB" >/dev/null 2>&1 || true
}
trap limpar EXIT

createdb "$DB"

echo "== shim local (auth, storage, papeis) =="
psql -q -X -v ON_ERROR_STOP=1 -d "$DB" -f "$ROOT/supabase/tests/00_bootstrap_local.sql"

echo "== migrations =="
for arquivo in "$ROOT"/supabase/migrations/*.sql; do
  echo "   $(basename "$arquivo")"
  psql -q -X -v ON_ERROR_STOP=1 -d "$DB" -f "$arquivo"
done

echo "== seed =="
for arquivo in "$ROOT"/supabase/seed/*.sql; do
  echo "   $(basename "$arquivo")"
  psql -q -X -v ON_ERROR_STOP=1 -d "$DB" -f "$arquivo"
done

echo "== testes =="
for arquivo in "$ROOT"/supabase/tests/[0-9][0-9][0-9]_*.sql; do
  nome="$(basename "$arquivo")"
  saida="$(psql -q -X -t -A -d "$DB" -f "$arquivo" 2>&1)" || true

  # Um arquivo que morre antes de emitir TAP nenhum passaria despercebido se o
  # criterio fosse apenas "nao ha linha 'not ok'".
  if ! grep -qE '^ok [0-9]+' <<<"$saida"; then
    echo "   $nome: nao produziu TAP"
    echo "$saida" | sed 's/^/      /'
    falhas=$((falhas + 1))
    continue
  fi

  # Divergencia entre o plano e o numero de assercoes tem que reprovar. Ela nao
  # produz linha `not ok`: o pgTAP so anota um comentario no fim, e um criterio
  # baseado em `not ok` daria verde para um arquivo que parou no meio ou que ganhou
  # assercao sem alguem atualizar o plano. Foi o que aconteceu na primeira execucao
  # desta suite, com plano de 22 e 24 assercoes rodando.
  planejadas="$(grep -oE '^1\.\.[0-9]+' <<<"$saida" | head -1 | cut -d. -f3)"
  executadas="$(grep -cE '^(ok|not ok) [0-9]+' <<<"$saida")"

  if grep -qE '^not ok' <<<"$saida" || grep -qiE '^(psql:|ERROR:)' <<<"$saida"; then
    echo "   $nome: FALHOU"
    echo "$saida" | grep -E '^(not ok|# |psql:|ERROR:)' | sed 's/^/      /'
    falhas=$((falhas + 1))
  elif [ "${planejadas:-0}" != "$executadas" ]; then
    echo "   $nome: plano diz ${planejadas:-?}, rodaram $executadas"
    falhas=$((falhas + 1))
  else
    echo "   $nome: $executadas asserções ok"
  fi
done

if [ "$falhas" -gt 0 ]; then
  echo
  echo "suite de banco: $falhas arquivo(s) com falha"
  exit 1
fi

echo
echo "suite de banco: tudo verde"
