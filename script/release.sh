#!/usr/bin/env bash
set -euo pipefail

version=""
scope="windows"
dry_run="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      version="$2"
      shift 2
      ;;
    --scope)
      scope="$2"
      shift 2
      ;;
    --dry-run)
      dry_run="true"
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$ ]]; then
  echo "--version must be a valid release version" >&2
  exit 1
fi

if [[ "$scope" != "windows" && "$scope" != "all" ]]; then
  echo "--scope must be windows or all" >&2
  exit 1
fi

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -n "$(git -C "$repo" status --porcelain)" ]]; then
  echo "Commit local changes before dispatching a release." >&2
  exit 1
fi

branch="$(git -C "$repo" branch --show-current)"
if [[ "$branch" != "main" ]]; then
  echo "CLI releases must be dispatched from main, not $branch." >&2
  exit 1
fi

remote="$(git -C "$repo" ls-remote origin refs/heads/main | awk '{ print $1 }')"
if [[ "$(git -C "$repo" rev-parse HEAD)" != "$remote" ]]; then
  echo "Push main before dispatching a release." >&2
  exit 1
fi

command=(gh workflow run release-cli.yml --repo Wade-DevCode/axon --ref main -f "version=$version" -f "scope=$scope")
if [[ "$dry_run" == "true" ]]; then
  printf '%q ' "${command[@]}"
  printf '\n'
  exit 0
fi

command -v gh >/dev/null || {
  echo "GitHub CLI is required. Install gh and run gh auth login." >&2
  exit 1
}

"${command[@]}"
echo "Dispatched Axon $version ($scope)."
echo "Monitor with: gh run watch --repo Wade-DevCode/axon"
