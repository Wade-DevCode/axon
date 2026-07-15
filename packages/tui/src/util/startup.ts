import { showSplashArtwork } from "./brand-layout"

export const startupPhaseOrder = ["configuration", "workspace", "providers", "agents", "mcp", "plugins"] as const

export type StartupPhase = (typeof startupPhaseOrder)[number]
export type StartupPhaseState = {
  state: "pending" | "running" | "complete" | "error"
  error?: string
}
export type StartupPhases = Record<StartupPhase, StartupPhaseState>

const labels: Record<StartupPhase, string> = {
  configuration: "Loading configuration",
  workspace: "Opening workspace",
  providers: "Loading providers",
  agents: "Loading agents",
  mcp: "Connecting MCP servers",
  plugins: "Loading plugins",
}

export function initialStartupPhases(): StartupPhases {
  return Object.fromEntries(startupPhaseOrder.map((name) => [name, { state: "pending" }])) as StartupPhases
}

export function startupSnapshot(phases: StartupPhases) {
  const error = startupPhaseOrder.map((name) => phases[name].error).find(Boolean)
  const settled = startupPhaseOrder.filter((name) => phases[name].state === "complete" || phases[name].state === "error")
  const active = startupPhaseOrder.find((name) => phases[name].state === "running" || phases[name].state === "pending")
  const done = settled.length === startupPhaseOrder.length
  return {
    label: error ?? (done ? "Ready" : labels[active ?? "plugins"]),
    percent: Math.round((settled.length / startupPhaseOrder.length) * 100),
    done,
    ...(error ? { error } : {}),
  }
}

export function startupMinimumDelay(animationsEnabled: boolean, width: number, height: number) {
  return animationsEnabled && showSplashArtwork(width, height) ? 800 : 0
}
