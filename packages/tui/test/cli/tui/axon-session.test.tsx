/** @jsxImportSource @opentui/solid */
import { expect, test } from "bun:test"
import { createTestRenderer } from "@opentui/core/testing"
import { Effect } from "effect"
import type { TuiPluginApi, TuiPromptRef } from "@axon-ai/plugin/tui"
import { Global } from "@axon-ai/core/global"
import type { HostSlots } from "../../../src/plugin/slots"
import { createTuiResolvedConfig } from "../../fixture/tui-runtime"
import { createEventSource, createFetch, directory, json, worktree } from "../../fixture/tui-sdk"

const sessionID = "ses_axon_session"
const session = {
  id: sessionID,
  projectID: "proj_test",
  title: "Axon session layout",
  version: "1.0.0",
  directory,
  time: { created: 1, updated: 30 },
}

const user = {
  id: "msg_user",
  sessionID,
  role: "user" as const,
  agent: "build",
  model: { providerID: "test", modelID: "test-model" },
  time: { created: 1 },
}

const assistant = {
  id: "msg_assistant",
  sessionID,
  role: "assistant" as const,
  parentID: user.id,
  agent: "build",
  mode: "build",
  providerID: "test",
  modelID: "test-model",
  path: { cwd: directory, root: worktree },
  cost: 0,
  tokens: { input: 10_000, output: 1_000, reasoning: 500, cache: { read: 100, write: 0 } },
  time: { created: 2, completed: 30 },
  finish: "stop",
}

const diff = [
  { file: "src/auth.ts", before: "old", after: "new", additions: 1, deletions: 1 },
  { file: "src/session.ts", before: "", after: "new", additions: 1, deletions: 0 },
]

const messages = [
  {
    info: user,
    parts: [{ id: "prt_user", sessionID, messageID: user.id, type: "text", text: "Please inspect auth" }],
  },
  {
    info: assistant,
    parts: [
      { id: "prt_text", sessionID, messageID: assistant.id, type: "text", text: "I found the issue." },
      completedTool("prt_read", "read", { filePath: "src/auth.ts" }, "Read auth"),
      completedTool("prt_search", "grep", { pattern: "refreshToken" }, "Search tokens"),
      completedTool(
        "prt_edit",
        "edit",
        { filePath: "src/auth.ts" },
        "Edit auth",
        "--- src/auth.ts\n+++ src/auth.ts\n@@ -1 +1 @@\n-old\n+new",
      ),
      completedTool("prt_test", "test", { command: "bun test auth" }, "Test auth"),
      completedTool(
        "prt_write",
        "write",
        { filePath: "src/session.ts" },
        "Write session",
        "--- src/session.ts\n+++ src/session.ts\n@@ -0,0 +1 @@\n+new",
      ),
    ],
  },
]

function completedTool(id: string, tool: string, input: Record<string, unknown>, title: string, patch?: string) {
  return {
    id,
    sessionID,
    messageID: assistant.id,
    type: "tool" as const,
    tool,
    callID: `call_${id}`,
    state: {
      status: "completed" as const,
      input,
      output: "ok",
      title,
      metadata: patch ? { diff: patch } : {},
      time: { start: 10, end: 22 },
    },
  }
}

test("renders the real session hierarchy responsively and preserves the Prompt plugin contract", async () => {
  const setup = await createTestRenderer({ width: 140, height: 40, useThread: false })
  setup.renderer.waitForThemeMode = async () => "dark"
  const events = createEventSource()
  const calls = createFetch((url) => {
    const model = {
      id: "test-model",
      providerID: "test",
      name: "Test Model",
      capabilities: {
        toolcall: true,
        attachment: false,
        reasoning: false,
        temperature: true,
        interleaved: false,
        input: { text: true, image: false, audio: false, video: false, pdf: false },
        output: { text: true, image: false, audio: false, video: false, pdf: false },
      },
      api: { id: "test-model", url: "https://example.com", npm: "@ai-sdk/openai" },
      cost: { input: 1, output: 1, cache: { read: 0, write: 0 } },
      limit: { context: 200_000, output: 10_000 },
      status: "active",
      options: {},
      headers: {},
      release_date: "2025-01-01",
      variants: { medium: { reasoningEffort: "medium" } },
    }
    const provider = { id: "test", name: "Test", source: "config", env: [], options: {}, models: { [model.id]: model } }
    if (url.pathname === "/provider") return json({ all: [provider], default: {}, connected: [provider.id] })
    if (url.pathname === "/api/provider")
      return json({ location: { directory, project: { id: "proj_test", directory } }, data: [provider] })
    if (url.pathname === "/api/model")
      return json({ location: { directory, project: { id: "proj_test", directory } }, data: [model] })
    if (url.pathname === "/config/providers") return json({ providers: [provider], default: {} })
    if (url.pathname === "/project/current") return json({ id: "proj_test", worktree })
    if (url.pathname === "/project/proj_test/directory") return json([{ directory: worktree }])
    if (url.pathname === "/agent")
      return json([
        { name: "build", description: "Build agent", mode: "primary", hidden: false, permission: {} },
        { name: "review", description: "Review agent", mode: "primary", hidden: false, permission: {} },
      ])
    if (url.pathname === "/session") return json([session])
    if (url.pathname === `/session/${sessionID}`) return json(session)
    if (url.pathname === `/session/${sessionID}/message`) return json(messages)
    if (url.pathname === `/session/${sessionID}/todo`) return json([])
    if (url.pathname === `/session/${sessionID}/diff`) return json(diff)
    if (url.pathname === "/vcs") return json({ branch: "feature/axon" })
    return undefined
  })
  let api: TuiPluginApi | undefined
  let slots: HostSlots | undefined
  let promptRef: TuiPromptRef | undefined
  let task: Promise<void> | undefined
  let markStarted!: () => void
  const started = new Promise<void>((resolve) => (markStarted = resolve))

  try {
    const { run } = await import("../../../src/app")
    task = Effect.runPromise(
      run({
        url: "http://test",
        directory,
        config: createTuiResolvedConfig({ plugin_enabled: {} }),
        fetch: calls.fetch,
        events: events.source,
        args: {},
        createRenderer: async () => setup.renderer,
        pluginHost: {
          async start(input) {
            api = input.api
            slots = input.runtime.setupSlots(input.api)
            markStarted()
          },
          async dispose() {
            slots?.dispose()
          },
        },
      }).pipe(Effect.provide(Global.defaultLayer)),
    )

    await started
    api!.kv.set("tool_details_visibility", false)
    api!.route.navigate("session", { sessionID })
    const wide = await capture(setup, "Change Summary")
    expect(snapshotFrame(wide)).toMatchSnapshot("wide session")
    expect(wide).toContain("AXON")
    expect(wide).toContain("feature/axon")
    expect(wide).toContain("AX Ready")
    expect(wide).toContain("You")
    expect(wide).toContain("Axon")
    expect(wide).toContain("Read")
    expect(wide).toContain("Search")
    expect(wide).toContain("Edit")
    expect(wide).toContain("Test")
    expect(wide).toContain("Change Summary")
    expect(wide).toContain("Test Model")
    expect(wide).toContain("Test Model · default")
    expect(wide).toContain(directory)
    expect(wide).toContain("2 files changed")
    expect(wide).toContain("12ms")
    expect(wide).toContain("11.6K used")

    api!.keymap.dispatchCommand("session.toggle.actions")
    const detailed = await capture(setup, "1 - old")
    expect(detailed).not.toContain("Change Summary")
    expect(detailed).toContain("Edit src\\auth.ts")
    api!.keymap.dispatchCommand("session.toggle.actions")
    await capture(setup, "Change Summary")

    api!.keymap.dispatchCommand("agent.cycle")
    const selectedAgent = await capture(setup, "AX Ready · review")
    expect(selectedAgent).toContain("Test Model")

    events.emit({
      directory,
      project: "proj_test",
      payload: {
        id: "evt_permission",
        type: "permission.asked",
        properties: {
          id: "permission_test",
          sessionID,
          permission: "edit",
          patterns: [],
          metadata: {},
          always: [],
        },
      },
    })
    const permission = await capture(setup, "Permission required")
    expect(permission).not.toContain("Ask Axon")
    events.emit({
      directory,
      project: "proj_test",
      payload: {
        id: "evt_permission_done",
        type: "permission.replied",
        properties: { sessionID, requestID: "permission_test", reply: "once" },
      },
    })
    events.emit({
      directory,
      project: "proj_test",
      payload: {
        id: "evt_question",
        type: "question.asked",
        properties: {
          id: "question_test",
          sessionID,
          questions: [
            {
              question: "Choose a path",
              header: "Path",
              options: [{ label: "Continue", description: "Keep going" }],
            },
          ],
        },
      },
    })
    const question = await capture(setup, "Choose a path")
    expect(question).not.toContain("Ask Axon")
    events.emit({
      directory,
      project: "proj_test",
      payload: {
        id: "evt_question_done",
        type: "question.rejected",
        properties: { sessionID, requestID: "question_test" },
      },
    })
    expect(await capture(setup, "Test Model")).toContain("Test Model")

    setup.renderer.resize(100, 30)
    const normal = await capture(setup, "Change Summary")
    expect(snapshotFrame(normal)).toMatchSnapshot("normal session")
    expect(normal).toContain("AX Ready · review")

    setup.renderer.resize(72, 40)
    const compact = await capture(setup, "Change Summary")
    // Resize may clip the leading guide cell while preserving the first user message.
    expect(snapshotFrame(compact).replace("\n  ┃\n  ┃  You", "\n\n  ┃  You")).toMatchSnapshot("compact session")
    expect(compact).not.toContain("12 ms")
    expect(compact).toContain("Read")
    expect(compact.indexOf("Read")).toBeLessThan(compact.indexOf("src/auth.ts"))

    setup.renderer.resize(140, 40)
    events.emit({
      directory,
      project: "proj_test",
      payload: {
        id: "evt_session_busy",
        type: "session.status",
        properties: { sessionID, status: { type: "busy" } },
      },
    })
    const working = await capture(setup, "interrupt")
    expect(working).toContain("Working (")
    expect(working).toContain("· esc to interrupt)")
    expect(working.indexOf("Working (")).toBeLessThan(working.lastIndexOf("Test Model"))
    expect(working).toContain("Test Model")
    expect(working).toContain("default")
    expect(working).toContain(directory)
    expect(working).toContain("Context 94% left")
    expect(working).toContain("11.6K used")
    events.emit({
      directory,
      project: "proj_test",
      payload: {
        id: "evt_session_idle",
        type: "session.status",
        properties: { sessionID, status: { type: "idle" } },
      },
    })
    await capture(setup, "AX Ready")

    if (!api || !slots) throw new Error("plugin host did not expose the Session slot fixture")
    const pluginApi = api
    slots.register({
      id: "session-right-probe",
      slots: {
        session_prompt_right() {
          return <text>SESSION RIGHT SLOT</text>
        },
      },
    })
    expect(await capture(setup, "SESSION RIGHT SLOT")).toContain("Test Model")
    slots.register({
      id: "session-prompt-probe",
      slots: {
        session_prompt(_context, props) {
          return (
            <pluginApi.ui.Prompt
              ref={(value) => {
                promptRef = value
                props.ref?.(value)
              }}
              placeholders={{ normal: ["SESSION PROMPT SLOT"], shell: ["SESSION SHELL SLOT"] }}
            />
          )
        },
      },
    })
    const pluginFrame = await capture(setup, "SESSION PROMPT SLOT")
    expect(pluginFrame).toContain("Test Model")
    expect(pluginFrame).toContain("SESSION PROMPT SLOT")
    expect(promptRef).toBeDefined()
    expect(promptRef?.current.input).toBe("")

    setup.renderer.destroy()
    await task
  } finally {
    if (!setup.renderer.isDestroyed) setup.renderer.destroy()
    await task
  }
})

async function capture(setup: Awaited<ReturnType<typeof createTestRenderer>>, content: string) {
  for (let attempt = 0; attempt < 100; attempt++) {
    await Promise.resolve()
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    if (frame.includes(content)) {
      await setup.renderOnce()
      return setup.captureCharFrame()
    }
    await Bun.sleep(10)
  }
  return setup.captureCharFrame()
}

function snapshotFrame(frame: string) {
  return frame
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
}
