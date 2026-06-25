# Contributing to Axon

Axon is a rebranded fork of [opencode](https://github.com/anomalyco/opencode). Most of the engine — models, tools, TUI, server, plugins — comes from upstream.

## Where changes should go

- **Core engine improvements** (bug fixes, new providers/LSPs, performance, general features): please send these to upstream [opencode](https://github.com/anomalyco/opencode) so the whole ecosystem benefits. Axon tracks upstream and will pick them up.
- **Axon-specific changes** (rebrand, Axon-only features, fork integration): open an issue or PR on [Wade-DevCode/axon](https://github.com/Wade-DevCode/axon).

## Development

Requires [Bun](https://bun.sh) 1.3+.

```bash
bun install
bun run --cwd packages/opencode --conditions=browser src/index.ts   # run the CLI/TUI
bun run --cwd packages/opencode typecheck                           # typecheck
```

## License

By contributing you agree that your contributions are licensed under the MIT License.
