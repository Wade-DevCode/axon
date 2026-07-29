# Axon CLI releases

This file documents the CLI dispatcher in detail. For the boundaries between
CLI, Desktop, and the VS Code extension, including their independent version
and verification rules, see [Axon product build and release map](product-release-process.md).

GitHub Actions is the only supported environment for official CLI releases. The workflow provides credentials and a clean Linux runner; `packages/axon/script/release.ts` owns version validation, target selection, builds, npm publication, verification, and GitHub Release assets.

PowerShell and Shell scripts only dispatch the workflow. They do not build binaries, invoke WSL, copy `dist`, or run `npm publish` locally.

## Repository setup

Configure the following GitHub Actions secret:

- `NPM_TOKEN`: npm token with write access to `@wanghuimvp/axon` and the unscoped `axon-*` platform packages. Token-based publishing must be allowed to bypass 2FA.

The workflow uses the repository `GITHUB_TOKEN` to create an all-platform GitHub Release.

## Windows-only npm release

Use this scope for a Windows test release. It publishes the three Windows platform packages and `@wanghuimvp/axon`, but does not create a Git tag or GitHub Release.

npm versions are immutable. After a Windows-only release, use a new version for the later all-platform release so the wrapper can declare all 12 platform packages.

From PowerShell:

```powershell
.\script\release.ps1 -Version 0.5.47 -Scope windows
```

From Bash:

```bash
bash script/release.sh --version 0.5.47 --scope windows
```

## All-platform release

The all-platform scope publishes all 12 platform packages and the wrapper,
verifies a clean installation, then creates GitHub Release `cli-vX.Y.Z` with 12
archives and `checksums.txt`. It does not release Desktop or VS Code.

From PowerShell:

```powershell
.\script\release.ps1 -Version 0.5.47 -Scope all
```

From Bash:

```bash
bash script/release.sh --version 0.5.47 --scope all
```

Pushing a `cli-v*.*.*` tag also runs an all-platform release. Do not push a
release tag for a Windows-only test release.

## Direct workflow dispatch

The local scripts are optional. The equivalent GitHub CLI command is:

```bash
gh workflow run release-cli.yml --repo Wade-DevCode/axon --ref main -f version=0.5.47 -f scope=windows
```

Monitor the run with:

```bash
gh run watch --repo Wade-DevCode/axon
```

## Local verification

Local builds are never releases and do not require npm credentials:

```powershell
$env:AXON_VERSION = "0.5.47-local"
$env:AXON_CHANNEL = "local"
bun run --cwd packages/axon script/build.ts --single --skip-install
```

The legacy mixed-product workflow is retained under
`.github/workflows-legacy/publish.yml`, outside the active GitHub Actions
directory. Do not use it for Axon product releases.
