# Axon TUI Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh Axon's default TUI presentation and add restrained `author: WANGHUI` branding.

**Architecture:** Keep changes in shared TUI surfaces instead of changing session state or provider logic. The first task adds reusable product metadata, then home/status surfaces consume it. Theme and shared primitives carry most visual changes so individual feature screens remain stable.

**Tech Stack:** Solid JSX TUI components in `packages/tui`, OpenTUI renderables, JSON theme asset, Bun test/typecheck/build.

## Global Constraints

- Author display text must be exactly `author: WANGHUI`.
- Product metadata must show Product `Axon`, Author `WANGHUI`, Package `@wanghuimvp/axon`, and runtime version.
- Do not change provider, model, auth, permission, session data, or keybinding behavior.
- Do not add author text to the always-visible session footer.
- Avoid broad edits to `packages/tui/src/routes/session/index.tsx`; prefer shared visual primitives.
- No new Axon-branded public text may appear in changed surfaces.

---

## File Structure

- `packages/tui/src/util/product.ts`: new small metadata module for product name, author label, package name, and version.
- `packages/tui/src/routes/home.tsx`: home surface uses product metadata for the author signature under the logo.
- `packages/tui/src/component/dialog-status.tsx`: status dialog renders product metadata before operational sections.
- `packages/tui/src/theme/assets/axon.json`: refresh default Axon theme colors.
- `packages/tui/src/ui/dialog.tsx`: shared dialog panel adds border and slightly improved spacing.
- `packages/tui/src/ui/dialog-select.tsx`: shared selector improves title, filter, selected row, footer action treatment.
- `packages/tui/src/routes/session/footer.tsx`: session footer gets cleaner grouped status presentation.
- `packages/tui/test/util/product.test.ts`: validates stable product metadata.

---

### Task 1: Product Metadata And Author Surfaces

**Files:**
- Create: `packages/tui/src/util/product.ts`
- Create: `packages/tui/test/util/product.test.ts`
- Modify: `packages/tui/src/routes/home.tsx`
- Modify: `packages/tui/src/component/dialog-status.tsx`

**Interfaces:**
- Produces: `Product.info` object with `name`, `author`, `authorSignature`, `packageName`, `version`.
- Consumes: `AXON_VERSION` global constant already injected into packaged builds.

- [ ] **Step 1: Add failing metadata test**

Create `packages/tui/test/util/product.test.ts`:

```ts
import { expect, test } from "bun:test"
import { Product } from "../../src/util/product"

test("product metadata exposes Axon author signature", () => {
  expect(Product.info.name).toBe("Axon")
  expect(Product.info.author).toBe("WANGHUI")
  expect(Product.info.authorSignature).toBe("author: WANGHUI")
  expect(Product.info.packageName).toBe("@wanghuimvp/axon")
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/util/product.test.ts --timeout 30000` from `packages/tui`.

Expected: FAIL because `../../src/util/product` does not exist.

- [ ] **Step 3: Add product metadata**

Create `packages/tui/src/util/product.ts`:

```ts
declare const AXON_VERSION: string

export namespace Product {
  export const info = {
    name: "Axon",
    author: "WANGHUI",
    authorSignature: "author: WANGHUI",
    packageName: "@wanghuimvp/axon",
    version: typeof AXON_VERSION === "string" ? AXON_VERSION : "dev",
  } as const
}
```

- [ ] **Step 4: Render author signature on home**

In `packages/tui/src/routes/home.tsx`, import `useTheme`, `TextAttributes`, and `Product`. Render a centered muted line directly below the logo:

```tsx
<box flexShrink={0} paddingTop={1}>
  <text fg={theme.textMuted} attributes={TextAttributes.BOLD}>
    {Product.info.authorSignature}
  </text>
</box>
```

Keep the existing prompt spacing and slots intact.

- [ ] **Step 5: Add product metadata to Status dialog**

In `packages/tui/src/component/dialog-status.tsx`, import `Product` and render a compact metadata block after the title row:

```tsx
<box border={["left"]} borderColor={theme.borderSubtle} paddingLeft={1}>
  <text fg={theme.text}>
    Product <span style={{ fg: theme.textMuted }}>{Product.info.name}</span>
  </text>
  <text fg={theme.text}>
    Author <span style={{ fg: theme.textMuted }}>{Product.info.author}</span>
  </text>
  <text fg={theme.text}>
    Package <span style={{ fg: theme.textMuted }}>{Product.info.packageName}</span>
  </text>
  <text fg={theme.text}>
    Version <span style={{ fg: theme.textMuted }}>{Product.info.version}</span>
  </text>
</box>
```

- [ ] **Step 6: Verify and commit**

Run from `packages/tui`:

```powershell
bun test test/util/product.test.ts --timeout 30000
bun typecheck
```

Expected: both pass.

Commit:

```powershell
git add packages/tui/src/util/product.ts packages/tui/test/util/product.test.ts packages/tui/src/routes/home.tsx packages/tui/src/component/dialog-status.tsx
git commit -m "feat(tui): add axon product metadata"
```

---

### Task 2: Default Axon Theme Refresh

**Files:**
- Modify: `packages/tui/src/theme/assets/axon.json`
- Test: `packages/tui/test/theme.test.ts`

**Interfaces:**
- Consumes: existing `ThemeJson` schema in `packages/tui/src/theme/index.ts`.
- Produces: same theme keys; no new schema fields required.

- [ ] **Step 1: Update theme asset**

Edit `packages/tui/src/theme/assets/axon.json` with a more polished neutral dark/light palette. Keep every existing key present. Use cyan/blue primary accents and amber secondary accent without making the UI one hue.

- [ ] **Step 2: Verify theme schema resolution**

Run from `packages/tui`:

```powershell
bun test test/theme.test.ts --timeout 30000
```

Expected: PASS, proving the default theme still resolves.

- [ ] **Step 3: Commit**

```powershell
git add packages/tui/src/theme/assets/axon.json
git commit -m "feat(tui): refresh default axon theme"
```

---

### Task 3: Shared Dialog And Selector Polish

**Files:**
- Modify: `packages/tui/src/ui/dialog.tsx`
- Modify: `packages/tui/src/ui/dialog-select.tsx`

**Interfaces:**
- Consumes: current `Dialog` and `DialogSelect` props unchanged.
- Produces: no API changes; visual-only changes.

- [ ] **Step 1: Improve shared dialog panel**

In `packages/tui/src/ui/dialog.tsx`, keep overlay behavior unchanged. Add a subtle border and slightly balanced padding to the inner panel:

```tsx
border={["top", "bottom"]}
borderColor={theme.borderSubtle}
paddingTop={1}
paddingBottom={1}
```

- [ ] **Step 2: Improve selector title/filter/selected row treatment**

In `packages/tui/src/ui/dialog-select.tsx`:

- render title in `theme.primary` instead of plain text
- render `esc` as muted but keep clickable behavior
- use `theme.backgroundElement` for focused filter background
- use `theme.accent` for category labels
- use `theme.backgroundElement` when an action is focused and a row is selected

Do not change filtering, keyboard navigation, action callbacks, or selected index logic.

- [ ] **Step 3: Verify TUI tests and typecheck**

Run from `packages/tui`:

```powershell
bun test test/cli/tui/dialog-prompt.test.tsx test/util/agent-label.test.ts --timeout 30000
bun typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add packages/tui/src/ui/dialog.tsx packages/tui/src/ui/dialog-select.tsx
git commit -m "feat(tui): polish dialog surfaces"
```

---

### Task 4: Session Footer Polish And Build Smoke

**Files:**
- Modify: `packages/tui/src/routes/session/footer.tsx`

**Interfaces:**
- Consumes: existing sync, directory, connection, MCP/LSP, and permission signals.
- Produces: same footer content with cleaner grouping; no new state.

- [ ] **Step 1: Restyle footer without changing data**

In `packages/tui/src/routes/session/footer.tsx`, keep all existing memos. Update render output to:

- put the directory in muted text
- render right-side indicators as compact groups
- use consistent status marks for permissions, LSP, MCP
- leave `/status` at the far right in muted text
- do not add author text

- [ ] **Step 2: Run focused checks**

Run from `packages/tui`:

```powershell
bun typecheck
```

Expected: PASS.

- [ ] **Step 3: Build packaged binary smoke**

Run from `packages/axon`:

```powershell
bun run script/build.ts --single --skip-embed-web-ui
.\dist\axon-windows-x64\bin\axon.exe --version
```

Expected: build exits 0 and version prints.

- [ ] **Step 4: Commit**

```powershell
git add packages/tui/src/routes/session/footer.tsx
git commit -m "feat(tui): refine session footer"
```

---

## Plan Self-Review

- Spec coverage: author signature, status metadata, default theme, dialog/selector, footer, and non-goals are covered.
- Placeholder scan: no TBD/TODO placeholders remain.
- Type consistency: all produced interfaces are consumed by later steps using the same names.
