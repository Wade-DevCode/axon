import type { WslDistroProbe, WslAxonCheck, WslServerItem } from "../../preload/types"

export function wslServerIdToRestart(servers: WslServerItem[], distro: string) {
  return servers.find((item) => item.config.distro === distro)?.config.id
}

export function clearWslDistroState(
  distroProbes: Record<string, WslDistroProbe>,
  axonChecks: Record<string, WslAxonCheck>,
  distro: string,
) {
  const nextDistroProbes = { ...distroProbes }
  const nextAxonChecks = { ...axonChecks }
  delete nextDistroProbes[distro]
  delete nextAxonChecks[distro]
  return { distroProbes: nextDistroProbes, axonChecks: nextAxonChecks }
}

export function wslTerminalArgs(distro?: string | null) {
  return ["/c", "start", "", "wsl", ...(distro ? ["-d", distro] : [])]
}

export function requireWslIpcString(name: string, value: unknown) {
  if (typeof value === "string" && value.length > 0) return value
  throw new Error(`Invalid ${name}`)
}
