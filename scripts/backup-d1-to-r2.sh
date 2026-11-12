#!/usr/bin/env bash
set -euo pipefail
: "${D1_DATABASE_NAME:?Set D1_DATABASE_NAME}"
: "${R2_BUCKET_NAME:?Set R2_BUCKET_NAME}"
: "${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ACCOUNT_ID:?Set CLOUDFLARE_ACCOUNT_ID}"
command -v npx >/dev/null
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
stamp="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
file="$tmp/d1-$stamp.sql"
npx --yes wrangler@4 d1 export "$D1_DATABASE_NAME" --remote --output "$file"
test -s "$file"
sha256sum "$file" > "$file.sha256"
npx --yes wrangler@4 r2 object put "$R2_BUCKET_NAME/d1/$stamp.sql" --file "$file" --remote
npx --yes wrangler@4 r2 object put "$R2_BUCKET_NAME/d1/$stamp.sql.sha256" --file "$file.sha256" --remote
echo "Uploaded backup: d1/$stamp.sql"
