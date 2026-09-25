#!/usr/bin/env bash
# Throwaway local Supabase stack for end-to-end testing in Codespaces.
#
# `supabase start` doesn't work here: container-to-container networking on
# Docker bridge networks times out in this Codespace. Everything below runs
# on the host network instead: Postgres (5432), GoTrue (9999), PostgREST
# (3001) and a Deno gateway on 54321 that serves the real Edge Function
# sources. Local only — fixed throwaway secrets, nothing touches the linked
# project.
#
#   scripts/local-stack/up.sh                       # fresh DB: migrations + seed + test users
#   eval "$(scripts/local-stack/up.sh --env)"        # export LOCAL_ANON / LOCAL_SERVICE
#   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=$LOCAL_ANON npx next dev -p 3100
#   scripts/local-stack/down.sh
#
# Test users (password test-password-123): owner@test.local (owner, active),
# staff@test.local (staff, active), stranger@test.local (a raw sign-up, left
# inactive as every new account now is — migration 0008).
set -euo pipefail
cd "$(dirname "$0")/../.."

SECRET="local-e2e-jwt-secret-0123456789abcdefghij"
jwt() {
  node -e '
    const c = require("crypto"), s = process.argv[1], r = process.argv[2];
    const b = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const h = b({ alg: "HS256", typ: "JWT" }), p = b({ role: r, iss: "supabase", iat: 1700000000, exp: 2100000000 });
    console.log(h + "." + p + "." + c.createHmac("sha256", s).update(h + "." + p).digest("base64url"));
  ' "$SECRET" "$1"
}
ANON=$(jwt anon)
SERVICE=$(jwt service_role)

if [[ "${1:-}" == "--env" ]]; then
  echo "export LOCAL_ANON=$ANON LOCAL_SERVICE=$SERVICE"
  exit 0
fi

wait_for() { timeout "$2" bash -c "until $1; do sleep 2; done" || { echo "timed out: $1" >&2; exit 1; }; }

docker rm -f rn-pg rn-gotrue rn-rest rn-gateway >/dev/null 2>&1 || true

docker run -d --name rn-pg --network host -e POSTGRES_PASSWORD=x public.ecr.aws/supabase/postgres:17.6.1.166 >/dev/null
wait_for "docker exec rn-pg pg_isready -U postgres -h 127.0.0.1 >/dev/null 2>&1" 90
sleep 8

# GoTrue first: it creates the full auth schema that 0001's trigger hooks into.
docker run -d --name rn-gotrue --network host \
  -e GOTRUE_API_HOST=127.0.0.1 -e PORT=9999 -e API_EXTERNAL_URL=http://127.0.0.1:54321/auth/v1 \
  -e GOTRUE_DB_DRIVER=postgres -e GOTRUE_DB_DATABASE_URL="postgres://supabase_auth_admin:x@127.0.0.1:5432/postgres" \
  -e GOTRUE_SITE_URL=http://localhost:3100 -e GOTRUE_JWT_SECRET="$SECRET" -e GOTRUE_JWT_EXP=3600 \
  -e GOTRUE_JWT_AUD=authenticated -e GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated -e GOTRUE_JWT_ADMIN_ROLES=service_role \
  -e GOTRUE_EXTERNAL_EMAIL_ENABLED=true -e GOTRUE_MAILER_AUTOCONFIRM=true -e GOTRUE_DISABLE_SIGNUP=false \
  public.ecr.aws/supabase/gotrue:v2.197.0 >/dev/null
wait_for "curl -s http://127.0.0.1:9999/health | grep -q version" 90

for f in supabase/migrations/*.sql supabase/seed.sql; do
  docker exec -i rn-pg psql -U postgres -v ON_ERROR_STOP=1 -q < "$f" >/dev/null || { echo "failed applying $f" >&2; exit 1; }
done

docker run -d --name rn-rest --network host -e PGRST_DB_URI="postgres://authenticator:x@127.0.0.1:5432/postgres" \
  -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon -e PGRST_JWT_SECRET="$SECRET" -e PGRST_SERVER_PORT=3001 \
  public.ecr.aws/supabase/postgrest:v14.5 >/dev/null
docker run -d --name rn-gateway --network host -v "$PWD":/app -w /app \
  -e SUPABASE_URL=http://127.0.0.1:54321 -e SUPABASE_SERVICE_ROLE_KEY="$SERVICE" -e BOOKING_LINK_SECRET=local-link-secret \
  denoland/deno:2.5.6 run -A --config supabase/functions/deno.json scripts/local-stack/gateway.ts >/dev/null
wait_for "curl -s -o /dev/null http://127.0.0.1:54321/" 180

for u in owner staff stranger; do
  curl -sf -m 20 -X POST http://127.0.0.1:54321/auth/v1/admin/users -H "Authorization: Bearer $SERVICE" -H "apikey: $SERVICE" \
    -H 'content-type: application/json' -d "{\"email\":\"$u@test.local\",\"password\":\"test-password-123\",\"email_confirm\":true}" >/dev/null
done
docker exec rn-pg psql -U postgres -q -c "
  update profiles set role = 'owner', full_name = 'Test Owner', is_active = true where id = (select id from auth.users where email = 'owner@test.local');
  update profiles set full_name = 'Test Staff', is_active = true where id = (select id from auth.users where email = 'staff@test.local');"

echo "Local stack up on http://127.0.0.1:54321 (anon key: eval \"\$(scripts/local-stack/up.sh --env)\")"
