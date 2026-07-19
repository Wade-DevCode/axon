// @refresh reload

import * as Sentry from "@sentry/solid"
import { HashRouter } from "@solidjs/router"
import { render } from "solid-js/web"
import { AppBaseProviders, AppInterface } from "@/app"
import { type Platform, PlatformProvider } from "@/context/platform"
import { dict as en } from "@/i18n/en"
import { dict as zh } from "@/i18n/zh"
import { handleNotificationClick } from "@/utils/notification-click"
import { authFromToken } from "@/utils/server"
import pkg from "../package.json"
import { ServerConnection } from "./context/server"

const DEFAULT_SERVER_URL_KEY = "axon.settings.dat:defaultServerUrl"
const VSCODE_MODEL_MIGRATION_KEY = "axon.vscode.model-state.v1"
const GLOBAL_MODEL_KEY = "axon.global.dat:model"
type ModelKey = { providerID: string; modelID: string }
type VsCodeBootstrap = {
  serverUrl: string
  authToken: string
  route: string
  modelState?: { recent: ModelKey[]; variant: Record<string, string> }
}
const vscode = (window as typeof window & { __AXON_VSCODE__?: VsCodeBootstrap }).__AXON_VSCODE__

const getLocale = () => {
  if (typeof navigator !== "object") return "en" as const
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const language of languages) {
    if (!language) continue
    if (language.toLowerCase().startsWith("zh")) return "zh" as const
  }
  return "en" as const
}

const getRootNotFoundError = () => {
  const key = "error.dev.rootNotFound" as const
  const locale = getLocale()
  return locale === "zh" ? (zh[key] ?? en[key]) : en[key]
}

const getStorage = (key: string) => {
  if (typeof localStorage === "undefined") return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const setStorage = (key: string, value: string | null) => {
  if (typeof localStorage === "undefined") return
  try {
    if (value !== null) {
      localStorage.setItem(key, value)
      return
    }
    localStorage.removeItem(key)
  } catch {
    return
  }
}

const seedVsCodeModels = () => {
  if (!vscode?.modelState?.recent.length) return
  if (getStorage(VSCODE_MODEL_MIGRATION_KEY)) return

  const stored = getStorage(GLOBAL_MODEL_KEY)
  const parsed = (() => {
    if (!stored) return {}
    try {
      const value: unknown = JSON.parse(stored)
      if (typeof value === "object" && value !== null && !Array.isArray(value)) return value
      return {}
    } catch {
      return {}
    }
  })()
  const current = parsed as Record<string, unknown>
  const recent = Array.isArray(current.recent)
    ? current.recent.filter(
        (item): item is ModelKey =>
          typeof item === "object" &&
          item !== null &&
          !Array.isArray(item) &&
          typeof (item as Record<string, unknown>).providerID === "string" &&
          typeof (item as Record<string, unknown>).modelID === "string",
      )
    : []
  const models = [...vscode.modelState.recent, ...recent]
    .filter(
      (item, index, items) =>
        items.findIndex(
          (candidate) => candidate.providerID === item.providerID && candidate.modelID === item.modelID,
        ) === index,
    )
    .slice(0, 5)
  const variant =
    typeof current.variant === "object" && current.variant !== null && !Array.isArray(current.variant)
      ? { ...(current.variant as Record<string, unknown>), ...vscode.modelState.variant }
      : vscode.modelState.variant

  const workspaceModels = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).filter(
    (key): key is string => !!key?.startsWith("axon.workspace.") && key.endsWith(":model-selection"),
  )
  for (const key of workspaceModels) {
    localStorage.removeItem(key)
  }
  setStorage(GLOBAL_MODEL_KEY, JSON.stringify({ ...current, recent: models, variant }))
  setStorage(VSCODE_MODEL_MIGRATION_KEY, "1")
}

const readDefaultServerUrl = () => getStorage(DEFAULT_SERVER_URL_KEY)
const writeDefaultServerUrl = (url: string | null) => setStorage(DEFAULT_SERVER_URL_KEY, url)

const notify: Platform["notify"] = async (title, description, href) => {
  if (!("Notification" in window)) return

  const permission =
    Notification.permission === "default"
      ? await Notification.requestPermission().catch(() => "denied")
      : Notification.permission

  if (permission !== "granted") return

  const inView = document.visibilityState === "visible" && document.hasFocus()
  if (inView) return

  const notification = new Notification(title, {
    body: description ?? "",
    icon: "/favicon-96x96-v3.png",
  })

  notification.onclick = () => {
    handleNotificationClick(href)
    notification.close()
  }
}

const openLink: Platform["openLink"] = (url) => {
  window.open(url, "_blank")
}

const back: Platform["back"] = () => {
  window.history.back()
}

const forward: Platform["forward"] = () => {
  window.history.forward()
}

const restart: Platform["restart"] = async () => {
  window.location.reload()
}

const root = document.getElementById("root")
if (!(root instanceof HTMLElement) && import.meta.env.DEV) {
  throw new Error(getRootNotFoundError())
}

const getCurrentUrl = () => {
  if (vscode) return vscode.serverUrl
  if (location.hostname.includes("opencode.ai")) return "http://localhost:4096"
  if (import.meta.env.DEV)
    return `http://${import.meta.env.VITE_AXON_SERVER_HOST ?? "localhost"}:${import.meta.env.VITE_AXON_SERVER_PORT ?? "4096"}`
  return location.origin
}

const getDefaultUrl = () => {
  if (vscode) return vscode.serverUrl
  const lsDefault = readDefaultServerUrl()
  if (lsDefault) return lsDefault
  return getCurrentUrl()
}

const clearAuthToken = () => {
  const params = new URLSearchParams(location.search)
  if (!params.has("auth_token")) return
  params.delete("auth_token")
  history.replaceState(null, "", location.pathname + (params.size ? `?${params}` : "") + location.hash)
}

const platform: Platform = {
  platform: "web",
  version: pkg.version,
  openLink,
  back,
  forward,
  restart,
  notify,
  getDefaultServer: async () => {
    if (vscode) return ServerConnection.Key.make(vscode.serverUrl)
    const stored = readDefaultServerUrl()
    return stored ? ServerConnection.Key.make(stored) : null
  },
  setDefaultServer: writeDefaultServerUrl,
}

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE ?? `web@${pkg.version}`,
    initialScope: {
      tags: {
        platform: "web",
      },
    },
    integrations: (integrations) => {
      return integrations.filter(
        (i) =>
          i.name !== "Breadcrumbs" && !(import.meta.env.AXON_CHANNEL === "prod" && i.name === "GlobalHandlers"),
      )
    },
  })
}

if (root instanceof HTMLElement) {
  seedVsCodeModels()
  if (vscode && !location.hash) {
    location.hash = vscode.route
  }
  const auth = authFromToken(vscode?.authToken ?? new URLSearchParams(location.search).get("auth_token"))
  clearAuthToken()
  const server: ServerConnection.Http = {
    type: "http",
    authToken: !!auth,
    http: {
      url: getCurrentUrl(),
      ...auth,
    },
  }
  render(
    () => (
      <PlatformProvider value={platform}>
        <AppBaseProviders>
          <AppInterface
            router={vscode ? HashRouter : undefined}
            defaultServer={ServerConnection.Key.make(getDefaultUrl())}
            canonicalLocalServer={ServerConnection.key(server)}
            servers={[server]}
            disableHealthCheck
          />
        </AppBaseProviders>
      </PlatformProvider>
    ),
    root,
  )
}
