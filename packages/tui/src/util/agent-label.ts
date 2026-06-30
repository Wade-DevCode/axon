import * as Locale from "./locale"

const labels: Record<string, string> = {
  build: "Code",
  code: "Code",
  ask: "Ask",
  plan: "Plan",
  debug: "Debug",
  review: "Review",
  orchestrator: "Orchestrator",
}

const descriptions: Record<string, string> = {
  build: "Build and edit code",
  code: "Build and edit code",
  ask: "Explain without editing",
  plan: "Plan before changing code",
  debug: "Diagnose and fix failures",
  review: "Review diffs and PR feedback",
  orchestrator: "Coordinate larger work",
}

export function agentLabel(name: string) {
  return labels[name] ?? Locale.titlecase(name.replaceAll("_", " "))
}

export function agentDescription(agent: { name: string; native?: boolean; description?: string }) {
  return descriptions[agent.name] ?? agent.description ?? (agent.native ? "native" : undefined)
}
