import { spawn, execFile, type ChildProcess } from "node:child_process"
import { randomBytes } from "node:crypto"
import { access, readFile } from "node:fs/promises"
import { createServer } from "node:net"
import { dirname, isAbsolute, join, resolve } from "node:path"
import { promisify } from "node:util"
import { workspace, type Disposable } from "vscode"

const exec = promisify(execFile)

export type AxonServerConnection = {
  url: string
  token: string
  modelState: AxonModelState
}

type AxonModel = { providerID: string; modelID: string }
type AxonModelState = { recent: AxonModel[]; variant: Record<string, string> }

export class AxonCliNotFoundError extends Error {
  constructor(command = "axon") {
    super(
      `The Axon CLI was not found (${command}).\n\nInstall it with:\nnpm install -g @wanghuimvp/axon@latest\n\nThen restart the Axon sidebar.`,
    )
    this.name = "AxonCliNotFoundError"
  }
}

export class AxonServer implements Disposable {
  private process?: ChildProcess
  private startPromise?: Promise<AxonServerConnection>
  private connection?: AxonServerConnection
  private output = ""

  start(directory: string, corsOrigin?: string) {
    if (this.connection) {
      return Promise.resolve(this.connection)
    }
    if (this.startPromise) {
      return this.startPromise
    }

    this.startPromise = this.launch(directory, corsOrigin).finally(() => {
      this.startPromise = undefined
    })
    return this.startPromise
  }

  async restart(directory: string, corsOrigin?: string) {
    this.stop()
    return this.start(directory, corsOrigin)
  }

  dispose() {
    this.stop()
  }

  private async launch(directory: string, corsOrigin?: string) {
    const port = await findAvailablePort()
    const command = await resolveAxonCommand()
    const url = `http://127.0.0.1:${port}`
    const password = randomBytes(32).toString("base64url")
    const token = Buffer.from(`axon:${password}`).toString("base64")
    const timeout = workspace.getConfiguration("axon").get("server.startupTimeout", 30_000)

    this.output = ""
    const args = ["serve", "--hostname=127.0.0.1", `--port=${port}`]
    if (corsOrigin) {
      args.push(`--cors=${corsOrigin}`)
    }
    const child = spawn(command, args, {
      cwd: directory,
      env: { ...process.env, AXON_CALLER: "vscode", AXON_SERVER_PASSWORD: password },
      shell: process.platform === "win32" && !command.toLowerCase().endsWith(".exe"),
      windowsHide: true,
    })
    this.process = child
    child.stdout?.on("data", (chunk) => {
      this.output += chunk.toString()
    })
    child.stderr?.on("data", (chunk) => {
      this.output += chunk.toString()
    })
    await new Promise<void>((resolveStart, reject) => {
      child.once("spawn", resolveStart)
      child.once("error", reject)
    }).catch((error) => {
      this.process = undefined
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new AxonCliNotFoundError(command)
      }
      throw error
    })

    await waitForServer(url, token, timeout, child, () => this.output)
    this.connection = {
      url,
      token,
      modelState: await readModelState(command, directory),
    }
    return this.connection
  }

  private stop() {
    this.connection = undefined
    this.startPromise = undefined
    this.process?.kill()
    this.process = undefined
  }
}

async function readModelState(command: string, directory: string): Promise<AxonModelState> {
  const paths = await exec(command, ["debug", "paths"], {
    cwd: directory,
    env: process.env,
    windowsHide: true,
  }).catch(() => undefined)
  const state = paths?.stdout
    .split(/\r?\n/)
    .map((line) => line.match(/^state\s+(.+)$/)?.[1]?.trim())
    .find(Boolean)
  if (!state) {
    return { recent: [], variant: {} }
  }

  const value = await readFile(join(state, "model.json"), "utf8")
    .then((content): unknown => JSON.parse(content))
    .catch(() => undefined)
  if (!isRecord(value) || !Array.isArray(value.recent)) {
    return { recent: [], variant: {} }
  }

  const recent = value.recent.flatMap((item) => {
    if (!isRecord(item)) {
      return []
    }
    if (typeof item.providerID !== "string" || typeof item.modelID !== "string") {
      return []
    }
    return [{ providerID: item.providerID, modelID: item.modelID }]
  })
  const variant = isRecord(value.variant)
    ? Object.fromEntries(Object.entries(value.variant).filter((item): item is [string, string] => typeof item[1] === "string"))
    : {}
  return { recent, variant }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

async function resolveAxonCommand() {
  const configured = workspace.getConfiguration("axon").get("server.command", "axon")
  if (configured !== "axon" || process.platform !== "win32") {
    return configured
  }

  const result = await exec("where.exe", ["axon.cmd"]).catch(() => undefined)
  const wrapper = result?.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean)
  if (!wrapper) {
    throw new AxonCliNotFoundError(configured)
  }

  const content = await readFile(wrapper, "utf8").catch(() => "")
  const match = content.match(/"([^"]*axon\.exe)"/i)
  if (!match?.[1]) {
    return wrapper
  }

  const executable = match[1].replace(/%dp0%/gi, dirname(wrapper))
  const path = isAbsolute(executable) ? executable : resolve(dirname(wrapper), executable)
  return access(path).then(() => path).catch(() => wrapper)
}

function findAvailablePort() {
  return new Promise<number>((resolvePort, reject) => {
    const listener = createServer()
    listener.once("error", reject)
    listener.listen(0, "127.0.0.1", () => {
      const address = listener.address()
      if (!address || typeof address === "string") {
        listener.close()
        reject(new Error("Unable to allocate a local port for Axon"))
        return
      }
      listener.close((error) => {
        if (error) {
          reject(error)
          return
        }
        resolvePort(address.port)
      })
    })
  })
}

async function waitForServer(
  url: string,
  token: string,
  timeout: number,
  process: ChildProcess,
  output: () => string,
) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    if (process.exitCode !== null) {
      throw new Error(`Axon stopped before the sidebar connected.\n${output().trim()}`)
    }

    const healthy = await fetch(`${url}/global/health`, {
      headers: { Authorization: `Basic ${token}` },
      signal: AbortSignal.timeout(1_000),
    })
      .then((response) => response.ok)
      .catch(() => false)
    if (healthy) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  process.kill()
  throw new Error(`Axon did not start within ${Math.round(timeout / 1000)} seconds.\n${output().trim()}`)
}
