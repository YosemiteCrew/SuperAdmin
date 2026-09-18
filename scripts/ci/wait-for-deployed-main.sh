#!/usr/bin/env bash
# Wait until the deployed panel serves a given commit of `main`.
#
#   bash scripts/ci/wait-for-deployed-main.sh <health-url> <expected-sha>
#
# The one copy of this rule. `deployed-commit.yml` asserts the deploy with it,
# and `admin-e2e.yml` runs it before the deployed specs so they measure the
# build of the commit they report on.
#
# Exit codes:
#   0  the expected sha is being served
#   3  SUPERSEDED: `main` has moved past the expected sha, so this build will
#      never be served; the newer commit's own run makes the assertion
#   1  anything else, including a timeout and an unreadable tip of `main`
#
# Environment: GH_TOKEN and GITHUB_REPOSITORY for the tip lookup.
# TIMEOUT_SECONDS and INTERVAL_SECONDS override the polling window.
set -uo pipefail

if [ "$#" -ne 2 ]; then
  echo "usage: $0 <health-url> <expected-sha>" >&2
  exit 1
fi
HEALTH_URL="$1"
EXPECTED_SHA="$2"

# Observed builds on this app run 3m11s-3m29s from start to VERIFY.
# 12 minutes is roughly 3.5x that, plus room for queueing.
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-720}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-15}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if node "$ROOT/apps/admin/src/ci/assert-deployed.js" \
     --url "$HEALTH_URL" \
     --sha "$EXPECTED_SHA" \
     --timeout "$TIMEOUT_SECONDS" \
     --interval "$INTERVAL_SECONDS"; then
  exit 0
fi

# A newer merge landed while this one was building. Amplify deploys the
# branch, not the commit, so the newer build legitimately replaces this
# one and this commit will never be served. Its own run makes the
# assertion - the last commit in a burst is the one that has to pass.
# Fail closed. Without `-e` a failed `gh` leaves TIP empty, and an empty
# TIP is "not equal to the expected sha" - which would report SUPERSEDED
# on a deploy that really is broken. An unreadable tip means
# supersession could not be established, not that it happened.
TIP="$(gh api "repos/${GITHUB_REPOSITORY:-}/commits/main" --jq .sha || true)"
if ! printf '%s' "$TIP" | grep -Eq '^[0-9a-f]{40}$'; then
  echo "Could not read the current tip of main (got: '${TIP}')."
  echo "Supersession is unestablished, so this stays a failure."
  exit 1
fi

if [ "$TIP" != "$EXPECTED_SHA" ]; then
  echo "SUPERSEDED: main has moved to $TIP since this run started."
  echo "The deploy for that commit is what should be serving, and its own"
  echo "run asserts it. Not failing on a commit that was replaced."
  exit 3
fi

echo "main is still $EXPECTED_SHA, so nothing superseded this deploy."
exit 1
