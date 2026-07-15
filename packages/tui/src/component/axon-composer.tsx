import { TextAttributes } from "@opentui/core"
import { Show, type JSX } from "solid-js"
import { useTheme } from "../context/theme"
import type { BrandDensity } from "../util/brand-layout"

export function AxonComposer(props: {
  density: BrandDensity
  focused?: boolean
  children: JSX.Element
}) {
  const theme = useTheme().theme

  return (
    <box
      width="100%"
      flexDirection="column"
      border={["top", "right", "bottom", "left"]}
      borderColor={props.focused ? theme.borderActive : theme.border}
      backgroundColor={theme.backgroundPanel}
      paddingLeft={props.density === "compact" ? 1 : 2}
      paddingRight={props.density === "compact" ? 1 : 2}
      paddingTop={1}
      paddingBottom={1}
    >
      <box width="100%" flexDirection="row" justifyContent="space-between">
        <text fg={theme.primary} attributes={TextAttributes.BOLD} selectable={false}>
          Ask Axon
        </text>
        <Show when={props.density !== "compact"}>
          <text fg={theme.textMuted} selectable={false}>
            @agent  /command  #file
          </text>
        </Show>
      </box>
      <box width="100%" paddingTop={props.density === "compact" ? 0 : 1}>
        {props.children}
      </box>
    </box>
  )
}
