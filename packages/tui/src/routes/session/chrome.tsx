import { TextAttributes } from "@opentui/core"
import { Show } from "solid-js"
import { useTheme } from "../../context/theme"
import type { BrandDensity } from "../../util/brand-layout"

export function AxonSessionHeader(props: {
  project: string
  branch?: string
  agent: string
  ready: boolean
  density: BrandDensity
}) {
  const theme = useTheme().theme

  return (
    <box
      width="100%"
      flexDirection="row"
      justifyContent="space-between"
      flexShrink={0}
      border={["bottom"]}
      borderColor={theme.border}
      paddingLeft={props.density === "compact" ? 0 : 1}
      paddingRight={props.density === "compact" ? 0 : 1}
    >
      <box flexDirection="row" gap={props.density === "wide" ? 2 : 1} minWidth={0}>
        <Show when={props.density !== "compact"}>
          <text fg={theme.primary} attributes={TextAttributes.BOLD} wrapMode="none">
            AXON
          </text>
        </Show>
        <Show when={props.density === "wide" && props.project}>
          <text fg={theme.text} wrapMode="none">
            {props.project}
          </text>
        </Show>
        <text fg={theme.info} wrapMode="none">
          {props.branch ?? "local"}
        </text>
      </box>
      <text fg={props.ready ? theme.success : theme.warning} wrapMode="none">
        AX {props.density === "wide" ? `${props.ready ? "Ready" : "Working"} · ${props.agent}` : props.ready ? "Ready" : "Working"}
      </text>
    </box>
  )
}

export function AxonStatusBar(props: {
  changedFiles: number
  density: BrandDensity
}) {
  const theme = useTheme().theme

  return (
    <box
      width="100%"
      flexDirection="row"
      justifyContent="space-between"
      flexShrink={0}
      paddingLeft={props.density === "compact" ? 0 : 1}
      paddingRight={props.density === "compact" ? 0 : 1}
    >
      <box flexDirection="row" gap={props.density === "wide" ? 2 : 1} minWidth={0}>
        <Show when={props.density !== "compact" && props.changedFiles > 0}>
          <text fg={theme.info}>
            {props.changedFiles} file{props.changedFiles === 1 ? "" : "s"} changed
          </text>
        </Show>
      </box>
    </box>
  )
}
