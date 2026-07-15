import type { ToolPart } from "@opencode-ai/sdk/v2"
import { TextAttributes } from "@opentui/core"
import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js"
import { useTheme } from "../../context/theme"
import type { BrandDensity } from "../../util/brand-layout"
import { toolRow, type ToolRowStatus } from "./presentation"

export function AxonToolPanel(props: {
  parts: readonly ToolPart[]
  density: BrandDensity
  now?: number
  onOpen?: (part: ToolPart) => void
}) {
  const theme = useTheme().theme
  const [now, setNow] = createSignal(props.now ?? Date.now())
  const rows = createMemo(() => props.parts.map((part) => ({ part, row: toolRow(part, now()) })))

  onMount(() => {
    if (props.now !== undefined || !props.parts.some((part) => part.state.status === "running")) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    onCleanup(() => clearInterval(timer))
  })

  const color = (status: ToolRowStatus) => {
    if (status === "running" || status === "pending") return theme.warning
    if (status === "success") return theme.success
    if (status === "failed") return theme.error
    return theme.textMuted
  }

  return (
    <Show when={rows().length > 0}>
      <box
        flexDirection="column"
        flexShrink={0}
        marginTop={1}
        marginLeft={props.density === "compact" ? 0 : 2}
        border={["left"]}
        borderColor={theme.borderActive}
        paddingLeft={1}
      >
        <text fg={theme.textMuted} attributes={TextAttributes.BOLD}>
          Activity
        </text>
        <For each={rows()}>
          {(item) => (
            <Show
              when={props.density === "compact"}
              fallback={
                <box flexDirection="row" justifyContent="space-between" onMouseUp={() => props.onOpen?.(item.part)}>
                  <box flexDirection="row" gap={1} minWidth={0}>
                    <text fg={theme.text} attributes={TextAttributes.BOLD} wrapMode="none">
                      {item.row.kind}
                    </text>
                    <text fg={theme.textMuted} wrapMode="none">
                      {item.row.target}
                    </text>
                  </box>
                  <box flexDirection="row" gap={1}>
                    <text fg={color(item.row.status)}>{item.row.status}</text>
                    <Show when={item.row.additions !== undefined}>
                      <text fg={theme.diffAdded}>+{item.row.additions}</text>
                      <text fg={theme.diffRemoved}>-{item.row.deletions}</text>
                    </Show>
                    <Show when={item.row.duration !== undefined}>
                      <text fg={theme.textMuted}>{item.row.duration} ms</text>
                    </Show>
                  </box>
                </box>
              }
            >
              <box flexDirection="column" onMouseUp={() => props.onOpen?.(item.part)}>
                <box flexDirection="row" justifyContent="space-between">
                  <text fg={theme.text} attributes={TextAttributes.BOLD} wrapMode="none">
                    {item.row.kind}
                  </text>
                  <text fg={color(item.row.status)}>{item.row.status}</text>
                </box>
                <Show when={item.row.target}>
                  <text fg={theme.textMuted} wrapMode="none">
                    {item.row.target}
                  </text>
                </Show>
              </box>
            </Show>
          )}
        </For>
      </box>
    </Show>
  )
}
