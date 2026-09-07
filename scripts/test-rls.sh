#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Runs the tenant isolation suite against a throwaway local Postgres database.
#
# This proves the RLS policies actually behave as written, without needing a
# Supabase project, network access, or an API key. It is the Milestone 1 exit
# condition, so it should pass before any feature work is called done.
#
#   ./scripts/test-rls.sh
#
# Requires: a running local PostgreSQL (16+) and superuser access via `psql`.
# Override how psql is invoked with PSQL_CMD, e.g.
#   PSQL_CMD="psql -h localhost -U postgres" ./scripts/test-rls.sh
# -----------------------------------------------------------------------------
set -euo pipefail

DB="${GRANTPATH_TEST_DB:-grantpath_rls_test}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -n "${PSQL_CMD:-}" ]; then
  run_psql() { $PSQL_CMD "$@"; }
elif [ "$(id -u)" = "0" ] && id postgres >/dev/null 2>&1; then
  run_psql() { su postgres -c "psql $*"; }
else
  run_psql() { psql "$@"; }
fi

echo "→ recreating database ${DB}"
run_psql "-q -c 'drop database if exists ${DB};'" >/dev/null
run_psql "-q -c 'create database ${DB};'" >/dev/null

echo "→ applying local Supabase stub + migrations"
cat "${ROOT}/supabase/tests/00_local_stub.sql" \
    "${ROOT}/supabase/migrations/"*.sql \
  | run_psql "-v ON_ERROR_STOP=1 -q -d ${DB}"

echo "→ running tenant isolation suite"
set +e
OUT="$(cat "${ROOT}/supabase/tests/01_isolation.sql" \
        | run_psql "-v ON_ERROR_STOP=1 -q -d ${DB}" 2>&1)"
CODE=$?
set -e

echo "${OUT}" | grep -E "^(NOTICE:|===|ERROR|FAIL)" | sed 's/^NOTICE:  //'

PASSED="$(echo "${OUT}" | grep -c 'pass  ' || true)"

if [ "${CODE}" -ne 0 ] || echo "${OUT}" | grep -q "FAIL"; then
  echo ""
  echo "✗ tenant isolation FAILED (${PASSED} checks passed before the failure)"
  exit 1
fi

echo ""
echo "✓ ${PASSED} tenant isolation checks passed"
