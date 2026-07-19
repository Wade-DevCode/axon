declare global {
  const AXON_VERSION: string
  const AXON_CHANNEL: string
  const AXON_PLUGIN_VERSION: string
}

export const InstallationVersion = typeof AXON_VERSION === "string" ? AXON_VERSION : "local"
export const InstallationChannel = typeof AXON_CHANNEL === "string" ? AXON_CHANNEL : "local"
export const InstallationLocal = InstallationChannel === "local"
// `@axon-ai/plugin` is published by axon on its own version line (1.17.x), which is
// decoupled from Axon's version. Auto-install the plugin at the bundled axon plugin version
// so its API matches what this binary expects; fall back to "latest" when running from source.
export const InstallationPluginVersion =
  typeof AXON_PLUGIN_VERSION === "string" ? AXON_PLUGIN_VERSION : "latest"
