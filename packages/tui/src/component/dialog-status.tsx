import { TextAttributes } from "@opentui/core"
import { fileURLToPath } from "bun"
import { useTheme } from "../context/theme"
import { useSync } from "../context/sync"
import { useLocal } from "../context/local"
import { useProject } from "../context/project"
import { For, Match, Switch, Show, createMemo } from "solid-js"
import { Product } from "../util/product"

export function StatusReport() {
  const sync = useSync()
  const local = useLocal()
  const project = useProject()
  const { theme } = useTheme()
  const enabledFormatters = createMemo(() => sync.data.formatter.filter((formatter) => formatter.enabled))
  const connectedProviders = createMemo(() => sync.data.provider_next.connected.length)
  const connectedMcp = createMemo(
    () => Object.values(sync.data.mcp).filter((server) => server.status === "connected").length,
  )

  const plugins = createMemo(() => {
    const list = sync.data.config.plugin ?? []
    const result = list.map((item) => {
      const value = typeof item === "string" ? item : item[0]
      if (value.startsWith("file://")) {
        const path = fileURLToPath(value)
        const parts = path.split("/")
        const filename = parts.pop() || path
        if (!filename.includes(".")) return { name: filename }
        const basename = filename.split(".")[0]
        if (basename === "index") return { name: parts.pop() || basename }
        return { name: basename }
      }
      const index = value.lastIndexOf("@")
      if (index <= 0) return { name: value, version: "latest" }
      return { name: value.substring(0, index), version: value.substring(index + 1) }
    })
    return result.toSorted((a, b) => a.name.localeCompare(b.name))
  })

  return (
    <box marginTop={1} paddingLeft={2} paddingRight={2} paddingBottom={1} gap={1}>
      <box flexDirection="row">
        <text fg={theme.text} attributes={TextAttributes.BOLD}>
          &gt;_ {Product.info.name} <span style={{ fg: theme.textMuted }}>(v{Product.info.version})</span>
        </text>
      </box>
      <text fg={theme.primary}>Use /connect to add or manage model providers</text>
      <box
        border={["top", "bottom", "left", "right"]}
        borderColor={theme.border}
        paddingLeft={2}
        paddingRight={2}
        paddingTop={1}
        paddingBottom={1}
        gap={1}
      >
        <box flexDirection="row">
          <text width={14} fg={theme.textMuted}>
            Model:
          </text>
          <text fg={theme.text}>{local.model.parsed().provider} / {local.model.parsed().model}</text>
        </box>
        <box flexDirection="row">
          <text width={14} fg={theme.textMuted}>
            Agent:
          </text>
          <text fg={theme.text}>{local.agent.current()?.name ?? "None"}</text>
        </box>
        <box flexDirection="row">
          <text width={14} fg={theme.textMuted}>
            Directory:
          </text>
          <text fg={theme.text} wrapMode="none" truncate flexShrink={1}>
            {project.instance.directory() || "Not connected"}
          </text>
        </box>
        <box flexDirection="row">
          <text width={14} fg={theme.textMuted}>
            Providers:
          </text>
          <text fg={connectedProviders() ? theme.success : theme.warning}>
            {connectedProviders()} connected / {sync.data.provider_next.all.length} available
          </text>
        </box>
        <box flexDirection="row">
          <text width={14} fg={theme.textMuted}>
            Components:
          </text>
          <text fg={theme.text}>
            MCP {connectedMcp()}/{Object.keys(sync.data.mcp).length} · LSP {sync.data.lsp.length} · Formatters {enabledFormatters().length} · Plugins {plugins().length}
          </text>
        </box>
      </box>
      <Show when={Object.keys(sync.data.mcp).length > 0}>
        <box gap={1}>
          <text fg={theme.textMuted}>MCP Servers</text>
          <For each={Object.entries(sync.data.mcp)}>
            {([key, item]) => (
              <box flexDirection="row" gap={1} paddingLeft={1}>
                <text fg={item.status === "connected" ? theme.success : theme.warning}>[{item.status === "connected" ? "+" : "!"}]</text>
                <text fg={theme.text}>
                  <b>{key}</b>{" "}
                  <span style={{ fg: theme.textMuted }}>
                    <Switch fallback={item.status}>
                      <Match when={item.status === "connected"}>Connected</Match>
                      <Match when={item.status === "failed" && item}>{(value) => value().error}</Match>
                      <Match when={item.status === "disabled"}>Disabled in configuration</Match>
                      <Match when={(item.status as string) === "needs_auth"}>Needs authentication</Match>
                      <Match when={(item.status as string) === "needs_client_registration" && item}>
                        {(value) => (value() as { error: string }).error}
                      </Match>
                    </Switch>
                  </span>
                </text>
              </box>
            )}
          </For>
        </box>
      </Show>
    </box>
  )
}
