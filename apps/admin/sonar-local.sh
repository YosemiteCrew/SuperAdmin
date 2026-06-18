#!/usr/bin/env bash
#
# sonar-local.sh — local pre-PR quality pipeline for apps/admin.
#
# Runs the full gate and, only if every step passes, submits a SonarCloud scan.
# The token is read from the SONAR_TOKEN env var or a gitignored .sonar-token
# file in this folder — it is NEVER hardcoded (this repo is public).
#
#   ./sonar-local.sh            # full run (incl. build)
#   ./sonar-local.sh --no-build # skip the build step (faster)
#
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SONAR_TOKEN="${SONAR_TOKEN:-$(cat .sonar-token 2>/dev/null || true)}"
[ -n "$SONAR_TOKEN" ] || {
  echo "SONAR_TOKEN is empty. Set it, or create apps/admin/.sonar-token with your token." >&2
  exit 1
}
export SONAR_TOKEN

RUN_BUILD=1
[ "${1:-}" = "--no-build" ] && RUN_BUILD=0

step() { printf '\n==> %s\n' "$1"; }

step "[1/5] Lint"
pnpm run lint

step "[2/5] Type-check"
pnpm run type-check

step "[3/5] Tests + coverage"
pnpm run test:coverage

if [ "$RUN_BUILD" = 1 ]; then
  step "[4/5] Build"
  pnpm run build
else
  step "[4/5] Build (skipped via --no-build)"
fi

step "[5/5] SonarCloud scan"
pnpm run sonar

printf '\nDone. Quality gate: https://sonarcloud.io/project/overview?id=YosemiteCrew_SuperAdmin\n'
