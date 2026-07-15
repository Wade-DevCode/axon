import { createContext, createMemo, useContext, type ParentProps } from "solid-js"
import { createStore } from "solid-js/store"
import {
  initialStartupPhases,
  startupPhaseOrder,
  startupSnapshot,
  type StartupPhase,
} from "../util/startup"

export function createStartupProgress() {
  const [phases, setPhases] = createStore(initialStartupPhases())
  const snapshot = createMemo(() => startupSnapshot(phases))

  return {
    phases,
    snapshot,
    start(name: StartupPhase) {
      if (phases[name].state !== "pending") return
      setPhases(name, { state: "running" })
    },
    complete(name: StartupPhase) {
      if (phases[name].state === "complete" || phases[name].state === "error") return
      setPhases(name, { state: "complete" })
    },
    fail(name: StartupPhase, error: unknown) {
      if (phases[name].state === "complete" || phases[name].state === "error") return
      const first = startupPhaseOrder.map((phase) => phases[phase].error).find(Boolean)
      setPhases(name, {
        state: "error",
        error: first ?? (error instanceof Error ? error.message : String(error)),
      })
    },
  }
}

const StartupContext = createContext<ReturnType<typeof createStartupProgress>>()

export function StartupProvider(props: ParentProps) {
  return <StartupContext.Provider value={createStartupProgress()}>{props.children}</StartupContext.Provider>
}

export function useStartupProgress() {
  const value = useContext(StartupContext)
  if (!value) throw new Error("useStartupProgress must be used within a StartupProvider")
  return value
}
