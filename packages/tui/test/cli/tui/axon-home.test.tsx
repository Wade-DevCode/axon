/** @jsxImportSource @opentui/solid */
import { expect, test } from "bun:test"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import type { TuiPluginApi, TuiPromptRef } from "@opencode-ai/plugin/tui"
import { Global } from "@opencode-ai/core/global"
import { TextareaRenderable } from "@opentui/core"
import { createTestRenderer } from "@opentui/core/testing"
import { testRender, type JSX } from "@opentui/solid"
import { Effect } from "effect"
import { AxonComposer } from "../../../src/component/axon-composer"
import { AxonLogo } from "../../../src/component/axon-logo"
import { Logo } from "../../../src/component/logo"
import { TuiConfigProvider } from "../../../src/config"
import { KVProvider } from "../../../src/context/kv"
import { ThemeProvider } from "../../../src/context/theme"
import type { HostSlots } from "../../../src/plugin/slots"
import { tmpdir } from "../../fixture/fixture"
import { TestTuiContexts } from "../../fixture/tui-environment"
import { createTuiResolvedConfig } from "../../fixture/tui-runtime"
import { createEventSource, createFetch, directory, json } from "../../fixture/tui-sdk"

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
    const deadline = Date.now() + 2000
    while (Date.now() < deadline) {
      await app.renderOnce()
      const frame = app.captureCharFrame()
      if (frame.trim().length > 0) return frame
      await Bun.sleep(10)
    }
    throw new Error("timed out waiting for the themed component frame")
  } finally {
    app.renderer.destroy()
  }
}

test("renders a stable full Axon wordmark without block escapes", async () => {
  const frame = await renderFrame(() => <AxonLogo size="full" />, { width: 100, height: 12 })

  expect(frame).toContain("A X O N")
  expect(frame).toContain("Developer Agent for the Terminal")
  expect(frame).toContain("WANGHUI")
  expect(frame).not.toContain("u2588")
  expect(frame).not.toMatch(/[█▀▄]/)
})

test("renders a compact Axon wordmark without large artwork", async () => {
  const frame = await renderFrame(() => <AxonLogo size="compact" />, { width: 72, height: 8 })

  expect(frame).toContain("AXON")
  expect(frame).not.toContain("A X O N")
  expect(frame).not.toContain("Developer Agent for the Terminal")
  expect(frame).not.toContain("WANGHUI")
  expect(frame).not.toContain("/\\")
})

test("keeps Logo as a full Axon compatibility wrapper", async () => {
  const frame = await renderFrame(() => <Logo />, { width: 100, height: 12 })

  expect(frame).toContain("A X O N")
  expect(frame).toContain("Developer Agent for the Terminal")
  expect(frame).not.toMatch(/[█▀▄]/)
})

test("renders the real responsive Home route and preserves its plugin and Prompt paths", async () => {
  const setup = await createTestRenderer({ width: 72, height: 20, useThread: false })
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
    }
    const provider = { id: "test", name: "Test", source: "config", env: [], options: {}, models: { [model.id]: model } }
    if (url.pathname === "/provider") return json({ all: [provider], default: {}, connected: [provider.id] })
    if (url.pathname === "/api/provider")
      return json({ location: { directory, project: { id: "proj_test", directory } }, data: [provider] })
    if (url.pathname === "/api/model")
      return json({ location: { directory, project: { id: "proj_test", directory } }, data: [model] })
    if (url.pathname === "/config/providers") return json({ providers: [provider], default: {} })
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
    const narrow = await captureHome(setup, "Ask Axon")
    expect(narrow).toContain("AXON")
    expect(narrow).toContain("Ask Axon")
    expect(narrow).not.toContain("A X O N")
    expect(narrow).not.toContain("Developer Agent for the Terminal")
    expect(narrow).not.toContain("@agent /command #file")
    expect(setup.renderer.currentFocusedEditor).toBeInstanceOf(TextareaRenderable)

    setup.renderer.resize(100, 24)
    const normal = await captureHome(setup, "Developer Agent for the Terminal")
    expect(normal).toContain("A X O N")
    expect(normal).toContain("Developer Agent for the Terminal")
    expect(normal).toContain("Ask Axon")
    expect(normal).toContain("@agent /command #file")
    expect(normal.indexOf("A X O N")).toBeLessThan(normal.indexOf("Ask Axon"))

    if (!api || !slots) throw new Error("plugin host did not expose the Home slot fixture")
    const pluginApi = api
    const homeSlots = slots
    homeSlots.register({
      id: "home-decoration-probe",
      slots: {
        home_prompt_right() {
          return <text>HOME RIGHT SLOT</text>
        },
        home_bottom() {
          return (
            <box flexShrink={0}>
              <text>HOME BOTTOM SLOT</text>
            </box>
          )
        },
        home_footer() {
          return (
            <box flexShrink={0}>
              <text>HOME FOOTER SLOT</text>
            </box>
          )
        },
      },
    })

    const decoratedFrame = await captureHome(setup, "HOME FOOTER SLOT")
    expect(decoratedFrame).toContain("A X O N")
    expect(decoratedFrame).toContain("HOME RIGHT SLOT")
    expect(decoratedFrame).toContain("HOME BOTTOM SLOT")
    expect(decoratedFrame).toContain("HOME FOOTER SLOT")
    expect(decoratedFrame.indexOf("HOME RIGHT SLOT")).toBeLessThan(decoratedFrame.indexOf("HOME BOTTOM SLOT"))
    expect(decoratedFrame.indexOf("HOME BOTTOM SLOT")).toBeLessThan(decoratedFrame.indexOf("HOME FOOTER SLOT"))
    homeSlots.register({
      id: "home-replacement-probe",
      slots: {
        home_logo() {
          return (
            <box flexShrink={0}>
              <text>HOME LOGO SLOT</text>
            </box>
          )
        },
        home_prompt(_context, props) {
          return (
            <pluginApi.ui.Prompt
              ref={(value) => {
                promptRef = value
                props.ref?.(value)
              }}
              placeholders={{ normal: ["HOME PROMPT SLOT"], shell: ["HOME SHELL SLOT"] }}
            />
          )
        },
      },
    })

    const replacementFrame = await captureHome(setup, "HOME PROMPT SLOT")
    expect(replacementFrame).toContain("HOME LOGO SLOT")
    expect(replacementFrame).toContain("Ask Axon")
    expect(replacementFrame).toContain("HOME PROMPT SLOT")
    expect(replacementFrame.indexOf("HOME LOGO SLOT")).toBeLessThan(replacementFrame.indexOf("Ask Axon"))
    expect(promptRef).toBeDefined()
    expect(promptRef?.current.input).toBe("")

    setup.renderer.destroy()
    await task
  } finally {
    if (!setup.renderer.isDestroyed) setup.renderer.destroy()
    await task
  }
})

async function captureHome(setup: Awaited<ReturnType<typeof createTestRenderer>>, content: string) {
  for (let attempt = 0; attempt < 50; attempt++) {
    await Promise.resolve()
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    if (frame.includes(content)) return frame
    await Bun.sleep(10)
  }
  return setup.captureCharFrame()
}
