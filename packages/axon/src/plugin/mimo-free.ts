import type { Hooks, PluginInput } from "@axon-ai/plugin"
import crypto from "crypto"
import os from "os"

const baseURL = (process.env.MIMO_FREE_BASE_URL ?? "https://api.xiaomimimo.com/").replace(/\/+$/, "")
const bootstrapURL = `${baseURL}/api/free-ai/bootstrap`
const apiURL = `${baseURL}/api/free-ai/openai`
const refreshWindow = 5 * 60 * 1000

let token: { value: string; expires: number } | undefined
let pending: Promise<{ value: string; expires: number }> | undefined

function fingerprint() {
  const cpu = os.cpus()[0]?.model ?? "unknown-cpu"
  const username = (() => {
    try {
      return os.userInfo().username
    } catch {
      return "unknown-user"
    }
  })()
  return crypto
    .createHash("sha256")
    .update([os.hostname(), process.platform, process.arch, cpu, username].join("|"))
    .digest("hex")
}

function expires(token: string) {
  const payload = token.split(".")[1]
  if (!payload) return Date.now() + refreshWindow
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))
    if (typeof decoded.exp === "number") return decoded.exp * 1000
  } catch {}
  return Date.now() + refreshWindow
}

async function bootstrap() {
  const response = await fetch(bootstrapURL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client: fingerprint() }),
  })
  if (!response.ok) throw new Error(`MiMo Auto bootstrap failed: ${response.status}`)
  const body = (await response.json()) as { jwt?: unknown }
  if (typeof body.jwt !== "string") throw new Error("MiMo Auto bootstrap response is missing a token")
  return { value: body.jwt, expires: expires(body.jwt) }
}

async function accessToken() {
  if (token && token.expires - Date.now() > refreshWindow) return token.value
  if (pending) return (await pending).value
  pending = bootstrap()
  try {
    token = await pending
    return token.value
  } finally {
    pending = undefined
  }
}

async function request(input: RequestInfo | URL, init?: RequestInit) {
  const url = (typeof input === "string" || input instanceof URL ? String(input) : input.url).replace(
    /\/chat\/completions(\?|$)/,
    "/chat$1",
  )
  const send = async () => {
    const headers = new Headers(init?.headers)
    headers.set("Authorization", `Bearer ${await accessToken()}`)
    headers.set("X-Mimo-Source", "axon-cli-free")
    return fetch(url, { ...init, headers })
  }
  const response = await send()
  if (response.status !== 401 && response.status !== 403) return response
  token = undefined
  return send()
}

export async function MimoFreePlugin(_input: PluginInput): Promise<Hooks> {
  return {
    config: async (config) => {
      config.provider ??= {}
      config.provider.mimo ??= {
        name: "MiMo Auto (free)",
        npm: "@ai-sdk/openai-compatible",
        api: apiURL,
        options: { apiKey: "anonymous", fetch: request },
        models: {
          "mimo-auto": {
            name: "MiMo Auto",
            attachment: true,
            reasoning: true,
            tool_call: true,
            temperature: true,
            modalities: { input: ["text", "image"], output: ["text"] },
            limit: { context: 1_000_000, output: 128_000 },
            cost: { input: 0, output: 0 },
          },
        },
      }
    },
  }
}
