#!/usr/bin/env bash
#
# Roda a suite pgTAP em dois modos.
#
#   shim (padrao)  Postgres cru mais scripts/sql/bootstrap-local.sql, que reproduz a
#                  superficie do Supabase de que as migrations dependem: schema auth,
#                  auth.uid(), papeis e schema storage. Cria um banco descartavel,
#                  aplica migrations e seed, roda os testes e apaga o banco. Leva
#                  segundos, entao roda em todo commit.
#
#   supabase       Contra a pilha real ja de pe (`supabase start`), que aplicou as
#                  migrations sozinha. Nao aplica o shim: la auth, storage e os papeis
#                  ja existem de verdade, e aplicar o shim mascararia justamente a
#                  divergencia que este modo procura. Leva minutos, entao roda so na
#                  fronteira para main.
#
# A razao de existirem os dois: o shim e uma reproducao minha, e nada garante que ela
# continue fiel ao Supabase conforme as migrations crescem. Rapido no loop, fiel na
# fronteira.
#
# Modo por RYVEN_DB_MODO. Conexao por PGHOST / PGPORT / PGUSER / PGPASSWORD.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODO="${RYVEN_DB_MODO:-shim}"

export PGHOST="${PGHOST:-/tmp}"
export PGPORT="${PGPORT:-55432}"
export PGUSER="${PGUSER:-postgres}"

falhas=0

case "$MODO" in
  shim)
    DB="ryven_test_$$"
    limpar() { dropdb --if-exists "$DB" >/dev/null 2>&1 || true; }
    trap limpar EXIT
    createdb "$DB"

    echo "== shim local (auth, storage, papeis) =="
    psql -q -X -v ON_ERROR_STOP=1 -d "$DB" -f "$ROOT/scripts/sql/bootstrap-local.sql"

    echo "== migrations =="
    for arquivo in "$ROOT"/supabase/migrations/*.sql; do
      echo "   $(basename "$arquivo")"
      psql -q -X -v ON_ERROR_STOP=1 -d "$DB" -f "$arquivo"
    done
    ;;

  supabase)
    DB="${PGDATABASE:-postgres}"
    echo "== pilha real: migrations ja aplicadas por supabase start =="
    psql -q -X -v ON_ERROR_STOP=1 -d "$DB" -c 'create extension if not exists pgtap'
    ;;

  *)
    echo "RYVEN_DB_MODO invalido: $MODO (use shim ou supabase)" >&2
    exit 2
    ;;
esac

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
  echo "suite de banco ($MODO): $falhas arquivo(s) com falha"
  exit 1
fi

echo
echo "suite de banco ($MODO): tudo verde"
