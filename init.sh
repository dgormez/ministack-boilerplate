#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# init.sh — Rename MiniStack to your app across the entire repo.
# Run once from the repo root after cloning:  bash init.sh
# Override defaults via env vars:  APP_NAME=MyApp BUNDLE_ID=com.acme.myapp bash init.sh
# ──────────────────────────────────────────────────────────────────────────────
set -e

# ── Defaults (override with env vars) ─────────────────────────────────────────

APP_NAME="${APP_NAME:-StackMini}"
BUNDLE_ID="${BUNDLE_ID:-com.company.stackmini}"

# Derive lowercase slug from the last segment of the bundle ID
APP_SLUG="${BUNDLE_ID##*.}"

echo ""
echo "MiniStack initializer"
echo "──────────────────────────────────────────────"
echo ""
echo "  PascalCase : $APP_NAME"
echo "  Slug       : $APP_SLUG"
echo "  Bundle ID  : $BUNDLE_ID"
echo ""

# ── Clean stale build artifacts and ghost directories ─────────────────────────

echo "Cleaning stale build artifacts..."
rm -rf \
  "backend/MiniStack.Api/bin"       "backend/MiniStack.Api/obj" \
  "backend/MiniStack.Api.Tests/bin" "backend/MiniStack.Api.Tests/obj"

# ── Text replacements ─────────────────────────────────────────────────────────

echo "Replacing names in source files..."

find . \
  '(' -path "*/node_modules" -o -path "*/bin" -o -path "*/obj" -o -path "*/.git" ')' -prune \
  -o -type f '(' \
    -name "*.json"       -o -name "*.ts"    -o -name "*.tsx"  \
    -o -name "*.cs"      -o -name "*.csproj" -o -name "*.sln" \
    -o -name "*.yml"     -o -name "*.yaml"  -o -name "*.md"   \
    -o -name "*.js"      -o -name "*.sh"    -o -name "*.txt"  \
    -o -name "Dockerfile" \
  ')' -print | while IFS= read -r f; do
  [[ "$f" == *"package-lock.json" ]] && continue
  [[ "$f" == "./init.sh" ]] && continue
  perl -i -pe "
    s/com\.dgit\.ministack/$BUNDLE_ID/g;
    s/MiniStack/$APP_NAME/g;
    s/ministack/$APP_SLUG/g;
  " "$f"
done

# ── Directory and file renames ────────────────────────────────────────────────

echo "Renaming .NET project directories..."

# If destination already exists (re-run), merge source into it rather than nesting it inside
_merge_or_move() {
  local src="$1" dst="$2"
  [[ "$src" == "$dst" || ! -d "$src" ]] && return 0
  if [[ -d "$dst" ]]; then
    cp -a "$src/." "$dst/" && rm -rf "$src"
  else
    mv "$src" "$dst"
  fi
}

_merge_or_move "backend/MiniStack.Api"       "backend/$APP_NAME.Api"
_merge_or_move "backend/MiniStack.Api.Tests" "backend/$APP_NAME.Api.Tests"

# Belt-and-suspenders: force-remove the old dirs if anything survived
[[ "$APP_NAME" != "MiniStack" ]] && rm -rf "backend/MiniStack.Api" "backend/MiniStack.Api.Tests"

for f in "backend/$APP_NAME.Api/MiniStack.Api.csproj" \
         "backend/$APP_NAME.Api.Tests/MiniStack.Api.Tests.csproj"; do
  if [[ -f "$f" ]]; then
    dir="$(dirname "$f")"
    base="$(basename "$f")"
    new="${base/MiniStack/$APP_NAME}"
    [[ "$base" != "$new" ]] && mv "$f" "$dir/$new"
  fi
done

for f in *.sln; do
  if [[ -f "$f" ]]; then
    new="${f/MiniStack/$APP_NAME}"
    [[ "$f" != "$new" ]] && mv "$f" "$new"
  fi
done

# ── Regenerate package-lock.json ──────────────────────────────────────────────

echo "Regenerating mobile/package-lock.json..."
(cd mobile && npm install --package-lock-only --silent 2>/dev/null)

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
echo "Done! $APP_NAME is ready."
echo ""
echo "Next steps:"
echo "  1. mobile/  → cp .env.example .env  and fill in your credentials"
echo "  2. backend/$APP_NAME.Api/  → fill in appsettings.json"
echo "  3. Work through SETUP_CHECKLIST.md"
echo "  4. cd backend/$APP_NAME.Api && dotnet run"
echo "  5. cd mobile && npx expo start"
echo ""