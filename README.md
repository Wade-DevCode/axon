# Axon

A fast, open-source AI coding agent for the terminal.

Axon is a rebranded fork of [opencode](https://github.com/anomalyco/opencode) (MIT). It keeps opencode's engine — multi-provider models, plugins, MCP, LSP, and a rich TUI — and stays configuration-compatible, so existing `opencode.json` / `.opencode/` projects work unchanged.

## Status

Early fork. The published npm package (`@wanghuimvp/axon`) is still in progress — for now, run from source.

## Install

### From source (current)

Requires [Bun](https://bun.sh) 1.3+.

```bash
git clone https://github.com/Wade-DevCode/axon.git
cd axon
bun install
# launch the CLI/TUI
bun run --cwd packages/opencode --conditions=browser src/index.ts
```

### npm (coming soon)

```bash
npm i -g @wanghuimvp/axon
axon
```

## Usage

```bash
axon                      # start the TUI in the current project
axon run "<message>"      # non-interactive run
axon models               # list available models
axon auth login           # configure a provider
axon serve                # headless server
axon --help               # all commands
```

## Configuration

Axon reads `axon.json` / `axon.jsonc` and `.axon/`, and — for back-compat — `opencode.json` / `opencode.jsonc` and `.opencode/`. When both are present, the `axon.*` form wins. Global config lives in `~/.config/axon/`.

Because Axon tracks opencode closely, the upstream [configuration docs](https://opencode.ai/docs) apply to most options.

## Credits

Axon is built on [opencode](https://github.com/anomalyco/opencode) by Anomaly, used under the MIT License. All upstream credit goes to the opencode authors.

## License

MIT — see [LICENSE](./LICENSE).
