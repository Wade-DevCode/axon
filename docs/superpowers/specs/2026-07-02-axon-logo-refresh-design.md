# Axon Logo Refresh Design

## Goal

Replace the current block-style Axon logo with a cleaner terminal-safe wordmark.

## Direction

Use a simple `AXON` wordmark instead of large block art. The logo should feel stable across terminal fonts, avoid noisy symbols, and pair cleanly with the existing `author: WANGHUI` signature.

## Scope

- Update the TUI home logo component.
- Keep the home prompt, slots, and author signature unchanged.
- Prefer plain ASCII display text for the logo.
- Use theme colors for visual hierarchy.

## Non-Goals

- No new image assets.
- No animation.
- No changes to CLI command names, package names, or model/provider behavior.
- No footer author branding.

## Validation

- TUI typecheck passes.
- Home still renders the logo via the existing `Logo` component.
- No new OpenCode-branded public text is introduced.
