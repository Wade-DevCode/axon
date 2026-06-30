# Codex-Like Modes Phase 1 Design

## Goal

Move Axon from a rebranded opencode-style agent selector toward a Codex-like coding agent product by making modes, agents, review, and permissions understandable as first-class product concepts.

Phase 1 must improve user-facing structure without destabilizing the runtime. It should reuse the existing agent and permission system, preserve existing `build` compatibility, and avoid changing execution semantics beyond explicitly scoped defaults.

## Current State

Axon already has the core primitives needed for a Codex-like experience:

- Built-in primary agents: `build`, `plan`, `ask`, `debug`, and `orchestrator`.
- Subagents: `general`, `explore`, and internal summary/title/compaction agents.
- Permission rules per agent, with interactive permission prompts.
- `/review` command and diff viewer support.
- Agent cycling and agent selection in the TUI prompt.
- Plan enter/exit tooling through `plan_enter` and `plan_exit`.

The gap is product shape. Users see internal agent names and isolated commands instead of a clear coding workflow. Codex exposes modes, review, permissions, subagents, and status as coherent controls; Axon currently exposes most pieces but does not connect them.

## Product Model

Phase 1 introduces two user-facing concepts while keeping the existing runtime model:

### Work Mode

Work mode is the user's intent for the next prompt. It maps to an Axon primary agent.

| User-facing mode | Runtime agent | Purpose |
| --- | --- | --- |
| `Code` | `code`, compatible with `build` | Implement, edit, refactor, run tests, and complete coding tasks. |
| `Ask` | `ask` | Read-only Q&A and explanation. |
| `Plan` | `plan` | Plan first; avoid regular source edits except plan files. |
| `Debug` | `debug` | Diagnose failures and fix root causes systematically. |
| `Review` | `review` | Review local diffs, branch changes, or PR feedback. |
| `Orchestrator` | `orchestrator` | Break large work into subtasks and coordinate subagents. |

`build` remains accepted everywhere as a legacy alias. New UI should prefer `Code`.

### Permission Posture

Permission posture describes how much autonomy Axon has. Phase 1 only surfaces and maps existing permission behavior; it does not introduce a new sandbox engine.

| User-facing posture | Phase 1 behavior |
| --- | --- |
| `Read Only` | Prefer `Ask` or `Plan`; deny edit-like permissions for the active mode. |
| `Ask Before Edit` | Default posture: allow reads, ask for edits or sensitive commands according to current permission rules. |
| `Auto Edit` | Use existing saved/session permissions where configured; do not bypass dangerous prompts. |
| `Full Access` | Reserved label for future explicit high-autonomy configuration; Phase 1 should not silently enable it. |

The TUI can display posture as a summary derived from the active agent and pending/saved permissions. A full persistent posture editor can come later.

## Scope

Phase 1 should include:

- Add a `code` primary agent whose behavior is equivalent to `build`.
- Preserve `build` as a legacy alias for configs, sessions, CLI flags, and older transcripts.
- Add a `review` primary agent with review-focused prompt and permissions.
- Prefer user-facing labels in TUI: `Code`, `Ask`, `Plan`, `Debug`, `Review`, `Orchestrator`.
- Update prompt/footer metadata to show `Mode - Permission posture - Model`.
- Route `/review` through the `review` agent where practical.
- Keep existing slash commands, session storage, and config compatibility intact.

Phase 1 should not include:

- Cloud execution.
- Worktree orchestration changes.
- Automatic security classifier or auto-review approval agent.
- A new permission engine.
- Breaking changes to agent names in persisted sessions.
- Large UI redesign outside the prompt/footer/agent selector/status surfaces.

## Compatibility Rules

- Existing `build` references must continue to work.
- If a session or config selects `build`, the UI may display `Code`, but runtime behavior should remain compatible.
- New sessions should default to `code` only if compatibility tests confirm old session resume and CLI `--agent build` remain stable.
- If defaulting to `code` is risky, keep runtime default as `build` and display it as `Code` in the UI. This is acceptable for Phase 1.
- Custom user agents must keep their configured names.
- Existing hidden agents must remain hidden.

## Review Agent

The `review` agent should be a primary visible mode.

Purpose:

- Review uncommitted changes, branch diffs, and PR context.
- Prioritize correctness bugs, regressions, security risks, missing tests, and maintainability risks.
- Avoid making edits unless the user explicitly asks it to address findings.

Initial permission stance:

- Reads, grep, glob, list, bash, webfetch, and websearch can follow existing default permission rules.
- Edit should default to ask or deny depending on whether the request is a pure review or "fix the review findings."
- Phase 1 can implement review as a prompt-level behavior first, while using existing permission prompts for edits.

## TUI Behavior

Prompt metadata should communicate three things:

```text
Code - Ask Before Edit - model-name provider
```

When space is constrained, prioritize:

```text
Code - model-name
```

Agent selector should show product labels and descriptions:

- `Code`: Build and edit code
- `Ask`: Explain without editing
- `Plan`: Plan before changing code
- `Debug`: Diagnose and fix failures
- `Review`: Review diffs and PR feedback
- `Orchestrator`: Coordinate larger work

The selector should still return the runtime agent id.

## Commands

`/review` should continue to work as a workflow command. When it submits a prompt, it should prefer the `review` agent so review output has a consistent stance.

Future commands can build on this model:

- `/verify`: run focused validation and summarize evidence.
- `/mode`: switch user-facing work mode.
- `/permissions`: adjust permission posture more directly.

Phase 1 does not need to implement all future commands.

## Data Flow

1. Server exposes agents as it does today.
2. Agent list includes `code` and `review`, plus legacy `build`.
3. TUI normalizes display labels for built-in agents.
4. Prompt submit sends the selected runtime agent id.
5. Session history keeps the runtime agent id for compatibility.
6. Transcript and UI render built-in agent ids through the display-label mapping.

## Testing Strategy

Tests should cover behavior rather than labels only:

- Agent service includes `code`, `build`, and `review`.
- `code` and `build` share equivalent permissions in Phase 1.
- `build` remains accepted through CLI/config/session paths.
- Agent selector displays `Code` for the code-capable default.
- `/review` uses or selects the review agent where the command path supports agent selection.
- Existing typecheck passes from `packages/opencode`.

Manual verification:

- Start Axon TUI and confirm default prompt metadata shows `Code`.
- Cycle agents and confirm expected product labels appear.
- Run `/review` and confirm review stance.
- Resume an old session with `build` and confirm it still opens and displays as `Code`.

## Open Decisions

- Whether new sessions should persist `code` or continue persisting `build` while displaying `Code`.
- Whether Phase 1 should include a visible `/mode` command or rely on existing agent selection.
- Whether `Review` should deny edits by default or allow edits with prompts when the user asks it to fix findings.

Recommendation:

- Persist `build` for the first implementation if the current session assumptions are broad; display it as `Code`.
- Add `review` as a real primary agent.
- Defer `/mode` until after the prompt/footer and selector model are stable.
