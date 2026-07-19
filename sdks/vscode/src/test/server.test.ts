import { equal, match } from "node:assert/strict"
import { commands } from "vscode"
import { AxonCliNotFoundError, AxonServer } from "../server"

suite("Axon server", () => {
  test("explains how to install a missing CLI", () => {
    match(new AxonCliNotFoundError().message, /npm install -g @wanghuimvp\/axon@latest/)
  })

  test("renders the sidebar application", async function () {
    this.timeout(60_000)
    await commands.executeCommand("axon.openSidebar")

    const started = Date.now()
    let last: { status: string; error?: string } | undefined
    while (Date.now() - started < 30_000) {
      const state = await commands.executeCommand<{ status: string; error?: string }>("axon.test.getSidebarState")
      last = state
      if (state?.status === "ready") {
        return
      }
      if (state?.status === "error") {
        throw new Error(state.error)
      }
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    throw new Error(`Axon sidebar did not render within 30 seconds: ${JSON.stringify(last)}`)
  })

  test("starts the installed Axon runtime", async function () {
    this.timeout(60_000)
    const server = new AxonServer()

    try {
      const origin = "https://axon-test.vscode-webview.net"
      const connection = await server.start(process.cwd(), origin)
      const response = await fetch(`${connection.url}/global/health`, {
        headers: { Authorization: `Basic ${connection.token}`, Origin: origin },
      })
      const health = (await response.json()) as { healthy?: boolean; version?: string }

      equal(response.ok, true)
      equal(response.headers.get("access-control-allow-origin"), origin)
      equal(health.healthy, true)
      equal(typeof health.version, "string")
      equal(Array.isArray(connection.modelState.recent), true)
      equal(typeof connection.modelState.variant, "object")
    } finally {
      server.dispose()
    }
  })
})
