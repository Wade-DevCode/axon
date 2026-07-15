import { describe, expect, test } from "bun:test"
import type { ToolPart, ToolState } from "@opencode-ai/sdk/v2"
import { changeSummary, toolRow } from "../../../src/routes/session/presentation"

function tool(name: string, state: ToolState, id = `${name}-part`): ToolPart {
  return {
    id,
    sessionID: "session",
    messageID: "message",
    type: "tool",
    callID: `${name}-call`,
    tool: name,
    state,
  }
}

function completed(name: string, input: Record<string, unknown>, metadata: Record<string, unknown>): ToolPart {
  return tool(name, {
    status: "completed",
    input,
    output: "",
    title: "Completed title",
    metadata,
    time: { start: 100, end: 112 },
  })
}

describe("toolRow", () => {
  test("maps pending tools without a duration", () => {
    expect(toolRow(tool("read", { status: "pending", input: { filePath: "src/a.ts" }, raw: "" }), 120)).toEqual({
      id: "read-part",
      kind: "Read",
      label: "read",
      target: "src/a.ts",
      status: "pending",
    })
  })

  test("uses supplied time for running tools and target precedence", () => {
    expect(
      toolRow(
        tool("grep", {
          status: "running",
          input: {
            filePath: "src/a.ts",
            pattern: "ignored",
            command: "ignored",
            description: "ignored",
          },
          title: "Ignored title",
          time: { start: 100 },
        }),
        120,
      ),
    ).toMatchObject({ kind: "Search", target: "src/a.ts", status: "running", duration: 20 })
  })

  test("maps completed tools and falls through target candidates", () => {
    expect(toolRow(completed("bash", { command: "bun test" }, {}))).toMatchObject({
      kind: "Run",
      target: "bun test",
      status: "success",
      duration: 12,
    })
    expect(toolRow(completed("task", { description: "Inspect metadata" }, {})).target).toBe("Inspect metadata")
    expect(toolRow(completed("write", {}, {})).target).toBe("Completed title")
    expect(
      toolRow(
        completed("edit", { filePath: "src/a.ts" }, {
          diff: "--- old\n+++ new\n@@ -1 +1,2 @@\n-old\n+new\n+extra",
        }),
      ),
    ).toMatchObject({ additions: 2, deletions: 1 })
  })

  test("distinguishes failed and cancelled errors", () => {
    expect(
      toolRow(
        tool("bash", {
          status: "error",
          input: { command: "bun test" },
          error: "Request aborted by user",
          time: { start: 100, end: 110 },
        }),
      ),
    ).toMatchObject({ status: "cancelled", error: "Request aborted by user", duration: 10 })
    expect(
      toolRow(
        tool("bash", {
          status: "error",
          input: { command: "bun test" },
          error: "Process exited 1",
          time: { start: 100, end: 110 },
        }),
      ),
    ).toMatchObject({ status: "failed", error: "Process exited 1" })
  })

  test("preserves unknown plugin names as readable title case", () => {
    expect(toolRow(completed("custom_plugin-tool", { pattern: "needle" }, {}))).toMatchObject({
      kind: "Custom Plugin Tool",
      label: "custom_plugin-tool",
      target: "needle",
    })
  })

  test("aggregates proven ApplyPatch counts for one activity row", () => {
    expect(
      toolRow(
        completed("apply_patch", {}, {
          files: [
            { relativePath: "a.ts", patch: "--- old\n+++ new\n@@ -1 +1 @@\n-one\n+two" },
            { relativePath: "b.ts", patch: "--- old\n+++ new\n@@ -0,0 +1,2 @@\n+three\n+four" },
          ],
        }),
      ),
    ).toMatchObject({ additions: 3, deletions: 1 })
  })
})

describe("changeSummary", () => {
  test("counts Edit diffs without diff headers", () => {
    expect(
      changeSummary([
        completed("edit", { filePath: "src/a.ts" }, {
          diff: "--- a/src/a.ts\n+++ b/src/a.ts\n@@ -1,2 +1,3 @@\n-old\n+new\n+extra\n context",
        }),
      ]),
    ).toEqual([{ path: "src/a.ts", additions: 2, deletions: 1 }])
  })

  test("does not mistake content beginning with three signs for diff headers", () => {
    expect(
      changeSummary([
        completed("edit", { filePath: "src/a.ts" }, {
          diff: "--- a/src/a.ts\n+++ b/src/a.ts\n@@ -1 +1 @@\n----old\n++++new",
        }),
      ]),
    ).toEqual([{ path: "src/a.ts", additions: 1, deletions: 1 }])
  })

  test("counts header-lookalike lines inside a hunk body", () => {
    expect(
      changeSummary([
        completed("edit", { filePath: "src/a.ts" }, {
          diff: "--- src/a.ts\n+++ src/a.ts\n@@ -1 +1 @@\n--- old\n+++ new",
        }),
      ]),
    ).toEqual([{ path: "src/a.ts", additions: 1, deletions: 1 }])
  })

  test("rejects invented hunks whose body does not match declared counts", () => {
    expect(
      changeSummary([
        completed("edit", { filePath: "src/a.ts" }, {
          diff: "--- src/a.ts\n+++ src/a.ts\n@@ -1,2 +1,2 @@\n-old\n+new",
        }),
      ]),
    ).toEqual([{ path: "src/a.ts" }])
  })

  test("rejects invented hunks containing invalid body lines", () => {
    expect(
      changeSummary([
        completed("edit", { filePath: "src/a.ts" }, {
          diff: "--- src/a.ts\n+++ src/a.ts\n@@ -1 +1 @@\n?invented\n-old\n+new",
        }),
      ]),
    ).toEqual([{ path: "src/a.ts" }])
  })

  test("validates multiple hunks and no-newline markers", () => {
    expect(
      changeSummary([
        completed("edit", { filePath: "src/a.ts" }, {
          diff:
            "--- src/a.ts\n+++ src/a.ts\n@@ -1 +1 @@\n-old\n\\ No newline at end of file\n+new\n\\ No newline at end of file\n@@ -10 +10,2 @@\n context\n+extra",
        }),
      ]),
    ).toEqual([{ path: "src/a.ts", additions: 2, deletions: 1 }])
  })

  test("does not prove zero counts from an arbitrary string", () => {
    expect(
      changeSummary([completed("edit", { filePath: "src/a.ts" }, { diff: "not a unified diff" })]),
    ).toEqual([{ path: "src/a.ts" }])
  })

  test("supports Write metadata while omitting unprovable counts", () => {
    expect(changeSummary([completed("write", { filePath: "src/write.ts" }, { filepath: "src/write.ts" })])).toEqual([
      { path: "src/write.ts" },
    ])
    expect(
      changeSummary([
        completed("write", { filePath: "src/write.ts" }, {
          diff: "--- old\n+++ new\n@@ -1 +1 @@\n-old\n+new",
        }),
      ]),
    ).toEqual([{ path: "src/write.ts", additions: 1, deletions: 1 }])
  })

  test("validates and counts ApplyPatch file patches", () => {
    expect(
      changeSummary([
        completed("apply_patch", {}, {
          files: [
            null,
            { relativePath: "src/b.ts" },
            {
              relativePath: "src/a.ts",
              filePath: "C:/repo/src/a.ts",
              patch: "--- old\n+++ new\n@@ -1 +1 @@\n-one\n+two",
              additions: 99,
              deletions: 99,
            },
          ],
        }),
      ]),
    ).toEqual([
      { path: "src/a.ts", additions: 1, deletions: 1 },
      { path: "src/b.ts" },
    ])
  })

  test("merges duplicate proven counts and sorts paths", () => {
    expect(
      changeSummary([
        completed("edit", { filePath: "z.ts" }, { diff: "--- old\n+++ new\n@@ -0,0 +1 @@\n+one" }),
        completed("write", { filePath: "a.ts" }, { diff: "--- old\n+++ new\n@@ -1 +0,0 @@\n-one" }),
        completed("edit", { filePath: "z.ts" }, {
          diff: "--- old\n+++ new\n@@ -1 +1 @@\n-three\n+two",
        }),
      ]),
    ).toEqual([
      { path: "a.ts", additions: 0, deletions: 1 },
      { path: "z.ts", additions: 2, deletions: 1 },
    ])
  })

  test("keeps a known path but drops counts when duplicate metadata is incomplete", () => {
    expect(
      changeSummary([
        completed("edit", { filePath: "src/a.ts" }, { diff: "--- old\n+++ new\n@@ -0,0 +1 @@\n+one" }),
        completed("write", { filePath: "src/a.ts" }, {}),
      ]),
    ).toEqual([{ path: "src/a.ts" }])
  })

  test("ignores non-mutation tools and malformed metadata", () => {
    expect(
      changeSummary([
        completed("read", { filePath: "src/a.ts" }, { diff: "+invented" }),
        completed("edit", {}, { diff: "+missing path" }),
        completed("apply_patch", {}, { files: "not an array" }),
      ]),
    ).toEqual([])
  })
})
