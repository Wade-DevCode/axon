# Axon TUI Visual Refresh Design

## Goal

Make Axon feel more polished and product-owned without changing core behavior. The first phase should improve the default visual impression of the TUI while keeping interaction logic, provider/model behavior, session state, permissions, and keybindings unchanged.

The target feel is a professional coding agent: calm, readable, modern, and clearly branded as Axon.

## Scope

### Default Theme

Refresh the default `Axon` theme so the app no longer feels like a direct inherited skin. The palette should use a restrained dark base, higher-quality panel contrast, clear active borders, and a small number of brand accents. Avoid a single-hue look and avoid overly decorative gradients or noisy colors.

The theme must preserve:

- readable markdown and syntax colors
- clear success, warning, error, and info states
- usable selected-row contrast in dialogs
- terminal transparency support where the existing theme expects it

### Home And Brand Surface

Add a restrained author signature on the home/start surface:

```text
author: WANGHUI
```

The signature should sit near the Axon logo or product title, not in the always-visible session footer. It should be visible enough to establish authorship, but secondary to the product name and current task entry point.

### Status/About Surface

Expose author information in the status/about-style surface alongside product metadata:

- Product: Axon
- Author: WANGHUI
- Package: `@wanghuimvp/axon`
- Version: current runtime version

This should help users verify the build without cluttering the main session view.

### Session Footer

Make the footer look cleaner and more deliberate:

- keep the directory/path readable but muted
- group LSP/MCP/permission/status indicators with consistent icon weight
- keep `/status` available but visually secondary
- avoid adding author text here, because it competes with operational state

### Dialogs And Selectors

Improve the shared dialog and selection components rather than patching each dialog separately:

- stronger title hierarchy
- cleaner search input area
- more refined selected-row background
- less visually noisy footer shortcut hints
- consistent panel/background/border treatment

The implementation should remain compatible with narrow terminals and existing dialog sizes.

### Tool And Message Presentation

Only make low-risk style adjustments in phase one:

- improve tool-call title contrast and spacing
- make running/completed/error states easier to scan
- avoid changing collapse behavior, transcript ordering, or tool metadata parsing

## Non-Goals

- No rewrite of the session layout.
- No changes to provider, model, auth, or Xiaomi configuration.
- No changes to permission behavior.
- No new keybindings.
- No new animation system.
- No marketing-style landing page inside the TUI.

## Implementation Boundaries

Prefer changes in shared visual primitives:

- `packages/tui/src/theme/assets/axon.json` or equivalent default Axon theme asset
- `packages/tui/src/routes/home.tsx`
- `packages/tui/src/component/logo.tsx` or logo-adjacent home rendering
- `packages/tui/src/component/dialog-status.tsx`
- `packages/tui/src/ui/dialog.tsx`
- `packages/tui/src/ui/dialog-select.tsx`
- `packages/tui/src/routes/session/footer.tsx`

Avoid broad edits to `packages/tui/src/routes/session/index.tsx` unless a small localized style fix is clearly safer there.

## Validation

Run focused tests after implementation:

- TUI unit tests affected by labels or visual helpers
- `bun typecheck` from `packages/tui`
- build smoke from `packages/axon` if the TUI changes affect packaged output

Manual verification should include:

- home screen shows `author: WANGHUI`
- status/about surface shows author and package metadata
- dialog selector remains usable at common terminal widths
- session footer remains readable
- no new Axon-branded public text appears in changed surfaces
