/** @jsxImportSource @opentui/solid */
import { expect, test } from "bun:test"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { testRender, type JSX } from "@opentui/solid"
import { AxonComposer } from "../../../src/component/axon-composer"
import { AxonLogo } from "../../../src/component/axon-logo"
import { Logo } from "../../../src/component/logo"
import { TuiConfigProvider } from "../../../src/config"
import { KVProvider } from "../../../src/context/kv"
import { ThemeProvider } from "../../../src/context/theme"
import { brandDensity } from "../../../src/util/brand-layout"
import { tmpdir } from "../../fixture/fixture"
import { TestTuiContexts } from "../../fixture/tui-environment"
import { createTuiResolvedConfig } from "../../fixture/tui-runtime"

async function renderFrame(component: () => JSX.Element, options: { width: number; height: number }) {
  await using root = await tmpdir()
  const state = path.join(root.path, "state")
  await mkdir(state, { recursive: true })
  await Bun.write(path.join(state, "kv.json"), "{}")

  const app = await testRender(
    () => (
      <TestTuiContexts directory={root.path} paths={{ home: root.path, state, worktree: root.path }}>
        <TuiConfigProvider config={createTuiResolvedConfig()}>
          <KVProvider>
            <ThemeProvider mode="dark">{component()}</ThemeProvider>
          </KVProvider>
        </TuiConfigProvider>
      </TestTuiContexts>
    ),
    options,
  )
  try {
    await app.renderOnce()
    await new Promise((resolve) => setTimeout(resolve, 25))
    await app.renderOnce()
    for (let attempt = 0; attempt < 5; attempt++) {
      const frame = app.captureCharFrame()
      if (frame.trim().length > 0) return frame
      await new Promise((resolve) => setTimeout(resolve, 25))
      await app.renderOnce()
    }
    return app.captureCharFrame()
  } finally {
    app.renderer.destroy()
  }
}

function HomePresentation(props: { width: number; height: number }) {
  const density = brandDensity(props.width, props.height)
  return (
    <box flexDirection="column" width="100%">
      <AxonLogo size={density === "compact" ? "compact" : "full"} />
      <AxonComposer density={density} focused>
        <text>Prompt slot</text>
      </AxonComposer>
    </box>
  )
}

test("renders a stable full Axon wordmark without block escapes", async () => {
  const frame = await renderFrame(() => <AxonLogo size="full" />, { width: 100, height: 12 })

  expect(frame).toContain("A X O N")
  expect(frame).toContain("Developer Agent for the Terminal")
  expect(frame).not.toContain("u2588")
  expect(frame).not.toMatch(/[█▀▄]/)
})

test("renders a compact Axon wordmark without large artwork", async () => {
  const frame = await renderFrame(() => <AxonLogo size="compact" />, { width: 72, height: 8 })

  expect(frame).toContain("AXON")
  expect(frame).not.toContain("A X O N")
  expect(frame).not.toContain("Developer Agent for the Terminal")
  expect(frame).not.toContain("/\\")
})

test("keeps Logo as a full Axon compatibility wrapper", async () => {
  const frame = await renderFrame(() => <Logo />, { width: 100, height: 12 })

  expect(frame).toContain("A X O N")
  expect(frame).toContain("Developer Agent for the Terminal")
  expect(frame).not.toMatch(/[█▀▄]/)
})

test("adapts the home presentation at normal and narrow widths", async () => {
  const normal = await renderFrame(() => <HomePresentation width={100} height={20} />, { width: 100, height: 20 })
  const narrow = await renderFrame(() => <HomePresentation width={72} height={20} />, { width: 72, height: 20 })

  expect(normal).toContain("A X O N")
  expect(normal).toContain("Ask Axon")
  expect(normal).toContain("@agent /command #file")
  expect(normal).toContain("Prompt slot")
  expect(narrow).toContain("AXON")
  expect(narrow).toContain("Ask Axon")
  expect(narrow).toContain("Prompt slot")
  expect(narrow).not.toContain("Developer Agent for the Terminal")
  expect(narrow).not.toContain("@agent /command #file")
})
