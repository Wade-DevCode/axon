<div align="center">

# AXON

**Developer Agent for the Terminal**

Turn repository-scale work into reviewed code, directly from your shell.

[![npm version](https://img.shields.io/npm/v/@wanghuimvp/axon?style=flat&logo=npm&label=npm)](https://www.npmjs.com/package/@wanghuimvp/axon)
[![GitHub release](https://img.shields.io/github/v/release/Wade-DevCode/axon?style=flat&logo=github&label=release)](https://github.com/Wade-DevCode/axon/releases/latest)
[![platforms](https://img.shields.io/badge/platforms-Windows%20%7C%20macOS%20%7C%20Linux-3b82f6)](#platforms)
[![license](https://img.shields.io/badge/license-MIT-22c55e)](./LICENSE)

</div>

Axon is a terminal-native coding agent built for real development work: exploring unfamiliar repositories, planning changes, editing code, running tools, reviewing diffs, debugging failures, and coordinating larger tasks. It combines a focused TUI with provider choice, purpose-built agents, MCP, plugins, LSP integration, and headless automation.

## Quick start

Install the CLI with npm, connect a model provider, and open Axon inside a repository:

```bash
npm install -g @wanghuimvp/axon
cd your-project
axon providers login
axon
```

Axon automatically installs the correct binary for Windows, macOS, or Linux on x64 and ARM64 systems.

## Why Axon

|                          |                                                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- |
| **Terminal first**       | A responsive TUI with sessions, inline diffs, themes, mouse support, and keyboard-driven workflows.             |
| **Task-specific agents** | Switch between implementation, planning, Q&A, debugging, review, and orchestration without leaving the session. |
| **Provider choice**      | Use the model provider that fits the repository, policy, latency, and cost requirements of the task.            |
| **Repository tools**     | Read and edit files, search code, run shell commands, inspect diagnostics, and use language servers in context. |
| **Extensible runtime**   | Add MCP servers, plugins, custom agents, commands, skills, tools, and themes.                                   |
| **Multiple surfaces**    | Work interactively in the TUI or use `run`, `serve`, `web`, and ACP for automation and integrations.            |

## Agent modes

Press `Tab` in the TUI to move through visible primary agents, or select one explicitly with `--agent`.

| Agent          | Best for                                                             |
| -------------- | -------------------------------------------------------------------- |
| `build`        | Default development work using your configured permissions.          |
| `plan`         | Read-only analysis and implementation planning before changes begin. |
| `code`         | Focused implementation, refactoring, test execution, and completion. |
| `ask`          | Read-only questions and explanations about the repository.           |
| `debug`        | Systematic diagnosis and root-cause fixes.                           |
| `review`       | Reviewing diffs, branches, and pull-request feedback.                |
| `orchestrator` | Splitting complex work into coordinated subtasks.                    |

Axon also includes specialized subagents for repository exploration and delegated work. Custom agents can be created with `axon agent create`.

## Common workflows

```bash
# Open the full TUI in the current repository
axon

# Run a focused task without opening the TUI
axon run "find the failing tests and fix the root cause"

# Continue the most recent session
axon --continue

# Start the minimal interactive interface
axon --mini

# Browse and connect model providers
axon providers login
axon models

# Configure external tools
axon mcp add
axon plugin <module>

# Run as a service or through an editor protocol
axon serve
axon web
axon acp
```

Run `axon --help` for the complete command reference.

## Configuration

Use Axon-native names for new projects:

- `axon.json` or `axon.jsonc` for project configuration
- `.axon/` for project-scoped agents, commands, plugins, skills, and tools
- the platform-specific Axon config directory for global configuration

Run the following command to see the exact config, data, cache, state, and log paths on the current machine:

```bash
axon debug paths
```

Axon remains compatible with `opencode.json`, `opencode.jsonc`, and `.opencode/`. When both forms exist, Axon-named configuration takes precedence.

## Platforms

The npm installer and each GitHub Release include native binaries for:

| Operating system | Architectures | Additional builds  |
| ---------------- | ------------- | ------------------ |
| Windows          | x64, ARM64    | x64 baseline       |
| macOS            | x64, ARM64    | x64 baseline       |
| Linux            | x64, ARM64    | x64 baseline, musl |

- Install or update through npm: `npm install -g @wanghuimvp/axon@latest`
- Update an existing installation: `axon upgrade`
- Download standalone archives and checksums from [GitHub Releases](https://github.com/Wade-DevCode/axon/releases/latest)

## Build from source

The repository uses [Bun](https://bun.sh) 1.3.14.

```bash
git clone https://github.com/Wade-DevCode/axon.git
cd axon
bun install
bun dev
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) before sending a change.

## Security

Axon can read files, modify code, and execute commands with the permissions you grant. Its permission system provides control and confirmation, but it is not an operating-system sandbox. Use a container or virtual machine when you need strong isolation, and protect an exposed `axon serve` instance with authentication and network controls.

See [SECURITY.md](./SECURITY.md) for the threat model and reporting process.

## Project lineage

Axon is built from [OpenCode](https://github.com/anomalyco/opencode) and remains close to its configuration and extension ecosystem. General engine improvements should be contributed upstream when possible; Axon-specific branding and integration work belongs in this repository.

OpenCode and Axon are distributed under the [MIT License](./LICENSE). Credit and thanks go to the OpenCode maintainers and contributors whose work forms the foundation of this project.
