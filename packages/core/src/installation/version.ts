declare global {
  const OPENCODE_VERSION: string
  const OPENCODE_CHANNEL: string
  const OPENCODE_PLUGIN_VERSION: string
}

export const InstallationVersion = typeof OPENCODE_VERSION === "string" ? OPENCODE_VERSION : "local"
export const InstallationChannel = typeof OPENCODE_CHANNEL === "string" ? OPENCODE_CHANNEL : "local"
export const InstallationLocal = InstallationChannel === "local"
// `@opencode-ai/plugin` is published by opencode on its own version line (1.17.x), which is
// decoupled from Axon's version. Auto-install the plugin at the bundled opencode plugin version
// so its API matches what this binary expects; fall back to "latest" when running from source.
export const InstallationPluginVersion =
  typeof OPENCODE_PLUGIN_VERSION === "string" ? OPENCODE_PLUGIN_VERSION : "latest"
