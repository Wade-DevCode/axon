/** @jsxImportSource @opentui/solid */
import { expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { TuiConfigProvider } from "../../../src/config"
import { KVProvider } from "../../../src/context/kv"
import { ThemeProvider } from "../../../src/context/theme"
import { ThinkingIndicator } from "../../../src/component/spinner"
import { TestTuiContexts } from "../../fixture/tui-environment"
import { tmpdir } from "../../fixture/fixture"
import { createTuiResolvedConfig } from "../../fixture/tui-runtime"

test("renders the bordered thinking indicator with its status text", async () => {
  await using root = await tmpdir()
  const state = path.join(root.path, "state")
  await mkdir(state, { recursive: true })
  await Bun.write(path.join(state, "kv.json"), "{}")

  const app = await testRender(
    () => (
      <TestTuiContexts directory={root.path} paths={{ home: root.path, state, worktree: root.path }}>
        <TuiConfigProvider config={createTuiResolvedConfig()}>
          <KVProvider>
            <ThemeProvider mode="dark">
              <ThinkingIndicator text="Thinking: Planning typecheck and test runs" />
            </ThemeProvider>
          </KVProvider>
        </TuiConfigProvider>
      </TestTuiContexts>
    ),
    { width: 60, height: 5 },
  )

  try {
    let frame = ""
    for (let attempt = 0; attempt < 100 && !frame.trim(); attempt++) {
      await app.renderOnce()
      frame = app.captureCharFrame()
      if (!frame.trim()) await Bun.sleep(10)
    }
    expect(frame).toContain("•")
    expect(frame).toContain("└─┘")
    expect(frame).toContain("Thinking: Planning typecheck and test runs")

    const initial = frame
    await Bun.sleep(160)
    await app.renderOnce()
    expect(app.captureCharFrame()).not.toBe(initial)
  } finally {
    app.renderer.destroy()
  }
})
