# Axon Logo Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current noisy block logo with a terminal-safe `AXON` wordmark.

**Architecture:** Keep the existing `Logo` component as the home surface API. Simplify its internals to render text with theme colors and no block-art data dependency.

**Tech Stack:** Solid JSX TUI components in `packages/tui`, OpenTUI text attributes, Bun typecheck/build.

## Global Constraints

- Logo text must be plain ASCII `AXON`.
- Keep `author: WANGHUI` unchanged in `packages/tui/src/routes/home.tsx`.
- Do not change home prompt slots or session/footer branding.
- Do not add OpenCode-branded public text.

---

### Task 1: Simplify Logo Component

**Files:**
- Modify: `packages/tui/src/component/logo.tsx`
- Modify: `packages/tui/src/logo.ts`

**Interfaces:**
- Consumes: existing `<Logo />` usage in `packages/tui/src/routes/home.tsx`.
- Produces: same exported `Logo` component.

- [ ] **Step 1: Replace block-art rendering**

Update `packages/tui/src/component/logo.tsx` so it renders a compact centered wordmark:

```tsx
<box flexDirection="column" alignItems="center">
  <box flexDirection="row" gap={1}>
    <text fg={theme.primary} attributes={TextAttributes.BOLD} selectable={false}>AX</text>
    <text fg={theme.text} attributes={TextAttributes.BOLD} selectable={false}>ON</text>
  </box>
</box>
```

- [ ] **Step 2: Remove unused logo art data**

Update `packages/tui/src/logo.ts` to export a small constant for compatibility:

```ts
export const logo = "AXON"
```

Only do this if no other module requires `logo.left`, `logo.right`, `go`, or `marks`.

- [ ] **Step 3: Verify**

Run from `packages/tui`:

```powershell
bun typecheck
```

Run from `packages/opencode` if typecheck passes:

```powershell
bun run script/build.ts --single --skip-embed-web-ui
.\dist\axon-windows-x64\bin\axon.exe --version
```

- [ ] **Step 4: Commit**

```powershell
git add packages/tui/src/component/logo.tsx packages/tui/src/logo.ts
git commit -m "feat(tui): simplify axon logo"
```

## Plan Self-Review

- Spec coverage: wordmark, terminal safety, unchanged author signature, no footer branding.
- Placeholder scan: no TODO/TBD placeholders.
- Type consistency: `Logo` export remains unchanged.
