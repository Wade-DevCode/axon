<div align="center">

# Axon

**A fast, open-source AI coding agent for your terminal.**

[![npm](https://img.shields.io/npm/v/@wanghuimvp/axon?style=flat-square&color=cb3837&logo=npm)](https://www.npmjs.com/package/@wanghuimvp/axon)
[![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)

</div>

---

Axon is a terminal-native AI coding agent — a rich TUI, multi-provider models, plugins, MCP, and LSP, all driven from your shell. It is a fork of [opencode](https://github.com/anomalyco/opencode) and stays configuration-compatible with it.

## Features

- **Rich terminal UI** — interactive sessions, inline diffs, themes, mouse + keyboard.
- **Multiple modes** — press `Tab` to switch:
  | Mode | What it does |
  | --- | --- |
  | `build` | Full-access coding (default) |
  | `plan` | Read-only planning — no edits |
  | `ask` | Read-only Q&A about the codebase |
  | `debug` | Systematic root-cause debugging |
  | `orchestrator` | Breaks big tasks into coordinated subtasks |
- **Multi-provider models** — bring your own key, or start with the built-in free models.
- **Extensible** — plugins, custom agents, MCP servers, and LSP integration.
- **Headless server** — `axon serve` for API access and scripting.

## Install

### npm

```bash
npm i -g @wanghuimvp/axon
axon
```

> Windows (x64) is published today. Builds for macOS and Linux are on the way — until then, run from source.

### From source

Requires [Bun](https://bun.sh) 1.3+.

```bash
git clone https://github.com/Wade-DevCode/axon.git
cd axon
bun install
bun run --cwd packages/opencode --conditions=browser src/index.ts
```

## Usage

```bash
axon                    # start the TUI in the current project
axon run "<message>"    # non-interactive run
axon models             # list available models
axon auth login         # add a provider / API key
axon serve              # headless server
axon --help             # all commands
```

Inside the TUI, press `Tab` to switch modes.

## Configuration

Axon reads `axon.json` / `axon.jsonc` and `.axon/`, and — for back-compat — `opencode.json` / `opencode.jsonc` and `.opencode/` (the `axon.*` form wins when both exist). Global config lives in `~/.config/axon/`.

Because Axon tracks opencode closely, the upstream [config reference](https://opencode.ai/docs) applies to most options.

## Credits

Axon is built on [opencode](https://github.com/anomalyco/opencode) by Anomaly, used under the MIT License — full credit to the opencode authors.

## License

MIT — see [LICENSE](./LICENSE).
