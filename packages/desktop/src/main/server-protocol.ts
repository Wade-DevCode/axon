export const SUPPORTED_APP_SERVER_PROTOCOL = 1

export type CompatibleServerHealth = {
  healthy: true
  runtimeVersion: string
  protocolVersion: number
  capabilities: string[]
}

export class AxonServerProtocolError extends Error {
  constructor(runtimeVersion: string, protocolVersion: unknown) {
    const actual = typeof protocolVersion === "number" ? String(protocolVersion) : "missing"
    super(
      `Axon server ${runtimeVersion} uses app-server protocol ${actual}, but Axon Desktop supports protocol ${SUPPORTED_APP_SERVER_PROTOCOL}. Update the server or Desktop so their app-server protocols match.`,
    )
    this.name = "AxonServerProtocolError"
  }
}

export function requireCompatibleServerHealth(value: unknown): CompatibleServerHealth {
  const runtimeVersion =
    isRecord(value) && typeof value.runtimeVersion === "string"
      ? value.runtimeVersion
      : isRecord(value) && typeof value.version === "string"
        ? value.version
        : "unknown"
  if (
    !isRecord(value) ||
    value.healthy !== true ||
    typeof value.runtimeVersion !== "string" ||
    value.protocolVersion !== SUPPORTED_APP_SERVER_PROTOCOL ||
    !isStringArray(value.capabilities)
  ) {
    throw new AxonServerProtocolError(runtimeVersion, isRecord(value) ? value.protocolVersion : undefined)
  }
  return {
    healthy: true,
    runtimeVersion,
    protocolVersion: value.protocolVersion,
    capabilities: value.capabilities,
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
