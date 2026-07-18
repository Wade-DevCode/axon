import { TextAttributes } from "@opentui/core"
import { For, Show } from "solid-js"
import { useTheme } from "../context/theme"
import { axonCompact, axonMark, axonMarkWidth, axonWordmark } from "../logo"

export function AxonLogo(props: { size: "full" | "compact" | "lockup" }) {
  const theme = useTheme().theme

  return (
    <box alignItems="center" flexDirection="column" flexShrink={0}>
      <Show when={props.size === "lockup"}>
        <box alignItems="center" flexDirection="row" gap={3}>
          <box width={axonMarkWidth} flexDirection="column">
            <For each={axonMark}>
              {(line) => (
                <text fg={theme.primary} attributes={TextAttributes.BOLD} selectable={false}>
                  {line}
                </text>
              )}
            </For>
          </box>
          <box flexDirection="column">
            <text fg={theme.text} attributes={TextAttributes.BOLD} selectable={false}>
              {axonWordmark}
            </text>
            <text fg={theme.textMuted} selectable={false}>
              Developer Agent for the Terminal
            </text>
            <text fg={theme.borderActive} selectable={false}>
              BY WANGHUI
            </text>
          </box>
        </box>
      </Show>
      <Show
        when={props.size === "full"}
        fallback={
          <Show when={props.size === "compact"}>
            <text fg={theme.primary} attributes={TextAttributes.BOLD} selectable={false}>
              {axonCompact}
            </text>
          </Show>
        }
      >
        <box alignItems="center" flexDirection="column">
          <box width={axonMarkWidth} flexDirection="column">
            <For each={axonMark}>
              {(line) => (
                <text fg={theme.primary} attributes={TextAttributes.BOLD} selectable={false}>
                  {line}
                </text>
              )}
            </For>
          </box>
          <text fg={theme.text} attributes={TextAttributes.BOLD} selectable={false}>
            {axonWordmark}
          </text>
          <text fg={theme.textMuted} selectable={false}>
            Developer Agent for the Terminal
          </text>
          <text fg={theme.borderActive} selectable={false}>
            BY WANGHUI
          </text>
        </box>
      </Show>
    </box>
  )
}
