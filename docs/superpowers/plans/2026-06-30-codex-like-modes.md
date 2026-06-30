# Codex-Like Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Productize Axon's first-phase Codex-like mode experience by exposing Code and Review as first-class modes while preserving build compatibility.

**Architecture:** Reuse the existing agent runtime as the source of truth. Add `code` and `review` as built-in primary agents, keep `build` compatible, then centralize TUI display labeling through a small utility so persisted runtime ids can differ from product labels. Route the built-in `/review` command through the review agent without changing the command system contract.

**Tech Stack:** Bun, TypeScript, Effect, Solid TUI, existing Axon agent/command services, Bun test.

## Global Constraints

- Work from `E:\CLIProjects`.
- Follow `AGENTS.md`: run package commands from package directories, especially `packages/opencode`.
- Do not use `tsc` directly; use `bun typecheck` from `packages/opencode`.
- Keep runtime compatibility for `build` in configs, sessions, CLI flags, and older transcripts.
- Do not implement cloud execution, worktree orchestration changes, automatic security classifier, a new permission engine, or broad UI redesign in this phase.
- Preserve `.mimocode/` as an unrelated untracked directory.

---

## File Structure

- Modify `packages/opencode/src/agent/agent.ts`: add built-in `code` and `review` primary agents, keeping `build` behavior unchanged.
- Create `packages/opencode/src/agent/prompt/review.txt`: review-specific system prompt used by the `review` agent.
- Modify `packages/opencode/src/command/index.ts`: assign the built-in `/review` command to the `review` agent.
- Modify `packages/opencode/test/agent/agent.test.ts`: add tests for `code`, `build`, `review`, and default compatibility.
- Add or modify `packages/opencode/test/command/command.test.ts`: verify the built-in review command declares `agent: "review"`.
- Create `packages/tui/src/util/agent-label.ts`: map runtime agent ids to product labels and concise descriptions.
- Add `packages/tui/test/util/agent-label.test.ts`: verify display labels for built-ins and pass-through behavior for custom agents.
- Modify `packages/tui/src/component/dialog-agent.tsx`: use product labels/descriptions while returning runtime ids.
- Modify `packages/tui/src/component/prompt/index.tsx`: render product mode labels and ASCII separators in prompt metadata.
- Modify `packages/tui/src/routes/session/index.tsx`: when `plan_exit` returns from plan mode, set the code-capable runtime id consistently.
- Run `bun test` targets from `packages/opencode` and `packages/tui` as specified below.

---

### Task 1: Agent Runtime Adds Code And Review

**Files:**
- Modify: `packages/opencode/src/agent/agent.ts`
- Create: `packages/opencode/src/agent/prompt/review.txt`
- Modify: `packages/opencode/test/agent/agent.test.ts`

**Interfaces:**
- Produces: built-in primary agents `code` and `review` through `Agent.Service.list()` and `Agent.Service.get(name)`.
- Produces: `code` permissions equivalent to `build` for Phase 1.
- Produces: `review` as a visible primary native agent with review-specific prompt.
- Preserves: `Agent.Service.defaultAgent()` returns `build` unless config says otherwise.

- [ ] **Step 1: Write failing tests for built-in code and review agents**

Add these tests near the existing default-agent tests in `packages/opencode/test/agent/agent.test.ts`:

```ts
it.instance("returns code and review native primary agents", () =>
  Effect.gen(function* () {
    const agents = yield* load((svc) => svc.list())
    const names = agents.map((a) => a.name)
    expect(names).toContain("build")
    expect(names).toContain("code")
    expect(names).toContain("review")

    const code = yield* load((svc) => svc.get("code"))
    const review = yield* load((svc) => svc.get("review"))
    expect(code?.mode).toBe("primary")
    expect(code?.native).toBe(true)
    expect(review?.mode).toBe("primary")
    expect(review?.native).toBe(true)
    expect(review?.hidden).toBeUndefined()
  }),
)

it.instance("code agent preserves build permissions in phase one", () =>
  Effect.gen(function* () {
    const build = yield* load((svc) => svc.get("build"))
    const code = yield* load((svc) => svc.get("code"))
    expect(code).toBeDefined()
    expect(build).toBeDefined()
    expect(evalPerm(code, "edit")).toBe(evalPerm(build, "edit"))
    expect(evalPerm(code, "bash")).toBe(evalPerm(build, "bash"))
    expect(Permission.evaluate("plan_enter", "*", code!.permission).action).toBe(
      Permission.evaluate("plan_enter", "*", build!.permission).action,
    )
  }),
)

it.instance("review agent has a review prompt and asks before generic edits", () =>
  Effect.gen(function* () {
    const review = yield* load((svc) => svc.get("review"))
    expect(review).toBeDefined()
    expect(review?.description).toContain("Review")
    expect(review?.prompt).toContain("code reviewer")
    expect(evalPerm(review, "read")).toBe("allow")
    expect(evalPerm(review, "grep")).toBe("allow")
    expect(evalPerm(review, "edit")).toBe("ask")
  }),
)
```

- [ ] **Step 2: Run tests and verify they fail**

Run from `packages/opencode`:

```bash
bun test test/agent/agent.test.ts --timeout 30000
```

Expected: FAIL because `code` and `review` are not in the built-in agent list.

- [ ] **Step 3: Add review prompt file**

Create `packages/opencode/src/agent/prompt/review.txt`:

```text
You are Axon's code review agent.

Review code changes with a bug-finding mindset. Prioritize correctness, regressions, security issues, missing tests, and maintainability risks that can cause real problems.

When reviewing, inspect the diff first, then read the relevant surrounding files before making claims. Report findings first, ordered by severity, with file and line references when available. Keep summaries brief and secondary.

Do not edit files during a pure review. If the user explicitly asks you to fix review findings, keep the fix scoped and verify it.
```

- [ ] **Step 4: Add code and review agents**

Modify `packages/opencode/src/agent/agent.ts`:

1. Import the review prompt:

```ts
import PROMPT_REVIEW from "./prompt/review.txt"
```

2. Add `code` immediately after `build`. Use the same effective permission shape as `build`:

```ts
          code: {
            name: "code",
            description: "Code mode. Implements, edits, refactors, runs tests, and completes coding tasks.",
            options: {},
            permission: Permission.merge(
              defaults,
              Permission.fromConfig({
                question: "allow",
                plan_enter: "allow",
              }),
              user,
            ),
            mode: "primary",
            native: true,
          },
```

3. Add `review` near `debug` and `orchestrator`:

```ts
          review: {
            name: "review",
            description: "Review mode. Reviews diffs, branch changes, and PR feedback before implementation.",
            options: {},
            prompt: PROMPT_REVIEW,
            permission: Permission.merge(
              defaults,
              Permission.fromConfig({
                question: "allow",
                edit: {
                  "*": "ask",
                },
                plan_enter: "allow",
              }),
              user,
            ),
            mode: "primary",
            native: true,
          },
```

- [ ] **Step 5: Run tests and verify they pass**

Run from `packages/opencode`:

```bash
bun test test/agent/agent.test.ts --timeout 30000
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/opencode/src/agent/agent.ts packages/opencode/src/agent/prompt/review.txt packages/opencode/test/agent/agent.test.ts
git commit -m "feat(opencode): add code and review agents"
```

---

### Task 2: Built-In Review Command Uses Review Agent

**Files:**
- Modify: `packages/opencode/src/command/index.ts`
- Add or modify: `packages/opencode/test/command/command.test.ts`

**Interfaces:**
- Produces: `Command.Service.get("review")` returns an `Info` object with `agent: "review"`.
- Preserves: existing `/review` template, description, hints, and `subtask: true`.

- [ ] **Step 1: Write failing command test**

If `packages/opencode/test/command/command.test.ts` does not exist, create it with the same fixture style used by nearby service tests. Add:

```ts
import { expect } from "bun:test"
import { Effect } from "effect"
import { testEffect } from "../lib/effect"
import { Command } from "../../src/command"

const it = testEffect(Command.defaultLayer)

it.instance("built-in review command uses review agent", () =>
  Effect.gen(function* () {
    const command = yield* Command.Service.use((svc) => svc.get("review"))
    expect(command?.agent).toBe("review")
    expect(command?.subtask).toBe(true)
    expect(command?.hints).toContain("$ARGUMENTS")
  }),
)
```

If the required layer composition differs, adapt only enough to match existing command-service test patterns.

- [ ] **Step 2: Run test and verify it fails**

Run from `packages/opencode`:

```bash
bun test test/command/command.test.ts --timeout 30000
```

Expected: FAIL because the built-in review command currently has no `agent`.

- [ ] **Step 3: Set the built-in review command agent**

Modify `packages/opencode/src/command/index.ts`:

```ts
      commands[Default.REVIEW] = {
        name: Default.REVIEW,
        description: "review changes [commit|branch|pr], defaults to uncommitted",
        source: "command",
        agent: "review",
        get template() {
          return PROMPT_REVIEW.replace("${path}", ctx.worktree)
        },
        subtask: true,
        hints: hints(PROMPT_REVIEW),
      }
```

- [ ] **Step 4: Run command test and agent test**

Run from `packages/opencode`:

```bash
bun test test/command/command.test.ts test/agent/agent.test.ts --timeout 30000
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/opencode/src/command/index.ts packages/opencode/test/command/command.test.ts
git commit -m "feat(opencode): route review command to review agent"
```

---

### Task 3: Centralize Agent Product Labels In TUI

**Files:**
- Create: `packages/tui/src/util/agent-label.ts`
- Create: `packages/tui/test/util/agent-label.test.ts`
- Modify: `packages/tui/src/component/dialog-agent.tsx`
- Modify: `packages/tui/src/component/prompt/index.tsx`
- Modify: `packages/tui/src/routes/session/index.tsx`

**Interfaces:**
- Produces: `agentLabel(agentName: string): string`
- Produces: `agentDescription(agent: { name: string; native?: boolean; description?: string }): string | undefined`
- Produces: runtime `build` and `code` display as `Code`.
- Preserves: custom agent names display unchanged.

- [ ] **Step 1: Write failing utility tests**

Create `packages/tui/test/util/agent-label.test.ts`:

```ts
import { describe, expect, test } from "bun:test"
import { agentDescription, agentLabel } from "../../src/util/agent-label"

describe("agent labels", () => {
  test("maps built-in coding agents to Code", () => {
    expect(agentLabel("build")).toBe("Code")
    expect(agentLabel("code")).toBe("Code")
  })

  test("maps built-in product modes", () => {
    expect(agentLabel("ask")).toBe("Ask")
    expect(agentLabel("plan")).toBe("Plan")
    expect(agentLabel("debug")).toBe("Debug")
    expect(agentLabel("review")).toBe("Review")
    expect(agentLabel("orchestrator")).toBe("Orchestrator")
  })

  test("leaves custom agents readable", () => {
    expect(agentLabel("my_custom_agent")).toBe("My Custom Agent")
  })

  test("uses product descriptions for built-ins and custom descriptions otherwise", () => {
    expect(agentDescription({ name: "build", native: true })).toBe("Build and edit code")
    expect(agentDescription({ name: "review", native: true })).toBe("Review diffs and PR feedback")
    expect(agentDescription({ name: "custom", description: "Custom work" })).toBe("Custom work")
  })
})
```

- [ ] **Step 2: Run test and verify it fails**

Run from `packages/tui`:

```bash
bun test test/util/agent-label.test.ts --timeout 30000
```

Expected: FAIL because `src/util/agent-label.ts` does not exist.

- [ ] **Step 3: Implement label utility**

Create `packages/tui/src/util/agent-label.ts`:

```ts
import { Locale } from "./locale"

const labels: Record<string, string> = {
  build: "Code",
  code: "Code",
  ask: "Ask",
  plan: "Plan",
  debug: "Debug",
  review: "Review",
  orchestrator: "Orchestrator",
}

const descriptions: Record<string, string> = {
  build: "Build and edit code",
  code: "Build and edit code",
  ask: "Explain without editing",
  plan: "Plan before changing code",
  debug: "Diagnose and fix failures",
  review: "Review diffs and PR feedback",
  orchestrator: "Coordinate larger work",
}

export function agentLabel(name: string) {
  return labels[name] ?? Locale.titlecase(name.replaceAll("_", " "))
}

export function agentDescription(agent: { name: string; native?: boolean; description?: string }) {
  return descriptions[agent.name] ?? agent.description ?? (agent.native ? "native" : undefined)
}
```

- [ ] **Step 4: Update dialog-agent to use labels**

Modify `packages/tui/src/component/dialog-agent.tsx`:

```ts
import { agentDescription, agentLabel } from "../util/agent-label"
```

Then change option creation:

```ts
        title: agentLabel(item.name),
        description: agentDescription(item),
```

Keep `value: item.name`.

- [ ] **Step 5: Update prompt metadata labels and separators**

Modify `packages/tui/src/component/prompt/index.tsx`:

1. Import:

```ts
import { agentLabel } from "../../util/agent-label"
```

2. Replace the agent label render:

```tsx
{store.mode === "shell" ? "Shell" : agentLabel(agent().name)}
```

3. Replace visible separator glyphs in this metadata block with ASCII `-` to avoid Windows terminal mojibake:

```tsx
<text fg={fadeColor(theme.textMuted, modelMetaAlpha())}>-</text>
```

and:

```tsx
<text fg={fadeColor(theme.textMuted, variantMetaAlpha())}>-</text>
```

- [ ] **Step 6: Update plan exit transition**

Modify `packages/tui/src/routes/session/index.tsx` so `plan_exit` returns to the runtime code-capable agent that exists.

If `local.agent.set("code")` is safe after Task 1, use:

```ts
      local.agent.set("code")
```

If `code` is not present in older connected servers, add a small fallback inline without a helper:

```ts
      local.agent.set(local.agent.list().some((agent) => agent.name === "code") ? "code" : "build")
```

Keep `plan_enter` as `plan`.

- [ ] **Step 7: Run TUI utility test**

Run from `packages/tui`:

```bash
bun test test/util/agent-label.test.ts --timeout 30000
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/tui/src/util/agent-label.ts packages/tui/test/util/agent-label.test.ts packages/tui/src/component/dialog-agent.tsx packages/tui/src/component/prompt/index.tsx packages/tui/src/routes/session/index.tsx
git commit -m "feat(tui): show codex-like mode labels"
```

---

### Task 4: Verification And Release Readiness

**Files:**
- No planned source modifications unless verification exposes a bug.

**Interfaces:**
- Produces: passing targeted tests and package typecheck.
- Produces: a branch ready to push.

- [ ] **Step 1: Run targeted tests**

Run from `packages/opencode`:

```bash
bun test test/agent/agent.test.ts test/command/command.test.ts --timeout 30000
```

Expected: PASS.

Run from `packages/tui`:

```bash
bun test test/util/agent-label.test.ts --timeout 30000
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run from `packages/opencode`:

```bash
bun typecheck
```

Expected: PASS.

- [ ] **Step 3: Build a local binary smoke test if typecheck passes**

Run from `packages/opencode`:

```bash
bun run script/build.ts --single --skip-embed-web-ui
```

Expected: build succeeds and smoke test prints a version.

- [ ] **Step 4: Smoke-check CLI help**

Run from `packages/opencode`:

```bash
dist/axon-windows-x64/bin/axon.exe --help
```

Expected: help output still uses `axon` and does not mention `OpenCode` in visible command headings.

- [ ] **Step 5: Review diff**

Run from repo root:

```bash
git diff --stat origin/dev...HEAD
git diff --stat
```

Expected: only planned files plus committed docs are changed; `.mimocode/` remains untracked and untouched.

- [ ] **Step 6: Push branch**

Run from repo root:

```bash
git push origin axon-rebrand --no-verify
```

Expected: branch updates. Use `--no-verify` only if the known unrelated Windows symlink pre-push issue still blocks full repo typecheck.
