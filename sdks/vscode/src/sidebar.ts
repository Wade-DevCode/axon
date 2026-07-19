import { randomBytes } from "node:crypto"
import { readFile } from "node:fs/promises"
import { env, Uri, workspace, type Webview, type WebviewView, type WebviewViewProvider } from "vscode"
import { AxonCliNotFoundError, AxonServer } from "./server"

type SidebarState = { status: "idle" | "starting" | "loading" | "ready" | "error"; error?: string }
type Bootstrap = {
  serverUrl: string
  authToken: string
  route: string
  modelState: {
    recent: Array<{ providerID: string; modelID: string }>
    variant: Record<string, string>
  }
}

export class AxonSidebarProvider implements WebviewViewProvider {
  static readonly viewType = "axon.sidebar"

  private view?: WebviewView
  private origin?: string
  private state: SidebarState = { status: "idle" }

  constructor(
    private readonly extensionUri: Uri,
    private readonly server: AxonServer,
  ) {}

  async resolveWebviewView(view: WebviewView) {
    this.view = view
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [Uri.joinPath(this.extensionUri, "webview")],
    }
    view.webview.onDidReceiveMessage((message) => {
      if (message?.type === "ready" && typeof message.origin === "string") {
        const restart = this.origin !== undefined && this.origin !== message.origin
        this.origin = message.origin
        this.state = { status: "starting" }
        void this.connect(restart)
        return
      }
      if (message?.type === "app-ready") {
        this.state = { status: "ready" }
        return
      }
      if (message?.type === "restart") {
        void this.restart()
        return
      }
      if (message?.type === "load-error") {
        this.state = {
          status: "error",
          error:
            typeof message.description === "string"
              ? message.description
              : "The sidebar application did not initialize.",
        }
      }
    })
    view.onDidDispose(() => {
      if (this.view === view) {
        this.view = undefined
      }
    })
    this.state = { status: "starting", error: "Preparing sidebar application" }
    view.webview.html = await appHtml(view.webview, this.extensionUri)
  }

  getState() {
    return this.state
  }

  async restart() {
    if (!this.view || !this.origin) {
      return
    }
    await this.connect(true)
  }

  private async connect(restart: boolean) {
    if (!this.view) {
      return
    }
    this.state = { status: "starting", error: "Starting local runtime" }

    const directory = workspace.workspaceFolders?.[0]?.uri.fsPath
    if (!directory) {
      await this.showError(
        "Open a folder to start Axon",
        "Axon uses the current VS Code workspace as its project context.",
        false,
      )
      return
    }

    const connection = await (restart
      ? this.server.restart(directory, this.origin)
      : this.server.start(directory, this.origin)
    ).catch((error) => {
      const description = error instanceof Error ? error.message : String(error)
      void this.showError(
        error instanceof AxonCliNotFoundError ? "Install the Axon CLI" : "Axon could not start",
        description,
        true,
      )
      return undefined
    })
    if (!connection || !this.view) {
      return
    }

    this.state = { status: "starting", error: "Resolving local runtime URL" }
    const external = await env.asExternalUri(Uri.parse(connection.url))
    const bootstrap: Bootstrap = {
      serverUrl: external.toString().replace(/\/$/, ""),
      authToken: connection.token,
      route: `/${Buffer.from(directory).toString("base64url")}/session`,
      modelState: connection.modelState,
    }
    this.state = { status: "loading" }
    await this.view.webview.postMessage({ type: "connection", bootstrap })
  }

  private async showError(title: string, description: string, retry: boolean) {
    this.state = { status: "error", error: description }
    await this.view?.webview.postMessage({ type: "host-error", title, description, retry })
  }
}

async function appHtml(webview: Webview, extensionUri: Uri) {
  const nonce = randomBytes(16).toString("base64")
  const root = Uri.joinPath(extensionUri, "webview")
  const html = await readFile(Uri.joinPath(root, "index.html").fsPath, "utf8")
  const entry = html.match(/<script\s+type="module"[^>]*\ssrc="([^"]+)"[^>]*><\/script>/)
  if (!entry?.[1]) {
    throw new Error("Axon webview entry script was not found")
  }

  const base = `${webview.asWebviewUri(root).toString().replace(/\/$/, "")}/`
  const head = `<base href="${escapeHtml(base)}" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${webview.cspSource} 'nonce-${nonce}' 'wasm-unsafe-eval'; style-src ${webview.cspSource} 'nonce-${nonce}' 'unsafe-inline'; img-src ${webview.cspSource} data: https: blob:; font-src ${webview.cspSource} data:; media-src ${webview.cspSource} data: blob:; connect-src http: https: ws: wss: data:; worker-src blob:;" />
    <style nonce="${nonce}">
      .axon-state { min-height: 100%; display: grid; place-content: center; justify-items: center; gap: 12px; padding: 28px; color: var(--vscode-foreground); background: var(--vscode-sideBar-background); font: 13px var(--vscode-font-family); text-align: center; }
      .axon-state strong { font-size: 14px; font-weight: 600; }
      .axon-state span { max-width: 320px; color: var(--vscode-descriptionForeground); line-height: 1.5; white-space: pre-wrap; }
      .axon-state button { padding: 6px 14px; color: var(--vscode-button-foreground); background: var(--vscode-button-background); border: 0; cursor: pointer; }
    </style>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi()
      const entry = ${JSON.stringify(entry[1])}
      let started = false
      let failure = "The application entry script did not initialize."

      const showState = (title, description, retry) => {
        const root = document.getElementById("root")
        if (!root) return
        root.innerHTML = '<main class="axon-state"><strong></strong><span></span></main>'
        root.querySelector("strong").textContent = title
        root.querySelector("span").textContent = description
        if (!retry) return
        const button = document.createElement("button")
        button.textContent = "Retry"
        button.addEventListener("click", () => vscode.postMessage({ type: "restart" }))
        root.querySelector("main").append(button)
      }

      addEventListener("error", (event) => {
        const target = event.target
        if (target instanceof HTMLScriptElement) {
          failure = "Failed to load script: " + target.src
          return
        }
        if (target instanceof HTMLLinkElement) {
          failure = "Failed to load stylesheet: " + target.href
          return
        }
        failure = [event.message, event.error?.stack, event.error?.message].filter(Boolean).join("\\n") || failure
      }, true)
      addEventListener("unhandledrejection", (event) => {
        failure = event.reason?.stack || event.reason?.message || String(event.reason || failure)
      })
      addEventListener("message", (event) => {
        if (event.data?.type === "host-error") {
          showState(event.data.title, event.data.description, event.data.retry)
          return
        }
        if (event.data?.type !== "connection" || started) return
        started = true
        window.__AXON_VSCODE__ = event.data.bootstrap
        document.getElementById("root")?.replaceChildren()
        const script = document.createElement("script")
        script.type = "module"
        script.src = new URL(entry, document.baseURI).toString()
        script.nonce = ${JSON.stringify(nonce)}
        document.head.append(script)
        setTimeout(() => {
          if (document.getElementById("root")?.childElementCount) {
            vscode.postMessage({ type: "app-ready" })
            return
          }
          showState("Axon could not load", failure, true)
          vscode.postMessage({ type: "load-error", description: failure })
        }, 10000)
      })
      addEventListener("DOMContentLoaded", () => {
        showState("Starting Axon", "Connecting to your workspace...", false)
        vscode.postMessage({ type: "ready", origin: location.origin })
      })
    </script>`

  return html
    .replace(entry[0], "")
    .replaceAll("<script", `<script nonce="${nonce}"`)
    .replace("<head>", `<head>\n    ${head}`)
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}
