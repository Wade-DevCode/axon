# Axon product build and release map

This document separates the three user-facing Axon products:

1. Axon CLI
2. Axon Desktop
3. Axon Developer Agent for VS Code

They share core code and UI code, but they do not share one complete release
process. A successful CLI release does not imply that the VS Code extension was
released.

## Terminology

- **Build** creates a local or CI artifact.
- **Release** publishes or uploads an artifact to a distribution channel.
- **Install** puts a released artifact on a target machine and verifies it.

Every release request must name one or more product scopes:

- `cli`
- `desktop`
- `vscode`
- `all`

Do not report "all products released" until every requested product has passed
its own release and installation checks.

## Product summary

| Product | Primary source | Runtime | Version namespace | Official distribution |
| --- | --- | --- | --- | --- |
| CLI | `packages/axon`, `packages/tui` | Compiled Bun executable | `cli-vX.Y.Z`, npm `@wanghuimvp/axon@X.Y.Z` | npm and CLI GitHub Release |
| Desktop | `packages/desktop`, `packages/app`, Node build of `packages/axon` | Electron app with an embedded Axon server sidecar | `desktop-vX.Y.Z` | Desktop GitHub Release |
| VS Code | `sdks/vscode`, `packages/app` | VS Code extension plus external `axon serve` process | `vscode-vX.Y.Z`, extension manifest version | Marketplaces, Actions artifact, VS Code GitHub Release |

The internal monorepo package versions such as `1.17.10` are not the public CLI
or desktop release version. Official workflows inject `AXON_VERSION`.

## Shared code and runtime boundaries

### `packages/axon`

This is the Axon command and server implementation.

- `src/index.ts` is the CLI command entry.
- The default terminal experience uses `packages/tui`.
- `serve` exposes the local HTTP API used by the VS Code extension.
- `script/build.ts` compiles native CLI binaries.
- `script/build-node.ts` builds a Node-targeted server bundle for Desktop.

### `packages/app`

This is the shared browser-style Web UI built with SolidJS and Vite. It includes
session, chat, diff, model, and settings screens.

It is not the terminal TUI:

- CLI terminal UI: `packages/tui`
- CLI browser mode: embeds the `packages/app` build in the CLI binary
- Desktop renderer: builds `packages/app` into the Electron renderer
- VS Code: builds `packages/app` into extension `webview/` assets

### Product runtime relationship

```text
CLI
  packages/axon + packages/tui
  native Bun executable
  optional embedded packages/app Web UI

Desktop
  Electron main/preload/renderer
  packages/app renderer
  packages/axon Node bundle as an internal sidecar

VS Code
  extension host code in sdks/vscode
  packages/app as Webview static assets
  external installed CLI -> axon serve
```

Desktop does not depend on the globally installed npm CLI for its normal local
server. VS Code does depend on an installed CLI, either `axon` on `PATH` or the
path configured by `axon.server.command`.

## Target product architecture

Axon should follow a **shared runtime, separate clients** model:

```text
                         Axon protocol
                              |
                    core runtime + app server
                   /            |             \
             CLI client    Desktop client    VS Code client
          packages/tui     packages/app       packages/app
          terminal input   Electron shell     Webview shell
```

The shared runtime owns:

- authentication and provider access;
- sessions, messages, tools, permissions, and events;
- project and filesystem operations;
- a versioned app-server protocol and capability handshake.

Each client owns only its product-specific shell, lifecycle, packaging, update
channel, and platform integration. Reusing `packages/app` in Desktop and VS Code
is intentional and should continue. Sharing a renderer does not require sharing
a release version or release workflow.

This direction matches the public Codex product boundary: Codex documents its
app-server as the protocol interface that powers rich clients such as its VS
Code extension, while its CLI, IDE extension, and desktop app share
configuration layers. The exact private OpenAI build and publishing pipelines
are not public, so Axon should copy the boundary rather than assume internal
implementation details.

References:

- <https://learn.chatgpt.com/docs/app-server>
- <https://learn.chatgpt.com/docs/codex/cli>
- <https://learn.chatgpt.com/docs/codex/ide>
- <https://learn.chatgpt.com/docs/app>
- <https://learn.chatgpt.com/docs/config-file/config-basic>

### Runtime placement by product

| Product | Runtime placement | Required external installation |
| --- | --- | --- |
| CLI | Runtime linked into the native CLI executable | None |
| Desktop | Exact runtime build embedded as an application sidecar | None |
| VS Code | Extension-managed sidecar selected for the extension-host platform | None by default |

VS Code should no longer require a separately installed global CLI as its
default runtime. The extension should resolve its server in this order:

1. a user-configured `axon.server.command`, for development and managed
   enterprise installations;
2. a cached extension-managed sidecar compatible with the extension protocol;
3. a signed/checksummed sidecar downloaded for the extension-host OS and
   architecture.

This matters for Remote SSH, WSL, and Dev Containers: selection must use the
platform where the extension host runs, not necessarily the desktop operating
system. A download manifest must contain the sidecar version, protocol version,
platform, architecture, URL, SHA-256 checksum, and signature metadata.

### Protocol compatibility

Product versions and protocol compatibility are separate concepts.

Every app-server health or initialization response must expose:

```json
{
  "healthy": true,
  "version": "0.5.75",
  "runtimeVersion": "0.5.75",
  "protocolVersion": 1,
  "capabilities": ["sessions", "diffs", "permissions"]
}
```

`version` remains as a compatibility alias for existing SDK consumers;
`runtimeVersion` is the explicit runtime identity used by the protocol
handshake.

Desktop embeds an exact tested runtime version. VS Code declares a supported
protocol range and manages a compatible sidecar. A client must show a clear
upgrade error before opening a session when the runtime protocol is
incompatible.

Protocol changes follow these rules:

- adding an optional capability is backward-compatible;
- removing or changing an existing field requires a protocol-version change;
- each client tests against the oldest and newest supported protocol version;
- compatibility is checked at runtime, not inferred from similar product
  version numbers.

## Target version and release model

The three products should use independent versions and unambiguous tags:

| Product | Example version | Tag | GitHub Release |
| --- | --- | --- | --- |
| CLI | `0.5.75` | `cli-v0.5.75` | CLI archives and checksums only |
| Desktop | `0.6.0` | `desktop-v0.6.0` | Desktop installers and update metadata only |
| VS Code | `0.1.7` | `vscode-v0.1.7` | Permanent VSIX plus marketplace links |

The existing bare `vX.Y.Z` CLI tags can remain readable for historical
releases, but new automation should use product-prefixed tags. Desktop must not
reuse or require a CLI tag, even when both products contain runtime code from
the same commit.

Each product release records:

- product version;
- source commit SHA;
- embedded or required runtime version;
- supported protocol range;
- platform and architecture;
- artifact SHA-256;
- signing status;
- release channel.

Use `stable`, `beta`, and `nightly` consistently across products. Never make
`latest` carry different meanings in different workflows.

## Target workflow model

The active workflows should have one product responsibility each:

| Workflow | Responsibility | Must not do |
| --- | --- | --- |
| `release-cli.yml` | Publish npm packages and CLI archives | Trigger Desktop or VS Code implicitly |
| `release-desktop.yml` | Build, sign, publish, and verify Desktop installers | Depend on a CLI release tag |
| `release-vscode.yml` | Build, publish, and verify the VS Code extension | Assume a global CLI is already installed |
| `release-suite.yml` | Explicitly coordinate requested product releases | Hide partial failures behind one success |

`release-suite.yml` is optional orchestration, not a fourth release process. It
accepts three explicit product versions, invokes the three reusable workflows,
and reports a result matrix. A CLI-only release remains possible without
Desktop; a VS Code-only release remains possible without npm publication.

GitHub Releases must also be separated by product. Actions artifacts are useful
for diagnostics but expire, so they are not the permanent download location.
In particular, the released VSIX should be attached to its
`vscode-vX.Y.Z` GitHub Release in addition to marketplace publication.

## Required release gates

### CLI

- typecheck and targeted tests from package directories;
- build every declared platform package;
- smoke-test each executable on a native runner;
- verify the npm wrapper selects the correct package;
- clean-install the published version;
- publish checksums and provenance.

### Desktop

- build each advertised OS and architecture on a native runner;
- require code signing for stable Windows and macOS releases;
- require notarization for macOS;
- install, launch, connect to the embedded runtime, update, and uninstall;
- verify update metadata points to the actual Axon release repository;
- publish only platforms that pass the complete gate.

### VS Code

- typecheck, lint, and extension-host integration tests;
- enforce a VSIX file-count and compressed-size budget;
- test activation, sidecar resolution, protocol handshake, and sidebar startup;
- test local plus Remote SSH/WSL or Dev Container placement;
- verify the permanent GitHub VSIX and each requested marketplace after
  publication.

## Migration order

Make the release system predictable before adding more platforms:

1. **Decouple releases.** Remove the Desktop call from `release-cli.yml`,
   rename `publish-vscode.yml` to `release-vscode.yml`, introduce
   product-prefixed tags, and create separate GitHub Releases.
2. **Version the protocol.** Add runtime version, protocol version, and
   capabilities to the app-server handshake; add compatibility checks to
   Desktop and VS Code.
3. **Fix Desktop correctness.** Point the updater at `Wade-DevCode/axon`,
   replace the stale OpenCode WSL installer, require signature verification,
   and test installation.
4. **Make VS Code self-contained.** Add an extension-managed sidecar manifest,
   download/cache/checksum logic, and retain `axon.server.command` only as an
   override.
5. **Expand platforms honestly.** Keep Desktop Windows x64 as the only stable
   target until macOS and Linux have native build, signing, install, and update
   jobs.
6. **Add suite orchestration.** Create `release-suite.yml` only after all three
   individual workflows are independently reliable.

The migration is complete when a release request can name one product, run one
workflow, find one permanent Release, install one artifact, and prove that
product works without inferring success from another product's workflow.

## 1. CLI

### Source and build

Important files:

- `packages/axon/src/index.ts`
- `packages/axon/script/build.ts`
- `packages/axon/script/targets.ts`
- `packages/axon/script/publish.ts`
- `packages/axon/script/postinstall.mjs`
- `packages/axon/script/release.ts`
- `.github/workflows/release-cli.yml`
- `script/release.ps1`
- `script/release.sh`

`build.ts` performs these main operations:

1. Builds `packages/app` and embeds the static Web UI unless explicitly skipped.
2. Installs target-native dependencies needed by OpenTUI and file watchers.
3. Uses Bun compile targets to create native executables.
4. Writes one npm package directory per platform target.
5. Smoke-tests only a compatible binary on the current build runner.

### CLI platform matrix

The all-platform build creates 12 packages:

| OS | Architecture | Variants |
| --- | --- | --- |
| Linux glibc | arm64 | native |
| Linux glibc | x64 | AVX2 and baseline |
| Linux musl | arm64 | native |
| Linux musl | x64 | AVX2 and baseline |
| macOS | arm64 | native |
| macOS | x64 | AVX2 and baseline |
| Windows | arm64 | native |
| Windows | x64 | AVX2 and baseline |

Platform package names follow:

```text
axon-<platform>-<arch>[-baseline][-musl]
```

Examples:

- `axon-windows-x64`
- `axon-windows-x64-baseline`
- `axon-linux-x64-baseline-musl`
- `axon-darwin-arm64`

### npm wrapper selection

The public package is:

```text
@wanghuimvp/axon
```

Its `optionalDependencies` list the platform packages. During installation,
`postinstall.mjs`:

1. Detects OS and CPU architecture.
2. Detects AVX2 on x64.
3. Detects glibc versus musl on Linux.
4. Resolves the preferred package, with baseline and libc fallbacks.
5. Copies or hard-links the selected executable into the wrapper's `bin`.
6. Runs `axon --version` to verify the result.

If the package manager omitted the optional dependency, the postinstall script
tries a targeted npm install of the required platform package.

### Official CLI release

GitHub Actions is the supported release environment.

PowerShell dispatcher:

```powershell
.\script\release.ps1 -Version X.Y.Z -Scope all
```

This dispatches `.github/workflows/release-cli.yml` from clean, pushed `main`.

The all-platform CLI job:

1. Validates the version and npm identity.
2. Builds all 12 platform packages on Ubuntu.
3. Validates the target set and versions.
4. Publishes all platform packages and `@wanghuimvp/axon`.
5. Waits for npm registry consistency.
6. Performs a clean npm installation and checks `axon --version`.
7. Creates or updates GitHub Release `cli-vX.Y.Z`.
8. Uploads 12 archives plus `checksums.txt`.

### Windows-only CLI scope

`-Scope windows` publishes three Windows npm platform packages and a wrapper.
It does not create a Git tag or GitHub Release. npm versions are immutable, so a
later all-platform release must use a different version.

The CLI workflow does not invoke Desktop or VS Code. Windows-only scope is a CLI
test release and does not create a GitHub Release.

### CLI release outputs

- npm wrapper: `@wanghuimvp/axon@X.Y.Z`
- npm platform packages: 12 for an all-platform release
- GitHub Release tag: `cli-vX.Y.Z`
- GitHub assets: platform archives and `checksums.txt`

### CLI installation and completion checks

Install:

```powershell
npm install -g @wanghuimvp/axon@X.Y.Z
```

Verify:

```powershell
axon --version
npm list -g @wanghuimvp/axon --depth=0
```

A CLI release is complete only after:

- the workflow succeeds;
- npm `latest` is the intended version;
- the wrapper exposes the full expected platform dependency set;
- the GitHub Release and checksums exist;
- a clean installation returns the intended version.

## 2. Desktop

### Source and runtime

Important files:

- `packages/desktop/src/main`
- `packages/desktop/src/preload`
- `packages/desktop/src/renderer`
- `packages/desktop/electron.vite.config.ts`
- `packages/desktop/electron-builder.config.ts`
- `packages/desktop/scripts/prepare.ts`
- `packages/axon/script/build-node.ts`
- `.github/workflows/release-desktop.yml`

`packages/desktop/scripts/prebuild.ts` builds `packages/axon/src/node.ts` for
Node and places it under `packages/axon/dist/node`. Electron Vite resolves that
bundle as `virtual:axon-server`.

At runtime, Electron:

1. Starts an internal utility-process sidecar.
2. Loads the embedded Axon server bundle.
3. Binds the server to a random loopback port with a random password.
4. Starts the `packages/app` renderer.
5. Connects the renderer to the internal server.

The normal Desktop local server therefore does not launch the npm-installed CLI.

Windows-only WSL connections are a separate feature. They expect an Axon CLI
inside each selected WSL distribution.

### Declared Desktop package targets

`electron-builder.config.ts` declares:

| OS | Declared formats |
| --- | --- |
| Windows | NSIS `.exe` |
| macOS | `.dmg` and `.zip` |
| Linux | `.AppImage`, `.deb`, `.rpm` |

The source contains architecture-aware native dependencies and supports native
builds for x64 and arm64 where the CI matrix exists.

Declared configuration is not the same as an active official release.

### Active official Desktop release

The active `.github/workflows/release-desktop.yml` contains one job:

```text
windows-2025 -> Windows x64 -> NSIS installer
```

It currently publishes only Windows x64. There is no active official macOS,
Linux, or Windows arm64 Desktop job.

The old mixed-product workflow is stored in
`.github/workflows-legacy/publish.yml`. GitHub Actions does not load workflows
from that directory.

### Desktop release trigger and version

`release-desktop.yml` is independent. It can run from:

- a `desktop-vX.Y.Z` tag;
- a manual dispatch with an explicit version;
- `release-suite.yml` with an explicit Desktop version.

It builds the triggering commit, creates or updates the
`desktop-vX.Y.Z` GitHub Release, and uploads only Desktop assets. It does not
require a CLI tag or CLI Release.

Desktop is the only product that marks its GitHub Release as repository
`Latest`. CLI and VS Code releases explicitly set `latest=false`, preserving
the Electron updater feed when another product is published later.

### Desktop release outputs

Current Windows x64 outputs:

- `axon-desktop-win-x64.exe`
- `axon-desktop-win-x64.exe.blockmap`
- `latest.yml`

They are GitHub Release assets, not Actions artifacts and not npm packages.

### Desktop signing

Stable Windows releases require all Azure Trusted Signing credentials. The
workflow fails before building when any signing value is missing and verifies
that the final installer has a valid Authenticode signature before publication.

The historical `v0.5.74` installer remains unsigned; the new gate applies to
future `desktop-vX.Y.Z` releases.

### Desktop updater

The Electron updater is enabled for packaged non-development builds and reads
the generated update metadata.

The production `electron-builder` provider points to `Wade-DevCode/axon`.
Desktop releases are explicitly marked as the repository Latest Release so
`electron-updater` resolves the corresponding `latest.yml`.

### WSL integration defect

The Windows Desktop WSL installer invokes:

```text
npm install -g @wanghuimvp/axon@latest
```

Desktop and CLI have independent product versions, so WSL currently installs
the npm `latest` CLI instead of incorrectly treating the Desktop version as a
CLI version. The selected WSL distribution must already provide Node.js and
npm. A protocol-compatible sidecar resolver will replace this temporary
selection rule; WSL integration testing remains required before it is a release
completion claim.

### Desktop installation and completion checks

Install by running the released Windows installer.

A Desktop release is complete only after:

- the Desktop workflow succeeds;
- installer, blockmap, and update metadata exist on the intended Release;
- the installer version is correct;
- Authenticode status is explicitly checked;
- the updater points to the repository that actually hosts `latest.yml`;
- an installed application launches and its embedded local server becomes
  healthy.

## 3. VS Code extension

### Source and runtime

Important files:

- `sdks/vscode/src/extension.ts`
- `sdks/vscode/src/server.ts`
- `sdks/vscode/src/sidebar.ts`
- `sdks/vscode/script/build-webview.ts`
- `sdks/vscode/script/publish`
- `sdks/vscode/script/release`
- `sdks/vscode/package.json`
- `sdks/vscode/.vscodeignore`
- `.github/workflows/release-vscode.yml`

The extension:

1. Registers the `axon.sidebar` Webview view.
2. Requires an open VS Code folder.
3. Resolves `axon` or `axon.server.command`.
4. Allocates a loopback port and random password.
5. Starts `axon serve` in the workspace folder.
6. Waits for `/global/health`.
7. Loads the packaged `packages/app` Webview.
8. Passes the server URL, Basic auth token, route, and model state to the
   Webview.

On Windows, it resolves the npm `axon.cmd` wrapper to the native `axon.exe` when
possible. On other platforms it launches the configured command directly.

### VS Code platform model

The VSIX is platform-independent. There is one extension package, not separate
Windows, macOS, and Linux VSIX files.

Actual runtime support depends on a compatible CLI in the extension host
environment:

- local Windows VS Code needs a Windows CLI;
- local macOS VS Code needs a macOS CLI;
- local Linux VS Code needs a Linux CLI;
- Remote SSH, WSL, or Dev Container placement may require the CLI in the remote
  extension host rather than on the Windows host.

### Local VSIX build

From `sdks/vscode`:

```bash
bun run package
npx @vscode/vsce package --no-dependencies --skip-license
```

`bun run package`:

1. Builds `packages/app` with `AXON_VSCODE=true`.
2. Writes Webview static assets.
3. Typechecks and lints extension code.
4. Bundles the extension host entry as `dist/extension.js`.

`vsce package` then applies `.vscodeignore` and creates the VSIX.

### VS Code release version

The extension has an independent version in `sdks/vscode/package.json`.

Its release tag format is:

```text
vscode-vX.Y.Z
```

The package version and tag version must match.

`sdks/vscode/script/release` reads the committed manifest version, requires a
clean pushed `main`, rejects an existing tag, and pushes the exact matching tag.
The manifest version must be bumped and committed first.

### VS Code workflow behavior

`.github/workflows/release-vscode.yml` has three entry modes.

Manual `workflow_dispatch`:

- builds the extension;
- packages a VSIX;
- uploads an Actions artifact;
- does not publish unless `publish=true` and an explicit matching version is
  supplied.

Push of `vscode-vX.Y.Z`:

- validates tag versus manifest version;
- builds and packages the VSIX;
- enforces a maximum of 250 files and 8 MiB compressed size;
- uploads a versioned Actions artifact;
- publishes to VS Code Marketplace with `VSCE_PAT`;
- publishes to Open VSX when `OPENVSX_TOKEN` is configured;
- attaches the VSIX permanently to the `vscode-vX.Y.Z` GitHub Release.

`release-suite.yml` can invoke the same workflow with an explicit version and
publication enabled.

### VS Code installation and completion checks

Install from Marketplace or from a downloaded VSIX:

```powershell
code --install-extension path\to\axon-developer-agent-X.Y.Z.vsix --force
code --list-extensions --show-versions
```

A VS Code release is complete only after:

- the tag matches the committed manifest version;
- the tagged workflow succeeds;
- the Actions VSIX artifact exists;
- VS Code Marketplace exposes the intended version;
- Open VSX exposes the intended version when it is part of the requested scope;
- the installed extension starts the intended CLI and its sidebar connects.

## Combined release decision table

| Requested product | Required workflow | Required version/tag | Completion proof |
| --- | --- | --- | --- |
| CLI | `release-cli.yml` | CLI `X.Y.Z`, tag `cli-vX.Y.Z` for all-platform | npm, 12 packages, archives, checksums, clean install |
| Desktop | `release-desktop.yml` | Desktop `X.Y.Z`, tag `desktop-vX.Y.Z` | installer metadata, valid signature, installed launch |
| VS Code | `release-vscode.yml` | Manifest `X.Y.Z`, tag `vscode-vX.Y.Z` | budgeted VSIX, permanent asset, marketplace version |
| All three | `release-suite.yml` | Three explicit product versions | Three independent job results and every check above |

## Current verified state on 2026-07-29

### CLI

- Latest npm wrapper: `@wanghuimvp/axon@0.5.74`
- Wrapper contains all 12 expected optional platform dependencies.
- GitHub Release: `v0.5.74`

### Desktop

- Latest fork release asset: `axon-desktop-win-x64.exe` on `v0.5.74`
- Active official platform: Windows x64 only
- `v0.5.74` installer: unsigned
- Production update-provider repository: `Wade-DevCode/axon`

### VS Code

- VS Code Marketplace: `wanghuimvp.axon-developer-agent@0.1.6`
- Open VSX: extension not found
- Optimization commit `bad615c4d` is on `main` but not in
  `vscode-v0.1.6`
- The optimized local VSIX contains 197 files and is about 7.5 MB.
- The previous Marketplace-era package contained 865 files and was about
  7.91 MB.
- The optimization materially reduced file count, but large JavaScript chunks
  remain and total compressed size changed only modestly.

## Known release-system gaps

1. Active Desktop CI still releases only Windows x64.
2. The new required Desktop signing gate has not yet passed a live release.
3. Desktop WSL npm installation still needs runtime coverage on supported
   distributions.
4. VS Code still depends on an externally installed Axon CLI; the
   extension-managed sidecar is not implemented yet.
5. Open VSX currently has no Axon extension.
6. Large JavaScript chunks remain inside the VSIX despite the enforced package
   budget.

## Implementation status

Completed in the release-system decoupling change:

- CLI, Desktop, and VS Code have independent workflows and product tags.
- CLI no longer triggers Desktop.
- each product has its own permanent GitHub Release;
- only Desktop is marked as repository Latest for updater compatibility;
- VS Code publication reuses the validated VSIX and enforces package budgets;
- stable Desktop publication requires and verifies signing;
- the production updater repository and WSL npm package identity are Axon-owned;
- the mixed upstream workflow is outside the active Actions directory;
- `release-suite.yml` provides explicit three-product orchestration.

Completed in the app-server protocol change:

- `/global/health` exposes runtime version, protocol version, and capabilities;
- protocol version `1` advertises `sessions`, `diffs`, and `permissions`;
- Desktop validates the embedded and WSL sidecar handshake before accepting the
  server;
- VS Code validates its external CLI sidecar handshake before loading the
  sidebar;
- network startup failures remain retryable, while protocol mismatches fail
  immediately with a product-specific upgrade message;
- the generated JavaScript SDK includes the handshake fields.

## Required operating rule

Before any future external build or release:

1. Inspect the changed files and identify affected products.
2. State the product scopes and their independent versions.
3. Distinguish local validation from publication.
4. Run the product-specific workflow or workflows.
5. Monitor every requested workflow to a terminal result.
6. Verify the actual distribution channel, not only the Actions status.
7. Install and check each requested product separately.
8. Report partial completion by product; never collapse it into "all done."
