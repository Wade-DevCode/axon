/** @jsxImportSource @opentui/solid */
import { expect, jest, test } from "bun:test"
import type { ToolPart } from "@axon-ai/sdk/v2"
import { testRender } from "@opentui/solid"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { createSignal, type JSX, type Setter } from "solid-js"
import { TuiConfigProvider } from "../../../src/config"
import { KVProvider } from "../../../src/context/kv"
import { ThemeProvider } from "../../../src/context/theme"
import { AxonToolPanel } from "../../../src/routes/session/tool-panel"
import { TestTuiContexts } from "../../fixture/tui-environment"
import { createTuiResolvedConfig } from "../../fixture/tui-runtime"
import { tmpdir } from "../../fixture/fixture"

test("reacts to pending, running, and terminal transitions without leaking its refresh timer", async () => {
  let setPart!: Setter<ToolPart>

  function Fixture() {
    const [part, set] = createSignal<ToolPart>(tool("pending"))
    setPart = set
    return <AxonToolPanel parts={[part()]} density="normal" />
  }

  await using root = await tmpdir()
  const state = await prepareState(root.path)
  const app = await testRender(() => withTheme(() => <Fixture />, root.path, state), { width: 100, height: 10 })
  try {
    for (let attempt = 0; attempt < 200 && !setPart; attempt++) {
      await app.renderOnce()
      await Bun.sleep(10)
    }
    expect(setPart).toBeDefined()
    const handle = 123 as unknown as ReturnType<typeof setInterval>
    const now = jest.spyOn(Date, "now").mockReturnValue(100)
    const interval = jest.spyOn(globalThis, "setInterval").mockReturnValue(handle)
    const clear = jest.spyOn(globalThis, "clearInterval").mockImplementation(() => {})
    expect(app.captureCharFrame()).not.toContain("ms")

    setPart(tool("running"))
    await app.renderOnce()
    const refreshes = interval.mock.calls.filter((call) => call[1] === 1000)
    expect(refreshes).toHaveLength(1)

    now.mockReturnValue(1100)
    ;(refreshes[0]?.[0] as () => void)()
    await app.renderOnce()
    expect(app.captureCharFrame()).toContain("1000 ms")

    setPart(tool("completed"))
    await app.renderOnce()
    expect(clear).toHaveBeenCalledWith(handle)
    expect(app.captureCharFrame()).toContain("150 ms")
  } finally {
    app.renderer.destroy()
    jest.restoreAllMocks()
  }
})

test("keeps compact empty-target and error rows to exactly two lines", async () => {
  const frame = await render(
    () => <AxonToolPanel
      density="compact"
      now={500}
      parts={[
        tool("pending", "mystery_plugin"),
        tool("error", "bash", "Build exploded"),
        tool("error", "bash", "Request aborted"),
      ]}
    />,
    72,
  )
  const lines = visibleLines(frame)

  expect(lines).toEqual([
    "Activity",
    "Mystery Plugin pending",
    "-",
    "Run failed",
    "- · Build exploded",
    "Run cancelled",
    "- · Request aborted",
  ])
})

test("retains concise failed and cancelled errors in normal activity rows", async () => {
  const frame = await render(
    () => <AxonToolPanel
      density="normal"
      now={500}
      parts={[tool("error", "bash", "Build exploded"), tool("error", "bash", "Request aborted")]}
    />,
    100,
  )

  expect(frame).toContain("failed Build exploded")
  expect(frame).toContain("cancelled Request aborted")
})

function tool(status: "pending" | "running" | "completed" | "error", name = "read", error = "") {
  const base = {
    id: `tool-${name}-${status}-${error}`,
    sessionID: "session",
    messageID: "message",
    type: "tool" as const,
    tool: name,
    callID: "call",
  }
  if (status === "pending") return { ...base, state: { status, input: {}, raw: "" } } satisfies ToolPart
  if (status === "running")
    return {
      ...base,
      state: { status, input: {}, title: "", metadata: {}, time: { start: 100 } },
    } satisfies ToolPart
  if (status === "completed")
    return {
      ...base,
      state: { status, input: {}, output: "", title: "", metadata: {}, time: { start: 100, end: 250 } },
    } satisfies ToolPart
  return {
    ...base,
    state: { status, input: {}, error, metadata: {}, time: { start: 100, end: 250 } },
  } satisfies ToolPart
}

async function render(component: () => JSX.Element, width: number) {
  await using root = await tmpdir()
  const state = await prepareState(root.path)
  const app = await testRender(() => withTheme(component, root.path, state), { width, height: 12 })
  try {
    for (let attempt = 0; attempt < 200; attempt++) {
      await app.renderOnce()
      const frame = app.captureCharFrame()
      if (frame.trim()) return frame
      await Bun.sleep(10)
    }
    return app.captureCharFrame()
  } finally {
    app.renderer.destroy()
  }
}

function withTheme(component: () => JSX.Element, directory: string, state: string) {
  return (
    <TestTuiContexts directory={directory} paths={{ home: directory, state, worktree: directory }}>
      <TuiConfigProvider config={createTuiResolvedConfig()}>
        <KVProvider>
          <ThemeProvider mode="dark">{component()}</ThemeProvider>
        </KVProvider>
      </TuiConfigProvider>
    </TestTuiContexts>
  )
}

async function prepareState(directory: string) {
  const state = path.join(directory, "state")
  await mkdir(state, { recursive: true })
  await Bun.write(path.join(state, "kv.json"), "{}")
  return state
}

function visibleLines(frame: string) {
  return frame
    .split("\n")
    .map((line) => line.trim())
    .map((line) => line.replace(/^│\s?/, ""))
    .map((line) => line.replace(/\s+/g, " "))
    .filter(Boolean)
}
