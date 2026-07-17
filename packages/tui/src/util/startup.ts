import { showSplashArtwork } from "./brand-layout"

export const startupPhaseOrder = ["configuration", "workspace", "providers", "agents", "mcp", "plugins"] as const

export type StartupPhase = (typeof startupPhaseOrder)[number]
export type StartupPhaseState = {
  state: "pending" | "running" | "complete" | "error"
  error?: string
}
export type StartupPhases = Record<StartupPhase, StartupPhaseState>

export const startupPhaseLabels: Record<StartupPhase, string> = {
  configuration: "Loading configuration",
  workspace: "Opening workspace",
  providers: "Loading providers",
  agents: "Loading agents",
  mcp: "Connecting MCP servers",
  plugins: "Loading plugins",
}

export const startupPhaseShortLabels: Record<StartupPhase, string> = {
  configuration: "CONFIG",
  workspace: "WORKSPACE",
  providers: "PROVIDERS",
  agents: "AGENTS",
  mcp: "MCP",
  plugins: "PLUGINS",
}

export function initialStartupPhases(): StartupPhases {
  return Object.fromEntries(startupPhaseOrder.map((name) => [name, { state: "pending" }])) as StartupPhases
}

export function startupSnapshot(phases: StartupPhases) {
  const error = startupPhaseOrder.map((name) => phases[name].error).find(Boolean)
  const settled = startupPhaseOrder.filter(
    (name) => phases[name].state === "complete" || phases[name].state === "error",
  )
  const active = startupPhaseOrder.find((name) => phases[name].state === "running" || phases[name].state === "pending")
  const done = settled.length === startupPhaseOrder.length
  return {
    label: error ?? (done ? "Ready" : startupPhaseLabels[active ?? "plugins"]),
    percent: Math.round((settled.length / startupPhaseOrder.length) * 100),
    completed: settled.length,
    active,
    done,
    ...(error ? { error } : {}),
  }
}

export function startupMinimumDelay(animationsEnabled: boolean, width: number, height: number) {
  return animationsEnabled && showSplashArtwork(width, height) ? 800 : 0
}

class StartupFetchError extends Error {
  constructor(error: unknown) {
    super(error instanceof Error ? error.message : String(error), { cause: error })
    this.name = "StartupFetchError"
  }
}

export function startupFetch<T>(promise: Promise<T>) {
  return promise.catch((error) => {
    throw new StartupFetchError(error)
  })
}

export function startupFailureMode(error: unknown, input: { recoverable: boolean; fatal: boolean }) {
  if (!input.fatal) return "throw" as const
  if (input.recoverable && error instanceof StartupFetchError) return "recover" as const
  return "exit" as const
}

export function startupFailure(errors: unknown[]) {
  return errors.find((error) => !(error instanceof StartupFetchError)) ?? errors[0]
}
