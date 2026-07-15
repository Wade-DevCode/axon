# Axon TUI Visual Redesign

## Goal

Redesign Axon's startup and conversation surfaces around a recognizable deep-blue and orange brand system while preserving the existing cross-platform OpenTUI runtime, prompt behavior, session protocol, keybindings, plugin slots, and theme switching.

The result should reproduce the hierarchy and density of the approved visual references within terminal constraints. It will not attempt pixel effects that terminals cannot render reliably.

## Scope

The redesign covers both of these surfaces:

1. A startup splash that reports real initialization progress.
2. A restructured conversation view with a fixed header, scrollable task-oriented message area, fixed composer, and status bar.

It also introduces an `Axon` theme as the default theme. Users may still switch to any existing theme, and all new components must use semantic theme tokens rather than hard-coded brand colors.

The redesign does not include custom terminal window chrome, particle or glow effects, a bitmap background, changes to model or tool protocols, or a replacement plugin system.

## Design Principles

- Keep the product usable in Windows Terminal, PowerShell, cmd, macOS terminals, and common Linux terminals.
- Reuse existing session state, Prompt, autocomplete, keyboard, and plugin infrastructure.
- Separate presentation components by responsibility without rewriting core behavior.
- Show real state. Progress, tool status, timing, and file changes must come from runtime data rather than decorative animation or generated claims.
- Degrade deliberately on small terminals instead of allowing wrapping and glyph-width accidents to determine layout.

## Page Architecture

Startup follows this sequence:

```text
Start Axon
  -> AxonSplash
  -> Load configuration, workspace, providers, agents, and MCP state
  -> Update the visible phase and progress
  -> Wait until initialization is complete and the splash has shown for 800 ms
  -> Enter Home
```

The main conversation surface uses three stable layers:

```text
AxonHeader
Scrollable messages, tool activity, and change summaries
AxonComposer
AxonStatusBar
```

The header, composer, and status bar stay fixed. Only the middle content area scrolls.

## Components

### AxonSplash

The splash presents a terminal-safe geometric `AX` mark, a spaced `A X O N` wordmark, and the subtitle `Developer Agent for the Terminal`. Four corner markers provide structure without drawing a visually heavy full-screen frame.

The splash reports these initialization phases:

```text
Loading configuration
Opening workspace
Loading providers
Loading agents
Connecting MCP servers
Ready
```

Progress is derived from completed phases. It does not interpolate a fake percentage. If one phase takes longer, its label remains active while the percentage stays stable.

The splash remains visible for at least 800 ms to avoid a flash. If terminal height is insufficient, the large mark and transition delay are omitted. Initialization failure identifies the failed subsystem, enters the main UI, and exposes an actionable error through the existing toast or status UI instead of trapping the user on the splash.

The footer shows the Axon version on the left and the runtime mode, such as `local`, on the right. It does not include a live clock because continuous time updates create noise and unnecessary redraws.

### AxonHeader

The header shows the product name, project name, VCS branch, active agent, and readiness state. Width pressure removes secondary fields in this order: readiness detail, project name, then product label. The active branch and agent remain visible for as long as the available width permits.

### AxonMessage

User and assistant messages receive distinct labels and spacing but continue to use the existing message model and content renderers. Markdown, code blocks, diffs, long output, and selection behavior remain intact.

User messages use the `You` label and assistant messages use `Axon`. Timestamps are right-aligned when space allows and omitted before they are allowed to wrap into message content.

### AxonToolPanel

Tool calls from one assistant turn are grouped into one panel. Each row maps the underlying tool event into a semantic presentation:

```text
Read    src/auth/session.ts       success   12 ms
Search  "refreshToken"            success    8 ms
Edit    src/auth/session.ts       +18 -6
Test    pnpm test auth            running
```

The panel supports pending, running, successful, failed, and cancelled states. Known tools receive concise labels; unknown or plugin tools retain their registered names and render through a generic row. Durations are calculated from event timestamps and are hidden when terminal width is constrained.

### AxonChangeSummary

The summary aggregates Edit, Write, and Patch results in the current assistant turn. It shows affected files and reliable added or removed line counts when those values exist.

The summary never invokes a model and never invents prose. If the event stream does not contain a trustworthy description, it shows file-level facts only. A turn with no file mutations has no summary card.

### AxonComposer

The fixed composer reuses the existing Prompt implementation, including autocomplete, editor context, image paste, model selection, agent selection, history, and shortcuts. Its visual shell adopts the branded bordered panel and exposes concise hints such as `@agent`, `/command`, and `#file` without duplicating command logic.

Focus, normal, shell, disabled, and error states use semantic border and text tokens. The submit affordance is represented with terminal characters rather than a clickable bitmap button.

### AxonStatusBar

The status bar displays only runtime-backed information: current mode, shell, encoding, changed-file count, cursor position when available, and notification state. It uses priority-based hiding at smaller widths.

## Theme System

The new default `Axon` theme defines:

- deep navy background and elevated surface colors;
- orange primary and focus colors;
- blue-gray secondary text and separators;
- green success and additions;
- red errors and deletions;
- high-contrast neutral body text.

Components consume semantic tokens from the active theme. Switching themes must recolor the new components without leaving hard-coded orange, navy, or blue-gray artifacts. If TrueColor is unavailable, the existing color handling falls back to the nearest ANSI 256-color values.

## Responsive Behavior

### 120 columns and wider

Render the complete header, single-row tool table, timestamps, durations, full composer hints, and two-sided status bar.

### 80 to 119 columns

Reduce horizontal padding and gaps. Hide secondary readiness detail, optional timestamps, and nonessential tool durations before truncating primary content.

### Below 80 columns

Render each tool as a compact two-line card. Reduce header fields to branch and agent. Reduce the status bar to mode and version. Compress the logo and vertical spacing. Text must remain readable without horizontal scrolling.

## Terminal Compatibility

The redesign uses ASCII plus common box-drawing characters with known terminal-width behavior. The logo must not depend on Unicode block arrangements that render inconsistently or have previously appeared as literal escape text on Windows.

Layout tests cover glyph width and wrapping. Visual verification covers Windows Terminal with PowerShell, a common macOS terminal, and a common Linux terminal. Unsupported visual effects from the reference images, including glow, particles, grid backgrounds, and custom title bars, are intentionally excluded.

## Error Handling

- Initialization failures identify the subsystem and continue into a usable main UI.
- Failed tool calls retain their error state and concise error text without breaking the surrounding turn group.
- Cancelled calls are visually distinct from failures.
- Missing duration or change metadata is omitted rather than replaced with placeholder values.
- Unknown plugin tools render through a generic tool row.
- Existing no-animation configuration disables splash transitions and animated running indicators.

## Verification

Automated coverage will verify:

- startup phase-to-progress mapping and the 800 ms minimum display rule;
- immediate compact startup behavior in short terminals;
- logo and border character widths;
- responsive layout decisions at representative widths below 80, from 80 to 119, and at least 120 columns;
- tool pending, running, success, failure, and cancellation states;
- multi-file change aggregation without generated prose;
- semantic theme behavior under the Axon theme and at least one existing theme;
- Prompt input, autocomplete, image paste, model selection, and keybinding regressions.

Manual verification will run the built CLI in Windows Terminal and compare the startup and conversation surfaces with the approved references. Before npm publication, verification must use the packed platform binaries and the `@wanghuimvp/axon` wrapper installation path, not only a source checkout.

## Delivery Boundaries

Implementation should introduce focused presentation components near the existing TUI routes and components, adapt the current home and session composition to use them, and add theme tokens only where the current semantic set cannot express the design. Existing runtime state remains authoritative.

No implementation should change the session protocol, tool execution semantics, provider initialization ordering, keybinding commands, Prompt data model, or plugin contract solely for visual convenience.
