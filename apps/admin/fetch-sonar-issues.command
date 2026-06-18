#!/bin/bash
# Double-click (or run) to fetch unresolved SonarCloud issues into sonar-issues.json.
#
# The token is NEVER hardcoded here. It is read from a gitignored .sonar-token
# file in this folder, or from the SONAR_TOKEN environment variable.
# Generate a token at https://sonarcloud.io/account/security and either:
#   echo "<your-token>" > apps/admin/.sonar-token
# or:
#   export SONAR_TOKEN=<your-token>

cd "$(dirname "$0")" || exit 1

TOKEN="${SONAR_TOKEN:-$(cat .sonar-token 2>/dev/null)}"
if [ -z "$TOKEN" ]; then
  echo "ERROR: No SonarCloud token found."
  echo "Create apps/admin/.sonar-token containing just your token, or export SONAR_TOKEN."
  echo
  echo "Press any key to close."
  read -r -n 1
  exit 1
fi

# By default this only FETCHES the latest results (read-only). CI owns the
# authoritative analysis. Pass --scan to also run a local scan first, which
# requires a token with "Execute Analysis" permission and analyzes as the main
# branch — normally you don't want this locally.
if [ "${1:-}" = "--scan" ]; then
  echo "Running local analysis (pnpm sonar:full)... this can take a few minutes."
  if SONAR_TOKEN="$TOKEN" pnpm sonar:full; then
    echo "Analysis uploaded. Fetching refreshed results..."
  else
    echo "WARNING: scan failed — fetching the last available results instead."
  fi
  echo
fi

echo "Fetching SonarCloud issues for YosemiteCrew_SuperAdmin..."
curl -sS \
  "https://sonarcloud.io/api/issues/search?componentKeys=YosemiteCrew_SuperAdmin&resolved=false&ps=500&p=1" \
  -H "Authorization: Bearer $TOKEN" \
  -o sonar-issues.json && echo "Saved to: $(pwd)/sonar-issues.json" || echo "curl failed."

echo
echo "Press any key to close."
read -r -n 1
