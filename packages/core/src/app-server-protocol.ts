export * as AppServerProtocol from "./app-server-protocol"

// Increment this only for incompatible changes to the app-server wire contract.
export const VERSION = 1 as const

export const CAPABILITIES = ["sessions", "diffs", "permissions"] as const
