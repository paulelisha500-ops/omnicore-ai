#!/usr/bin/env bash
# Publish the built app (frontend/dist) to the gh-pages branch, which GitHub
# Pages serves at https://paulelisha500-ops.github.io/omnicore-ai/.
# Run from the project root after `cd frontend && npm run build`.
set -euo pipefail

DIST="frontend/dist"
[ -f "$DIST/index.html" ] || { echo "Build first: cd frontend && npm run build"; exit 1; }

TMP="$(mktemp -d)"
cp -r "$DIST"/. "$TMP"/
touch "$TMP/.nojekyll"   # serve files as-is (no Jekyll processing)

cd "$TMP"
git init -q -b gh-pages
git config core.autocrlf false
git add -A
git -c user.name="${GIT_AUTHOR_NAME:-omnicore-deploy}" -c user.email="${GIT_AUTHOR_EMAIL:-deploy@users.noreply.github.com}" \
  commit -q -m "Deploy OmniCore AI static build"
git push -f "$(cd - >/dev/null && git remote get-url origin)" gh-pages
echo "Published to gh-pages"
