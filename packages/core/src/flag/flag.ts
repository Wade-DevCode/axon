import { Config } from "effect"

export function truthy(key: string) {
  const value = process.env[key]?.toLowerCase()
  return value === "true" || value === "1"
}

const copy = process.env["AXON_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"]
const fff = process.env["AXON_DISABLE_FFF"]

function enabledByExperimental(key: string) {
  return process.env[key] === undefined ? truthy("AXON_EXPERIMENTAL") : truthy(key)
}

export const Flag = {
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env["OTEL_EXPORTER_OTLP_ENDPOINT"],
  OTEL_EXPORTER_OTLP_HEADERS: process.env["OTEL_EXPORTER_OTLP_HEADERS"],

  AXON_AUTO_HEAP_SNAPSHOT: truthy("AXON_AUTO_HEAP_SNAPSHOT"),
  AXON_GIT_BASH_PATH: process.env["AXON_GIT_BASH_PATH"],
  AXON_CONFIG: process.env["AXON_CONFIG"],
  AXON_CONFIG_CONTENT: process.env["AXON_CONFIG_CONTENT"],
  AXON_DISABLE_AUTOUPDATE: truthy("AXON_DISABLE_AUTOUPDATE"),
  AXON_ALWAYS_NOTIFY_UPDATE: truthy("AXON_ALWAYS_NOTIFY_UPDATE"),
  AXON_DISABLE_PRUNE: truthy("AXON_DISABLE_PRUNE"),
  AXON_DISABLE_TERMINAL_TITLE: truthy("AXON_DISABLE_TERMINAL_TITLE"),
  AXON_SHOW_TTFD: truthy("AXON_SHOW_TTFD"),
  AXON_DISABLE_AUTOCOMPACT: truthy("AXON_DISABLE_AUTOCOMPACT"),
  AXON_DISABLE_MODELS_FETCH: truthy("AXON_DISABLE_MODELS_FETCH"),
  AXON_DISABLE_MOUSE: truthy("AXON_DISABLE_MOUSE"),
  AXON_FAKE_VCS: process.env["AXON_FAKE_VCS"],
  AXON_SERVER_PASSWORD: process.env["AXON_SERVER_PASSWORD"],
  AXON_SERVER_USERNAME: process.env["AXON_SERVER_USERNAME"],
  AXON_DISABLE_FFF: fff === undefined ? process.platform === "win32" : truthy("AXON_DISABLE_FFF"),

  // Experimental
  AXON_EXPERIMENTAL_FILEWATCHER: Config.boolean("AXON_EXPERIMENTAL_FILEWATCHER").pipe(Config.withDefault(false)),
  AXON_EXPERIMENTAL_DISABLE_FILEWATCHER: Config.boolean("AXON_EXPERIMENTAL_DISABLE_FILEWATCHER").pipe(
    Config.withDefault(false),
  ),
  AXON_EXPERIMENTAL_DISABLE_COPY_ON_SELECT:
    copy === undefined ? process.platform === "win32" : truthy("AXON_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"),
  AXON_MODELS_URL: process.env["AXON_MODELS_URL"],
  AXON_MODELS_PATH: process.env["AXON_MODELS_PATH"],
  AXON_DB: process.env["AXON_DB"],

  AXON_WORKSPACE_ID: process.env["AXON_WORKSPACE_ID"],
  AXON_EXPERIMENTAL_WORKSPACES: enabledByExperimental("AXON_EXPERIMENTAL_WORKSPACES"),

  // Evaluated at access time (not module load) because tests, the CLI, and
  // external tooling set these env vars at runtime.
  get AXON_DISABLE_PROJECT_CONFIG() {
    return truthy("AXON_DISABLE_PROJECT_CONFIG")
  },
  get AXON_EXPERIMENTAL_REFERENCES() {
    return enabledByExperimental("AXON_EXPERIMENTAL_REFERENCES")
  },
  get AXON_TUI_CONFIG() {
    return process.env["AXON_TUI_CONFIG"]
  },
  get AXON_CONFIG_DIR() {
    return process.env["AXON_CONFIG_DIR"]
  },
  get AXON_PURE() {
    return truthy("AXON_PURE")
  },
  get AXON_PERMISSION() {
    return process.env["AXON_PERMISSION"]
  },
  get AXON_PLUGIN_META_FILE() {
    return process.env["AXON_PLUGIN_META_FILE"]
  },
  get AXON_CLIENT() {
    return process.env["AXON_CLIENT"] ?? "cli"
  },
}
