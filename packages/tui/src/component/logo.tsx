import { TextAttributes } from "@opentui/core"
import { useTheme } from "../context/theme"
import { logo } from "../logo"

export function Logo() {
  const { theme } = useTheme()

  return (
    <box flexDirection="column" alignItems="center">
      <box flexDirection="row" gap={1}>
        <text fg={theme.primary} attributes={TextAttributes.BOLD} selectable={false}>
          {logo.slice(0, 2)}
        </text>
        <text fg={theme.text} attributes={TextAttributes.BOLD} selectable={false}>
          {logo.slice(2)}
        </text>
      </box>
    </box>
  )
}
