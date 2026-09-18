# shellcheck shell=bash
#
# Resolves the SonarCloud token for this app. Sourced by sonar-local.sh and
# fetch-sonar-issues.command so the precedence lives in exactly one place.
#
# Order: SONAR_TOKEN env var, then the macOS login Keychain (generic password
# with service name "sonar-token"), then a gitignored .sonar-token file beside
# this script. The file is the legacy path and is only still read so an
# unmigrated checkout keeps working; prefer the Keychain.
#
# Add the Keychain item with:
#   security add-generic-password -a "$USER" -s sonar-token -w <your-token> -U
#
# The Keychain read is bounded to 5 seconds. Over ssh, or in any session where
# the login keychain is locked, `security` can block on a UI prompt that will
# never be answered; without the bound that hangs the whole script.

# Prints the Keychain value on stdout, and nothing at all when there is no item,
# no `security` binary, or the read did not finish inside the bound. Callers
# cannot tell those three apart, and do not need to: each one means "ask the
# next source".
_sonar_token_from_keychain() {
  # mktemp creates the file 0600, and it is removed on every path out of here.
  _kc_out="$(mktemp)"
  ( security find-generic-password -s sonar-token -w >"$_kc_out" 2>/dev/null ) &
  _kc_pid=$!
  _kc_i=0
  while kill -0 "$_kc_pid" 2>/dev/null && [ "$_kc_i" -lt 5 ]; do
    sleep 1
    _kc_i=$((_kc_i + 1))
  done
  if kill -0 "$_kc_pid" 2>/dev/null; then
    kill -9 "$_kc_pid" 2>/dev/null
    rm -f "$_kc_out"
    return 1
  fi
  wait "$_kc_pid" 2>/dev/null
  cat "$_kc_out"
  rm -f "$_kc_out"
}

# Prints the token on stdout, or nothing at all if no source has one. Never
# fails, so a caller running under `set -e` can assign from it directly.
sonar_token() {
  if [ -n "${SONAR_TOKEN:-}" ]; then
    printf '%s' "$SONAR_TOKEN"
    return 0
  fi
  _sonar_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  _sonar_tok="$(_sonar_token_from_keychain || true)"
  if [ -z "$_sonar_tok" ]; then
    _sonar_tok="$(cat "$_sonar_dir/.sonar-token" 2>/dev/null || true)"
  fi
  printf '%s' "$_sonar_tok"
}
