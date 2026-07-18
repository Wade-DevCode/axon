# Axon

**Developer Agent for the Terminal**

Axon is a terminal-native coding agent for exploring repositories, planning changes, editing code, running tools, reviewing diffs, debugging failures, and coordinating larger tasks.

## Install

```bash
npm install -g @wanghuimvp/axon
cd your-project
axon providers login
axon
```

The npm installer selects the native binary for Windows, macOS, or Linux on x64 and ARM64 systems.

## Core workflows

```bash
axon                              # open the TUI
axon run "fix the failing tests"  # run a non-interactive task
axon --continue                   # continue the latest session
axon models                       # list available models
axon providers login              # connect a model provider
axon serve                        # start the headless server
axon --help                       # show all commands
```

Axon includes agents for building, planning, coding, Q&A, debugging, review, and orchestration. It also supports MCP servers, plugins, custom agents, skills, LSP integration, a web interface, and ACP.

- [Documentation and source](https://github.com/Wade-DevCode/axon)
- [GitHub Releases](https://github.com/Wade-DevCode/axon/releases/latest)
- [License](https://github.com/Wade-DevCode/axon/blob/main/LICENSE)

Axon is built from [OpenCode](https://github.com/anomalyco/opencode) and distributed under the MIT License.
