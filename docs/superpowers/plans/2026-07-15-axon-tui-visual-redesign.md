# Axon TUI Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a cross-platform deep-blue and orange Axon startup, home, and conversation experience backed by real initialization, session, tool, and file-change state.

**Architecture:** Keep the existing OpenTUI application, contexts, session protocol, Prompt, keybindings, and plugin slots. Add pure presentation models for startup state, responsive density, tool rows, and change summaries; render those models through focused brand components and integrate them at the existing app, home, and session composition points.

**Tech Stack:** TypeScript, SolidJS, OpenTUI, Bun test, Bun workspace packages, JSON theme assets.

## Global Constraints

- Support Windows Terminal, PowerShell, cmd, common macOS terminals, and common Linux terminals.
- Use ASCII plus common box-drawing characters with known single-column width; do not use block arrangements that previously rendered as literal escape text on Windows.
- Keep startup progress runtime-backed and enforce an 800 ms minimum splash display only when animations are enabled and terminal height is sufficient.
- Preserve existing Prompt behavior, autocomplete, image paste, model and agent selection, keybindings, session protocol, and plugin contracts.
- Keep `Axon` as the default theme while allowing every existing theme to recolor the new UI through semantic tokens.
- Do not add bitmap rendering, glow, particles, grid backgrounds, custom window chrome, or a new terminal shell.
- Do not add a model call for change summaries; show only event-derived file and line facts.
- Run tests and typechecks from `packages/tui`, never from the repository root.

---

## File Structure

- `packages/tui/src/theme/assets/axon.json`: Axon's dark and light semantic palette.
- `packages/tui/src/theme/index.ts`: registers the real Axon palette instead of aliasing the axon palette.
- `packages/tui/src/util/brand-layout.ts`: pure width and height breakpoints shared by home, splash, and session chrome.
- `packages/tui/src/util/startup.ts`: pure startup phase ordering, progress, failure, and visibility calculations.
- `packages/tui/src/context/startup.tsx`: reactive startup progress shared by SyncProvider, App, and splash.
- `packages/tui/src/component/axon-logo.tsx`: terminal-safe full and compact Axon marks.
- `packages/tui/src/component/startup-loading.tsx`: full-screen branded splash driven by startup progress.
- `packages/tui/src/component/axon-composer.tsx`: visual shell around the existing Prompt slot/content.
- `packages/tui/src/routes/home.tsx`: branded post-startup home composition.
- `packages/tui/src/routes/session/presentation.ts`: pure tool-row and change-summary derivation.
- `packages/tui/src/routes/session/tool-panel.tsx`: responsive grouped tool execution panel.
- `packages/tui/src/routes/session/change-summary.tsx`: event-derived file change card.
- `packages/tui/src/routes/session/chrome.tsx`: session header and status bar.
- `packages/tui/src/routes/session/index.tsx`: integrates fixed chrome, grouped tool panels, summaries, and composer without changing session behavior.
- `packages/tui/src/app.tsx`: mounts StartupProvider, tracks plugin startup, and gates routes behind the splash.
- `packages/tui/src/context/sync.tsx`: reports real bootstrap phase completion and recoverable startup errors.
- Tests live beside the existing TUI test areas under `packages/tui/test`.

---

### Task 1: Axon Theme and Responsive Density

**Files:**

- Create: `packages/tui/src/theme/assets/axon.json`
- Create: `packages/tui/src/util/brand-layout.ts`
- Modify: `packages/tui/src/theme/index.ts:1-38,130-164`
- Modify: `packages/tui/test/theme.test.ts`
- Create: `packages/tui/test/util/brand-layout.test.ts`

**Interfaces:**

- Produces: `brandDensity(width: number, height: number): "compact" | "normal" | "wide"`
- Produces: `showSplashArtwork(width: number, height: number): boolean`
- Produces: `DEFAULT_THEMES.Axon` backed by `theme/assets/axon.json`
- Consumes: existing `ThemeJson` schema and semantic theme keys.

- [ ] **Step 1: Add failing palette and breakpoint tests**

```ts
import { describe, expect, test } from "bun:test"
import { DEFAULT_THEMES } from "../../src/theme"
import { brandDensity, showSplashArtwork } from "../../src/util/brand-layout"

describe("Axon brand layout", () => {
  test("uses the approved responsive ranges", () => {
    expect(brandDensity(79, 24)).toBe("compact")
    expect(brandDensity(80, 24)).toBe("normal")
    expect(brandDensity(119, 24)).toBe("normal")
    expect(brandDensity(120, 24)).toBe("wide")
  })

  test("omits large splash art in short terminals", () => {
    expect(showSplashArtwork(120, 14)).toBe(false)
    expect(showSplashArtwork(120, 24)).toBe(true)
  })
})

test("Axon uses its own navy and orange palette", () => {
  expect(DEFAULT_THEMES.Axon.theme.background).toBe("navy")
  expect(DEFAULT_THEMES.Axon.theme.primary).toBe("orange")
})
```

- [ ] **Step 2: Run the tests and confirm the missing layout module / old palette failure**

Run from `packages/tui`:

```bash
bun test test/util/brand-layout.test.ts test/theme.test.ts
```

Expected: FAIL because `util/brand-layout` does not exist and `DEFAULT_THEMES.Axon` still points to `axon.json`.

- [ ] **Step 3: Add the pure breakpoints**

```ts
export type BrandDensity = "compact" | "normal" | "wide"

export function brandDensity(width: number, _height: number): BrandDensity {
  if (width < 80) return "compact"
  if (width < 120) return "normal"
  return "wide"
}

export function showSplashArtwork(width: number, height: number) {
  return width >= 80 && height >= 18
}
```

- [ ] **Step 4: Add and register the real Axon theme**

Create `theme/assets/axon.json` from the existing theme structure, then replace only its `defs` object with this complete palette. Keeping the `theme` object unchanged preserves every required semantic key while redirecting all of them to Axon colors:

```json
{
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "darkStep1": "#020f24",
    "darkStep2": "#061a35",
    "darkStep3": "#0a2447",
    "darkStep4": "#102d55",
    "darkStep5": "#183866",
    "darkStep6": "#244877",
    "darkStep7": "#365d8c",
    "darkStep8": "#4d76a7",
    "darkStep9": "#ff6a00",
    "darkStep10": "#ff8a1f",
    "darkStep11": "#6686b8",
    "darkStep12": "#e8edf7",
    "darkSecondary": "#4c8fe8",
    "darkAccent": "#ff8a1f",
    "darkRed": "#ff5b5b",
    "darkOrange": "#ff6a00",
    "darkGreen": "#6fd17f",
    "darkCyan": "#60a5fa",
    "darkYellow": "#f3b45a",
    "lightStep1": "#f7f9fc",
    "lightStep2": "#edf2f8",
    "lightStep3": "#e1e9f3",
    "lightStep4": "#d3dfed",
    "lightStep5": "#c2d2e5",
    "lightStep6": "#a9bfd8",
    "lightStep7": "#7897ba",
    "lightStep8": "#58779c",
    "lightStep9": "#d94f00",
    "lightStep10": "#b94100",
    "lightStep11": "#5d6f86",
    "lightStep12": "#122033",
    "lightSecondary": "#2768b7",
    "lightAccent": "#c94a00",
    "lightRed": "#c93636",
    "lightOrange": "#d94f00",
    "lightGreen": "#287a42",
    "lightCyan": "#2768b7",
    "lightYellow": "#8a5a12"
  }
}
```

Import the copied asset as `axon` and register `Axon: axon`. Leave the existing `axon` import available under its own name only if another registry entry already exposes it; do not silently remove a public theme.

- [ ] **Step 5: Run palette and layout tests**

Run:

```bash
bun test test/util/brand-layout.test.ts test/theme.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the theme foundation**

```bash
git add packages/tui/src/theme/assets/axon.json packages/tui/src/theme/index.ts packages/tui/src/util/brand-layout.ts packages/tui/test/theme.test.ts packages/tui/test/util/brand-layout.test.ts
git commit -m "feat(tui): add axon brand foundation"
```

---

### Task 2: Real Startup Progress and Branded Splash

**Files:**

- Create: `packages/tui/src/util/startup.ts`
- Create: `packages/tui/src/context/startup.tsx`
- Modify: `packages/tui/src/context/sync.tsx:53-136,429-539`
- Modify: `packages/tui/src/component/startup-loading.tsx`
- Modify: `packages/tui/src/app.tsx:26-36,274-330,362-418,1085-1109`
- Create: `packages/tui/test/util/startup.test.ts`
- Modify: `packages/tui/test/app-lifecycle.test.tsx`

**Interfaces:**

- Produces: `StartupPhase = "configuration" | "workspace" | "providers" | "agents" | "mcp" | "plugins"`
- Produces: `StartupPhaseState = "pending" | "running" | "complete" | "error"`
- Produces: `startupSnapshot(phases): { label: string; percent: number; done: boolean; error?: string }`
- Produces: `useStartupProgress()` with `start`, `complete`, and `fail` methods.
- Consumes: `brandDensity`, `showSplashArtwork`, `sync.bootstrap()` promises, plugin-host startup, `animations_enabled`, and existing Toast handling.

- [ ] **Step 1: Write failing startup model tests**

```ts
import { describe, expect, test } from "bun:test"
import { initialStartupPhases, startupSnapshot } from "../../src/util/startup"

describe("startupSnapshot", () => {
  test("reports completed real phases without interpolating", () => {
    const phases = initialStartupPhases()
    phases.configuration = { state: "complete" }
    phases.workspace = { state: "running" }
    expect(startupSnapshot(phases)).toMatchObject({ label: "Opening workspace", percent: 17, done: false })
  })

  test("surfaces the first failure and still reaches a terminal state", () => {
    const phases = initialStartupPhases()
    for (const name of Object.keys(phases) as Array<keyof typeof phases>) phases[name] = { state: "complete" }
    phases.mcp = { state: "error", error: "MCP status unavailable" }
    expect(startupSnapshot(phases)).toEqual({
      label: "MCP status unavailable",
      percent: 100,
      done: true,
      error: "MCP status unavailable",
    })
  })
})
```

- [ ] **Step 2: Run the startup model test and confirm it fails**

Run:

```bash
bun test test/util/startup.test.ts
```

Expected: FAIL because `util/startup.ts` does not exist.

- [ ] **Step 3: Implement the phase model**

```ts
export const startupPhaseOrder = ["configuration", "workspace", "providers", "agents", "mcp", "plugins"] as const
export type StartupPhase = (typeof startupPhaseOrder)[number]
export type StartupPhaseState = { state: "pending" | "running" | "complete" | "error"; error?: string }
export type StartupPhases = Record<StartupPhase, StartupPhaseState>

const labels: Record<StartupPhase, string> = {
  configuration: "Loading configuration",
  workspace: "Opening workspace",
  providers: "Loading providers",
  agents: "Loading agents",
  mcp: "Connecting MCP servers",
  plugins: "Loading plugins",
}

export function initialStartupPhases(): StartupPhases {
  return Object.fromEntries(startupPhaseOrder.map((name) => [name, { state: "pending" }])) as StartupPhases
}

export function startupSnapshot(phases: StartupPhases) {
  const error = startupPhaseOrder.map((name) => phases[name].error).find(Boolean)
  const settled = startupPhaseOrder.filter(
    (name) => phases[name].state === "complete" || phases[name].state === "error",
  )
  const active = startupPhaseOrder.find((name) => phases[name].state === "running" || phases[name].state === "pending")
  const done = settled.length === startupPhaseOrder.length
  return {
    label: error ?? (done ? "Ready" : labels[active ?? "plugins"]),
    percent: Math.round((settled.length / startupPhaseOrder.length) * 100),
    done,
    ...(error ? { error } : {}),
  }
}
```

- [ ] **Step 4: Add the startup context and instrument real boundaries**

Implement `StartupProvider` with a Solid store initialized by `initialStartupPhases()`. Its exported methods must be idempotent:

```ts
start(name: StartupPhase) {
  setStore(name, { state: "running" })
},
complete(name: StartupPhase) {
  setStore(name, { state: "complete" })
},
fail(name: StartupPhase, error: unknown) {
  setStore(name, { state: "error", error: error instanceof Error ? error.message : String(error) })
}
```

Wrap these real promises in `SyncProvider.bootstrap()`:

```ts
const tracked = <T>(name: StartupPhase, promise: Promise<T>) => {
  startup.start(name)
  return promise.then(
    (value) => {
      startup.complete(name)
      return value
    },
    (error) => {
      startup.fail(name, error)
      throw error
    },
  )
}
```

Track `configPromise`, `projectPromise`, a combined provider promise, `agentsPromise`, and the MCP status promise. In the fatal bootstrap catch, set remaining pending phases to complete, preserve the first error in startup state, set sync status to `complete`, and let App show an error toast. Do not call `exit(e)` for a recoverable bootstrap fetch failure. Keep explicit `exit` behavior for renderer or provider-construction failures outside bootstrap.

Mount `StartupProvider` outside `ProjectProvider` and `SyncProvider`. Mark the `plugins` phase from the existing `pluginHost.start()` promise.

- [ ] **Step 5: Replace the popup loader with the full-screen splash**

`StartupLoading` consumes startup progress, dimensions, theme, version, runtime mode, and animation setting. Use a timer-backed `minimumElapsed` signal so completion produces a reactive hide:

```ts
const minimum = animationsEnabled() && showSplashArtwork(dimensions().width, dimensions().height) ? 800 : 0
const [minimumElapsed, setMinimumElapsed] = createSignal(minimum === 0)
const timer = minimum === 0 ? undefined : setTimeout(() => setMinimumElapsed(true), minimum).unref()
const visible = createMemo(() => !snapshot().done || !minimumElapsed())
onCleanup(() => {
  if (timer) clearTimeout(timer)
})
```

Render the full-screen surface with the terminal-safe `AxonLogo`, subtitle, phase label, a character progress track whose filled width is `Math.floor(trackWidth * percent / 100)`, version on the left, and `local` on the right. On error completion, preserve the error label until the minimum display time elapses and show the same error through Toast after routes mount.

- [ ] **Step 6: Add lifecycle tests for minimum duration, fast boot, and recoverable errors**

Extend `app-lifecycle.test.tsx` with fake timers and renderer frames. Assert:

```ts
expect(frameBefore800ms).toContain("Developer Agent for the Terminal")
expect(frameAfter800ms).not.toContain("Initializing workspace")
expect(fastBootFrame).not.toContain("Developer Agent for the Terminal")
expect(recoverableFailureFrame).toContain("Axon")
```

Use the existing `createFetch` fixture to reject `/config/providers` once, and assert the main UI renders plus an error toast instead of destroying the renderer.

- [ ] **Step 7: Run startup and lifecycle tests**

Run:

```bash
bun test test/util/startup.test.ts test/app-lifecycle.test.tsx
```

Expected: PASS with no timer leaks.

- [ ] **Step 8: Commit startup behavior**

```bash
git add packages/tui/src/util/startup.ts packages/tui/src/context/startup.tsx packages/tui/src/context/sync.tsx packages/tui/src/component/startup-loading.tsx packages/tui/src/app.tsx packages/tui/test/util/startup.test.ts packages/tui/test/app-lifecycle.test.tsx
git commit -m "feat(tui): add branded startup progress"
```

---

### Task 3: Terminal-Safe Logo, Home, and Composer Shell

**Files:**

- Create: `packages/tui/src/component/axon-logo.tsx`
- Create: `packages/tui/src/component/axon-composer.tsx`
- Modify: `packages/tui/src/logo.ts`
- Modify: `packages/tui/src/component/logo.tsx`
- Modify: `packages/tui/src/routes/home.tsx:23-83`
- Create: `packages/tui/test/cli/tui/axon-home.test.tsx`

**Interfaces:**

- Produces: `<AxonLogo size="full" | "compact" />`
- Produces: `<AxonComposer density focused>{children}</AxonComposer>`
- Consumes: `brandDensity`, active semantic theme, existing `Prompt`, home plugin slots, and Prompt refs.

- [ ] **Step 1: Add failing full, compact, and narrow render tests**

```tsx
test("renders a stable Axon wordmark without block escapes", async () => {
  const frame = await renderFrame(() => <AxonLogo size="full" />, { width: 100, height: 12 })
  expect(frame).toContain("A X O N")
  expect(frame).not.toContain("u2588")
})

test("uses the compact home composition below 80 columns", async () => {
  const frame = await renderHome({ width: 72, height: 20 })
  expect(frame).toContain("AXON")
  expect(frame).toContain("Ask Axon")
  expect(frame).not.toContain("Developer Agent for the Terminal")
})
```

- [ ] **Step 2: Run the home render test and confirm it fails**

Run:

```bash
bun test test/cli/tui/axon-home.test.tsx
```

Expected: FAIL because `AxonLogo` and the branded composer do not exist.

- [ ] **Step 3: Implement the terminal-safe logo**

Replace the current Unicode block arrays with slash, underscore, and vertical strokes whose width is stable:

```ts
export const axonMark = String.raw`
      /\
  /\ /  \
 /  X    \
/__/ \____\
`
  .trim()
  .split("\n")
export const axonWordmark = "A X O N"
export const axonCompact = "AXON"
```

`AxonLogo` renders the mark in `theme.primary`, the wordmark in `theme.text`, and the subtitle only for `size="full"`. Remove the old per-character shadow renderer from `component/logo.tsx`; keep its public `Logo` export as a compatibility wrapper around `AxonLogo`.

- [ ] **Step 4: Implement and integrate the composer shell**

`AxonComposer` owns only border, padding, background, and hint layout. It accepts the existing `<Prompt />` as children and does not read or modify prompt state:

```tsx
export function AxonComposer(props: { density: BrandDensity; focused?: boolean; children: JSX.Element }) {
  const theme = useTheme().theme
  return (
    <box border paddingLeft={1} paddingRight={1} borderColor={props.focused ? theme.borderActive : theme.border}>
      {props.children}
    </box>
  )
}
```

Update Home to use the full logo at normal/wide density, compact logo below 80 columns, and a composer shell around the existing `home_prompt` slot. Preserve `bind`, `route.prompt`, `--prompt`, `home_bottom`, Toast, and footer slots.

- [ ] **Step 5: Run home, Prompt, and plugin-slot regression tests**

Run:

```bash
bun test test/cli/tui/axon-home.test.tsx test/prompt/display.test.ts test/plugin/slots.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit home presentation**

```bash
git add packages/tui/src/logo.ts packages/tui/src/component/logo.tsx packages/tui/src/component/axon-logo.tsx packages/tui/src/component/axon-composer.tsx packages/tui/src/routes/home.tsx packages/tui/test/cli/tui/axon-home.test.tsx
git commit -m "feat(tui): redesign axon home"
```

---

### Task 4: Tool and Change Presentation Models

**Files:**

- Create: `packages/tui/src/routes/session/presentation.ts`
- Create: `packages/tui/test/cli/tui/session-presentation.test.ts`

**Interfaces:**

- Produces: `ToolRow = { id; kind; label; target; status; duration?; additions?; deletions?; error? }`
- Produces: `toolRow(part: ToolPart): ToolRow`
- Produces: `ChangeFile = { path; additions?; deletions? }`
- Produces: `changeSummary(parts: readonly ToolPart[]): ChangeFile[]`
- Consumes: SDK `ToolPart`, tool input, tool state timestamps, `metadata.diff`, and `metadata.files`.

- [ ] **Step 1: Add failing tests for every tool state and trustworthy change aggregation**

```ts
test("maps running, completed, failed, and cancelled tool states", () => {
  expect(
    toolRow(tool("read", { status: "running", input: { filePath: "src/a.ts" }, time: { start: 100 } }), 120),
  ).toMatchObject({
    kind: "Read",
    target: "src/a.ts",
    status: "running",
    duration: 20,
  })
  expect(
    toolRow(
      tool("bash", {
        status: "error",
        input: { command: "bun test" },
        error: "Request aborted",
        time: { start: 100, end: 110 },
      }),
      120,
    ).status,
  ).toBe("cancelled")
})

test("aggregates file facts and omits invented prose", () => {
  expect(changeSummary([editPart("src/a.ts", "+one\n-two"), patchPart("src/b.ts", 3, 1)])).toEqual([
    { path: "src/a.ts", additions: 1, deletions: 1 },
    { path: "src/b.ts", additions: 3, deletions: 1 },
  ])
})
```

- [ ] **Step 2: Run the model test and confirm it fails**

Run:

```bash
bun test test/cli/tui/session-presentation.test.ts
```

Expected: FAIL because `routes/session/presentation.ts` does not exist.

- [ ] **Step 3: Implement tool-row normalization**

Map known names with a record and preserve unknown plugin names using title case:

```ts
const kinds: Record<string, string> = {
  read: "Read",
  grep: "Search",
  glob: "Search",
  edit: "Edit",
  write: "Write",
  apply_patch: "Patch",
  bash: "Run",
  task: "Agent",
}
```

Derive target from `filePath`, `pattern`, `command`, `description`, or the state's title in that order. Derive duration from `time.start` and `time.end ?? now`; omit it for pending states. Map errors containing `abort`, `cancel`, or `interrupt` to `cancelled`; other errors remain `failed`.

- [ ] **Step 4: Implement change aggregation without prose generation**

For Edit and Write, count lines beginning with `+` and `-` from `metadata.diff`, excluding `+++` and `---` headers. For ApplyPatch, consume each validated `metadata.files` entry and count its patch. Merge duplicate paths by summing known counts. If a path exists but counts cannot be proven, return only `{ path }`.

```ts
return [...files.values()].toSorted((a, b) => a.path.localeCompare(b.path))
```

- [ ] **Step 5: Run the presentation tests**

Run:

```bash
bun test test/cli/tui/session-presentation.test.ts
```

Expected: PASS for pending, running, complete, failed, cancelled, unknown tool, malformed metadata, duplicate file, and missing-count cases.

- [ ] **Step 6: Commit presentation models**

```bash
git add packages/tui/src/routes/session/presentation.ts packages/tui/test/cli/tui/session-presentation.test.ts
git commit -m "feat(tui): model session activity panels"
```

---

### Task 5: Session Header, Grouped Activity, Composer, and Status Bar

**Files:**

- Create: `packages/tui/src/routes/session/tool-panel.tsx`
- Create: `packages/tui/src/routes/session/change-summary.tsx`
- Create: `packages/tui/src/routes/session/chrome.tsx`
- Modify: `packages/tui/src/routes/session/index.tsx:178-286,1145-1347,1350-1835`
- Modify: `packages/tui/src/routes/session/footer.tsx`
- Create: `packages/tui/test/cli/tui/axon-session.test.tsx`
- Update: `packages/tui/test/cli/tui/inline-tool-wrap-snapshot.test.tsx`

**Interfaces:**

- Produces: `<AxonSessionHeader session agent branch density />`
- Produces: `<AxonStatusBar mode shell version changedFiles density />`
- Produces: `<AxonToolPanel parts now density onOpen />`
- Produces: `<AxonChangeSummary files density />`
- Consumes: Task 4's `toolRow` and `changeSummary`, current session/project/VCS/local-agent state, existing message parts, existing detailed ToolPart renderers, Prompt, permission/question prompts, sidebar, and plugin slots.

- [ ] **Step 1: Add failing session snapshots at 72, 100, and 140 columns**

Build a fixture with one user message, one assistant text part, Read/Search/Edit/Test tool parts, and two changed files. Assert:

```tsx
expect(await renderSession(140)).toMatchSnapshot("wide session")
expect(await renderSession(100)).toMatchSnapshot("normal session")
expect(await renderSession(72)).toMatchSnapshot("compact session")
```

The wide frame must contain `AXON`, the project branch, `AX Ready`, `You`, `Axon`, `Read`, `Search`, `Edit`, `Change Summary`, `Ask Axon`, mode, shell, and changed-file count. The compact frame must omit durations and render each tool on two lines.

- [ ] **Step 2: Run the session render test and confirm it fails**

Run:

```bash
bun test test/cli/tui/axon-session.test.tsx
```

Expected: FAIL because the chrome and grouped activity components do not exist.

- [ ] **Step 3: Implement header and status bar with priority hiding**

`AxonSessionHeader` renders product, project, branch, and agent readiness. Use `brandDensity` to hide fields in this order: readiness detail, project name, product label. Keep branch and agent while they fit.

`AxonStatusBar` reads actual mode, shell, version, and `sync.data.session_diff[sessionID]`. Determine shell from `process.env.ComSpec` on Windows and `process.env.SHELL` elsewhere; show only the basename. Do not add a clock or synthetic cursor position.

```tsx
<text fg={theme.primary}>{mode.toUpperCase()}</text>
<text fg={theme.info}>{shell}</text>
<text fg={theme.info}>{changedFiles} files changed</text>
```

- [ ] **Step 4: Implement grouped tool and change panels**

`AxonToolPanel` maps every ToolPart with `toolRow(part, Date.now())`. Wide/normal density renders one row per tool; compact density renders label and status on the first line and target on the second. Use `theme.warning` for running, `theme.success` for success, `theme.error` for failure, and `theme.textMuted` for cancellation.

`AxonChangeSummary` receives only `changeSummary(parts)`. Render it only when the array is non-empty. Show file paths and known `+N -N` counts; never display a generated bullet description.

- [ ] **Step 5: Integrate turn grouping without changing message data flow**

In `AssistantMessage`, split parts into tool and non-tool views with type guards:

```ts
const tools = createMemo(() => props.parts.filter((part): part is ToolPart => part.type === "tool"))
const content = createMemo(() => props.parts.filter((part) => part.type !== "tool"))
```

Render normal text, thinking, reasoning, files, and existing block output from `content`. Render one `AxonToolPanel` for `tools()`, followed by one `AxonChangeSummary`. Preserve the existing detailed diff and output renderer behind `showDetails()` so users can still inspect Edit, ApplyPatch, and Bash output without duplicating their summary rows.

Wrap the session Prompt slot in `AxonComposer`, leaving the slot name, `ref`, `visible`, `disabled`, `on_submit`, `right`, permission prompt, question prompt, and subagent footer behavior unchanged.

Place `AxonSessionHeader` before the scrollbox and `AxonStatusBar` after the composer. Keep the sidebar as a sibling of the main session column.

- [ ] **Step 6: Run session, wrapping, prompt, and plugin regressions**

Run:

```bash
bun test test/cli/tui/axon-session.test.tsx test/cli/tui/inline-tool-wrap-snapshot.test.tsx test/cli/tui/prompt-submit-race.test.ts test/plugin/slots.test.tsx
```

Expected: PASS. Update only snapshots whose changes are explained by the approved new hierarchy.

- [ ] **Step 7: Commit the session redesign**

```bash
git add packages/tui/src/routes/session/tool-panel.tsx packages/tui/src/routes/session/change-summary.tsx packages/tui/src/routes/session/chrome.tsx packages/tui/src/routes/session/index.tsx packages/tui/src/routes/session/footer.tsx packages/tui/test/cli/tui/axon-session.test.tsx packages/tui/test/cli/tui/inline-tool-wrap-snapshot.test.tsx
git commit -m "feat(tui): redesign axon sessions"
```

---

### Task 6: Full Regression, Built-Binary QA, and npm Installation Smoke Test

**Files:**

- Modify only files required to correct failures caused by Tasks 1-5.
- Do not add unrelated refactors or rename compatibility identifiers during this task.

**Interfaces:**

- Consumes: all previous tasks.
- Produces: a verified TUI source tree, platform binaries, and npm wrapper smoke-test evidence.

- [ ] **Step 1: Run the entire TUI test suite**

Run from `packages/tui`:

```bash
bun test
```

Expected: all tests pass with zero failures and no leaked renderer or timer warnings.

- [ ] **Step 2: Run TUI typecheck**

Run from `packages/tui`:

```bash
bun typecheck
```

Expected: exit 0 with no diagnostics.

- [ ] **Step 3: Run repository formatting safety checks**

Run from the repository root:

```bash
git diff --check origin/dev...HEAD
```

Expected: no output and exit 0.

- [ ] **Step 4: Build the platform CLI artifacts**

Run from the repository root after confirming no local `axon.exe` process holds the previous binary:

```bash
bun ./packages/axon/script/build.ts
```

Expected: `packages/axon/dist/axon-windows-x64/bin/axon.exe` plus the configured Linux and macOS Axon artifacts are produced without build errors.

- [ ] **Step 5: Perform Windows Terminal visual QA**

Run the built Windows binary at these terminal sizes:

```powershell
packages\axon\dist\axon-windows-x64\bin\axon.exe
```

Verify 72x20, 100x30, and 140x40 layouts against the approved references. Confirm the splash uses real progress, the compact mode does not wrap important labels, the composer accepts input, autocomplete opens, image paste still works, a live tool moves through running to success/failure, and theme switching recolors every new component.

- [ ] **Step 6: Pack and smoke-test the npm wrapper locally**

Use the same publish script's staged package directory and pack it without publishing:

```bash
cd packages/axon/dist/axon
bun pm pack
npm install -g ./wanghuimvp-axon-*.tgz
axon --version
```

Expected: the installed command reports the staged version and launches the redesigned TUI. Restore the developer's previous global Axon version after the smoke test if the staged version is not intended for daily use.

- [ ] **Step 7: Commit any verification-only fixes**

If Steps 1-6 required scoped corrections, stage only those files and commit:

```bash
git add packages/tui
git commit -m "fix(tui): finish axon visual regression"
```

If no files changed, do not create an empty commit.

- [ ] **Step 8: Record final evidence for handoff**

Report the exact test count, typecheck exit status, build artifact paths, terminal sizes inspected, npm pack filename, and any intentionally unsupported reference effects. Do not claim completion without this fresh evidence.
