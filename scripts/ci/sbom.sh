#!/usr/bin/env bash
# Software bill of materials for the deployed admin panel, in CycloneDX and SPDX
# JSON. .github/workflows/sbom.yml runs this on every push to main, the branch
# that deploys, and keeps the two files as that commit's `sbom-<sha>` artifact.
#
# Usage, from the repository root:
#   pnpm install --frozen-lockfile --prod --ignore-scripts
#   bash scripts/ci/sbom.sh
#
# Scope is the production dependency closure: what a --prod install puts in
# node_modules, read from each installed package.json. The lockfile is NOT
# cataloged on purpose - it also lists every development tool, none of which
# ships. The script refuses a node_modules that includes devDependencies for
# the same reason, and fails if a runtime dependency a workspace package
# declares is missing from the result.
#
# ponytail: the lockfile resolves some optional peers from development
# siblings (the prisma CLI and typescript under @prisma/client, @babel/core and
# @playwright/test under next), so this is a superset of what the server loads.
# Tracing .next/**/*.nft.json after a build is the upgrade if that matters.
#
# The tool pin and the download check are the ones Yosemite-Crew uses in
# scripts/security/supply-chain.sh.
set -euo pipefail

SYFT_VERSION="v1.50.0"

# sha256 of each release tarball, pinned here rather than read from the
# checksums file published next to it: a replaced release could replace both,
# it cannot rewrite this table. Refresh when bumping SYFT_VERSION and review the
# new digests like any other change.
pinned_digest() {
  case "$1" in
    syft_darwin_amd64) echo "d11a8c7bc27114853bd7c1e1b2f3be3ddda3a1de17aee585329f04c369341c75" ;;
    syft_darwin_arm64) echo "e32fdb9d47823fa633748a1efca2528fd77c37469ea93c9e40ab835da44e4cce" ;;
    syft_linux_amd64) echo "bf7b29ff57f06da30918266a0e1c2885a8f99784798d1bdb1628886aa015d788" ;;
    syft_linux_arm64) echo "887c57cbcc2d0e8c5c110a4571a3fc7150058b24d74f993ee4663516e5c8ce86" ;;
    *) echo "" ;;
  esac
}

# SBOM_REPO_ROOT is a test hook; everything real derives the root from the
# script's own location.
REPO_ROOT="${SBOM_REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
TOOL_DIR="${REPO_ROOT}/.security-tools/bin"
SBOM_DIR="${REPO_ROOT}/security/sbom"
CDX_SBOM="${SBOM_DIR}/superadmin.cdx.json"
SPDX_SBOM="${SBOM_DIR}/superadmin.spdx.json"
SOURCE_VERSION="${GITHUB_SHA:-$(git -C "${REPO_ROOT}" rev-parse HEAD 2>/dev/null || echo unknown)}"

export PATH="${TOOL_DIR}:${PATH}"

sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

# Install syft at the pinned version unless it is already there. No remote
# script runs: the release tarball is downloaded and its sha256 is checked
# against the table above before anything is unpacked.
ensure_syft() {
  if command -v syft >/dev/null 2>&1; then
    local have
    have="$(syft version 2>/dev/null | awk '/^Version:/ {print $2; exit}')"
    if [ "v${have#v}" = "${SYFT_VERSION}" ]; then
      return 0
    fi
  fi
  echo "installing syft ${SYFT_VERSION} into ${TOOL_DIR}" >&2

  local os arch expected tarball tmp actual
  case "$(uname -s)" in
    Linux) os="linux" ;;
    Darwin) os="darwin" ;;
    *)
      echo "unsupported platform: $(uname -s)" >&2
      exit 1
      ;;
  esac
  case "$(uname -m)" in
    x86_64) arch="amd64" ;;
    aarch64 | arm64) arch="arm64" ;;
    *)
      echo "unsupported architecture: $(uname -m)" >&2
      exit 1
      ;;
  esac

  expected="$(pinned_digest "syft_${os}_${arch}")"
  if [ -z "${expected}" ]; then
    echo "no pinned digest for syft_${os}_${arch} - add it to the table in this script" >&2
    exit 1
  fi

  tarball="syft_${SYFT_VERSION#v}_${os}_${arch}.tar.gz"
  tmp="$(mktemp -d)"
  curl -sSfL --retry 3 --retry-delay 2 -o "${tmp}/${tarball}" \
    "https://github.com/anchore/syft/releases/download/${SYFT_VERSION}/${tarball}"

  actual="$(sha256_file "${tmp}/${tarball}")"
  if [ "${actual}" != "${expected}" ]; then
    echo "DIGEST MISMATCH for ${tarball}: expected ${expected}, got ${actual}" >&2
    rm -rf "${tmp}"
    exit 1
  fi

  mkdir -p "${TOOL_DIR}"
  tar -xzf "${tmp}/${tarball}" -C "${tmp}" syft
  install -m 0755 "${tmp}/syft" "${TOOL_DIR}/syft"
  rm -rf "${tmp}"
}

require_production_install() {
  local modules="${REPO_ROOT}/node_modules/.modules.yaml"
  if [ ! -f "${modules}" ]; then
    echo "node_modules missing - run pnpm install --frozen-lockfile --prod --ignore-scripts first" >&2
    exit 2
  fi
  if ! grep -qE '^  devDependencies: false$' "${modules}"; then
    echo "node_modules includes devDependencies, which do not ship - reinstall with --prod" >&2
    exit 2
  fi
}

# Every runtime dependency a workspace package declares must be in the SBOM,
# so a cataloging change that silently drops them fails here instead.
check_runtime_dependencies() {
  # shellcheck disable=SC2016 # JavaScript, not shell: ${...} are template literals.
  CDX_SBOM="${CDX_SBOM}" REPO_ROOT="${REPO_ROOT}" node -e '
    const fs = require("node:fs");
    const path = require("node:path");
    const { CDX_SBOM, REPO_ROOT } = process.env;
    // File components are the hashed manifests the packages were read from,
    // not packages, so they neither count nor satisfy a dependency.
    const listed = new Set(
      (JSON.parse(fs.readFileSync(CDX_SBOM, "utf8")).components ?? [])
        .filter((c) => c.type !== "file")
        .map((c) => (c.group ? `${c.group}/${c.name}` : c.name))
    );
    const missing = new Set();
    for (const dir of ["apps", "packages"]) {
      const base = path.join(REPO_ROOT, dir);
      if (!fs.existsSync(base)) continue;
      for (const entry of fs.readdirSync(base)) {
        const manifest = path.join(base, entry, "package.json");
        if (!fs.existsSync(manifest)) continue;
        const deps = JSON.parse(fs.readFileSync(manifest, "utf8")).dependencies ?? {};
        for (const [name, range] of Object.entries(deps)) {
          if (!range.startsWith("workspace:") && !listed.has(name)) missing.add(name);
        }
      }
    }
    if (missing.size > 0) {
      console.error(`SBOM is missing runtime dependencies: ${[...missing].sort().join(", ")}`);
      process.exit(1);
    }
    console.log(`SBOM lists ${listed.size} packages, every declared runtime dependency included`);
  '
}

if [ "$#" -ne 0 ]; then
  echo "usage: $0 (no arguments)" >&2
  exit 2
fi

require_production_install
ensure_syft
mkdir -p "${SBOM_DIR}"
# The installed-package cataloger alone: it reads node_modules, and it is the
# only place npm license metadata lives. The default directory catalogers would
# add the lockfile, and with it every development tool.
syft scan "dir:${REPO_ROOT}" \
  --override-default-catalogers javascript-package-cataloger \
  --exclude './**/.next/**' \
  --exclude './**/coverage/**' \
  --exclude './.security-tools/**' \
  --exclude './security/**' \
  --source-name superadmin \
  --source-version "${SOURCE_VERSION}" \
  -o "cyclonedx-json=${CDX_SBOM}" \
  -o "spdx-json=${SPDX_SBOM}"
check_runtime_dependencies
echo "SBOMs written for ${SOURCE_VERSION}: ${CDX_SBOM} and ${SPDX_SBOM}"
