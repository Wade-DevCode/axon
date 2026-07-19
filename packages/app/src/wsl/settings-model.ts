import type { WslAxonCheck, WslServerRuntime } from "./types"

export const wslRuntimeRetryable = (runtime: WslServerRuntime) =>
  runtime.kind === "failed" || runtime.kind === "stopped"

export async function enterWslAxonStep(
  distro: string,
  probe: (distro: string) => Promise<unknown>,
  select: (step: "axon") => void,
) {
  await probe(distro)
  select("axon")
}

export function wslAxonAction(check?: WslAxonCheck) {
  if (!check) return
  if (!check.resolvedPath) return "Install Axon"
  if (check.matchesDesktop === false) return "Update Axon"
}
