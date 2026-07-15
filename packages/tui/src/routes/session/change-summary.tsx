import { TextAttributes } from "@opentui/core"
import { For, Show } from "solid-js"
import { useTheme } from "../../context/theme"
import type { BrandDensity } from "../../util/brand-layout"
import type { ChangeFile } from "./presentation"

export function AxonChangeSummary(props: { files: readonly ChangeFile[]; density: BrandDensity }) {
  const theme = useTheme().theme

  return (
    <Show when={props.files.length > 0}>
      <box
        flexDirection="column"
        flexShrink={0}
        marginTop={1}
        marginLeft={props.density === "compact" ? 0 : 2}
        border={["left"]}
        borderColor={theme.success}
        paddingLeft={1}
      >
        <text fg={theme.text} attributes={TextAttributes.BOLD}>
          Change Summary
        </text>
        <For each={props.files}>
          {(file) => (
            <box flexDirection="row" justifyContent="space-between">
              <text fg={theme.textMuted} wrapMode="none">
                {file.path}
              </text>
              <Show when={file.additions !== undefined && file.deletions !== undefined}>
                <text>
                  <span style={{ fg: theme.diffAdded }}>+{file.additions}</span>{" "}
                  <span style={{ fg: theme.diffRemoved }}>-{file.deletions}</span>
                </text>
              </Show>
            </box>
          )}
        </For>
      </box>
    </Show>
  )
}
