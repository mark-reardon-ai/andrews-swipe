#!/usr/bin/env bash
# Build and publish dist/ to the gh-pages branch (GitHub Pages "Deploy from a branch").
# Usage: scripts/deploy-gh-pages.sh <owner> <repo>     e.g. scripts/deploy-gh-pages.sh mark-reardon-ai andrews-swipe
# Uses the git credentials already on this machine (gh auth); no tokens are stored in the repo.
set -euo pipefail
OWNER=${1:?owner}; REPO=${2:?repo}
cd "$(dirname "$0")/.."
npm test
OG_BASE="https://${OWNER}.github.io/${REPO}/" npm run build
touch dist/.nojekyll
TMP=$(mktemp -d)
cp -r dist/. "$TMP"/
cd "$TMP"
git init -q -b gh-pages
git -c user.name="deploy" -c user.email="deploy@localhost" add -A
git -c user.name="deploy" -c user.email="deploy@localhost" commit -qm "Deploy $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git push -q -f "https://github.com/${OWNER}/${REPO}.git" gh-pages
echo "Deployed to https://${OWNER}.github.io/${REPO}/"
