#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# init.sh — Rename MiniStack to your app across the entire repo.
# Run once from the repo root after cloning:  bash init.sh
# ──────────────────────────────────────────────────────────────────────────────
set -e

echo ""
echo "MiniStack initializer"
echo "──────────────────────────────────────────────"
echo ""
echo "This script renames every occurrence of 'MiniStack' and 'ministack'"
echo "to your app name, and replaces the bundle ID placeholder."
echo ""

# ── Gather inputs ─────────────────────────────────────────────────────────────

read -rp "App name in PascalCase (e.g. TaskMaster):     " APP_NAME
read -rp "Bundle ID   (e.g. com.acme.taskmaster):       " BUNDLE_ID
read -rp "Your GitHub username (for README clone URL):  " GH_USER

# Derive lowercase slug from the last segment of the bundle ID
APP_SLUG="${BUNDLE_ID##*.}"

echo ""
echo "  PascalCase : $APP_NAME"
echo "  Slug       : $APP_SLUG"
echo "  Bundle ID  : $BUNDLE_ID"
echo "  GitHub URL : https://github.com/$GH_USER/${APP_SLUG}-boilerplate"
echo ""
read -rp "Looks good? Press y to continue: " CONFIRM
[[ "$CONFIRM" != "y" ]] && echo "Aborted." && exit 0
echo ""

# ── File list (skip generated / binary directories) ───────────────────────────

mapfile -t FILES < <(find . \
  \( -path "*/node_modules" -o -path "*/bin" -o -path "*/obj" -o -path "*/.git" \) -prune \
  -o -type f \( \
    -name "*.json"       -o -name "*.ts"    -o -name "*.tsx"  \
    -o -name "*.cs"      -o -name "*.csproj" -o -name "*.sln" \
    -o -name "*.yml"     -o -name "*.yaml"  -o -name "*.md"   \
    -o -name "*.js"      -o -name "*.sh"    -o -name "*.txt"  \
    -o -name "Dockerfile"
  \) -print)

# ── Text replacements ─────────────────────────────────────────────────────────

echo "Replacing names in source files..."

for f in "${FILES[@]}"; do
  # Skip package-lock.json — will be regenerated
  [[ "$f" == *"package-lock.json" ]] && continue

  perl -i -pe "
    s/MiniStack/$APP_NAME/g;
    s/ministack/$APP_SLUG/g;
    s/com\.yourcompany\.yourapp/$BUNDLE_ID/g;
    s/yourapp/$APP_SLUG/g;
    s/YOUR_USERNAME/$GH_USER/g;
  " "$f"
done

# ── Directory and file renames ────────────────────────────────────────────────

echo "Renaming .NET project directories..."

[[ -d "backend/MiniStack.Api" ]]       && mv "backend/MiniStack.Api"       "backend/$APP_NAME.Api"
[[ -d "backend/MiniStack.Api.Tests" ]] && mv "backend/MiniStack.Api.Tests" "backend/$APP_NAME.Api.Tests"

for f in "backend/$APP_NAME.Api/MiniStack.Api.csproj" \
         "backend/$APP_NAME.Api.Tests/MiniStack.Api.Tests.csproj"; do
  [[ -f "$f" ]] && mv "$f" "${f/MiniStack/$APP_NAME}"
done

for f in *.sln; do
  [[ -f "$f" ]] && mv "$f" "${f/MiniStack/$APP_NAME}"
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
