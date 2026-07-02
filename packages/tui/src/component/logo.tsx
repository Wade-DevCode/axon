import { TextAttributes } from "@opentui/core"
import { For } from "solid-js"
import { useTheme } from "../context/theme"
import { logo } from "../logo"

export function Logo() {
  const { theme } = useTheme()
  const lines = logo.split("\n")

  return (
    <box flexDirection="column" alignItems="center">
      <For each={lines}>
        {(line, index) => (
          <text
            fg={index() < 2 ? theme.primary : theme.text}
            attributes={TextAttributes.BOLD}
            selectable={false}
            wrapMode="none"
          >
            {line}
          </text>
        )}
      </For>
    </box>
  )
}
