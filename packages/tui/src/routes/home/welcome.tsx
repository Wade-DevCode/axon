import { createMemo } from "solid-js"
import { useLocal } from "../../context/local"
import { usePluginRuntime } from "../../plugin/runtime"
import { useProject } from "../../context/project"
import { useSync } from "../../context/sync"
import { useTheme } from "../../context/theme"
import { Product } from "../../util/product"

export function HomeWelcome() {
  const pluginRuntime = usePluginRuntime()
  const sync = useSync()
  const local = useLocal()
  const project = useProject()
  const theme = useTheme().theme
  const directory = createMemo(() => sync.path.directory ?? project.instance.directory())

  return (
    <>
      <box
        width="100%"
        maxWidth={62}
        alignSelf="flex-start"
        flexDirection="column"
        marginLeft={2}
        paddingTop={1}
        flexShrink={0}
      >
        <box
          width="100%"
          flexDirection="column"
          border={["top", "right", "bottom", "left"]}
          borderColor={theme.border}
          customBorderChars={{
            topLeft: "╭",
            topRight: "╮",
            bottomLeft: "╰",
            bottomRight: "╯",
            horizontal: "─",
            vertical: "│",
            topT: "┬",
            bottomT: "┴",
            leftT: "├",
            rightT: "┤",
            cross: "┼",
          }}
          paddingLeft={1}
          paddingRight={1}
          paddingTop={1}
          paddingBottom={1}
          gap={1}
        >
          <box width="100%" flexDirection="row" justifyContent="space-between">
            <pluginRuntime.Slot name="home_logo" mode="replace">
              <text fg={theme.text} selectable={false}>
                <span style={{ fg: theme.primary, bold: true }}>{">_ AXON"}</span>
                <span style={{ fg: theme.textMuted }}> {`(v${Product.info.version})`}</span>
              </text>
            </pluginRuntime.Slot>
            <text fg={theme.textMuted} selectable={false}>
              WANGHUI
            </text>
          </box>
          <box flexDirection="row" gap={1}>
            <text fg={theme.textMuted} selectable={false}>
              model:
            </text>
            <text fg={theme.text} selectable={false}>
              {local.model.parsed().model}
            </text>
            <text fg={theme.info} selectable={false}>
              /models to change
            </text>
          </box>
          <box flexDirection="row" gap={1}>
            <text fg={theme.textMuted} selectable={false}>
              directory:
            </text>
            <text fg={theme.text} selectable={false}>
              {directory()}
            </text>
          </box>
        </box>
      </box>
      <box width="100%" paddingLeft={2} paddingRight={2}>
        <pluginRuntime.Slot name="home_bottom" />
      </box>
    </>
  )
}
