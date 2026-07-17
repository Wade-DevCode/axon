#!/usr/bin/env bash
set -euo pipefail

mode="publish"
output_dir=""
bump="patch"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build-only)
      mode="build"
      output_dir="$2"
      shift 2
      ;;
    --bump)
      bump="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ "$bump" != "patch" && "$bump" != "minor" && "$bump" != "major" ]]; then
  echo "Bump must be patch, minor, or major." >&2
  exit 1
fi

if ! command -v bun >/dev/null || [[ "$(command -v bun)" == /mnt/* ]]; then
  install_dir="${HOME}/.bun"
  archive="$(mktemp)"
  extract_dir="$(mktemp -d)"
  trap 'rm -f "$archive"; rm -rf "$extract_dir"' EXIT
  curl -fsSL -o "$archive" "https://github.com/oven-sh/bun/releases/download/bun-v1.3.14/bun-linux-x64.zip"
  if command -v unzip >/dev/null; then
    unzip -q "$archive" -d "$extract_dir"
  else
    python3 -m zipfile -e "$archive" "$extract_dir"
  fi
  mkdir -p "$install_dir/bin"
  install -m 755 "$extract_dir/bun-linux-x64/bun" "$install_dir/bin/bun"
fi

export PATH="${HOME}/.bun/bin:${PATH}"

if [[ "$mode" == "build" && -z "$output_dir" ]]; then
  echo "--build-only requires an output directory." >&2
  exit 1
fi

bun install --frozen-lockfile
(cd packages/app && bun install)
OPENCODE_CHANNEL=latest OPENCODE_BUMP="$bump" bun run --cwd packages/opencode script/build.ts

if [[ "$mode" == "publish" ]]; then
  npm whoami >/dev/null
  OPENCODE_CHANNEL=latest OPENCODE_BUMP="$bump" bun run --cwd packages/opencode script/publish.ts
  exit 0
fi

rm -rf "$output_dir"
mkdir -p "$(dirname "$output_dir")"
cp -a packages/opencode/dist "$output_dir"
