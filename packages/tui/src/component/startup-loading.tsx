import { InstallationVersion } from "@opencode-ai/core/installation/version"
import { useTerminalDimensions } from "@opentui/solid"
import { createMemo, Show } from "solid-js"
import { AxonLogo } from "./axon-logo"
import { useKV } from "../context/kv"
import { useStartupProgress } from "../context/startup"
import { useTheme } from "../context/theme"
import { brandDensity, showSplashArtwork } from "../util/brand-layout"
import { startupMinimumDelay } from "../util/startup"
import { createStartupVisibility } from "./startup-visibility"

export function StartupLoading() {
  const dimensions = useTerminalDimensions()
  const startup = useStartupProgress()
  const theme = useTheme().theme
  const kv = useKV()
  const minimum = createMemo(() =>
    startupMinimumDelay(kv.get("animations_enabled", true), dimensions().width, dimensions().height),
  )
  const snapshot = createMemo(() => startup.snapshot())
  const visible = createStartupVisibility({ done: () => snapshot().done, minimum })
  const trackWidth = createMemo(() => {
    if (brandDensity(dimensions().width, dimensions().height) === "compact") return Math.max(1, dimensions().width - 6)
    if (brandDensity(dimensions().width, dimensions().height) === "normal") return 48
    return 64
  })
  const filled = createMemo(() => Math.floor((trackWidth() * snapshot().percent) / 100))

  return (
    <Show when={visible()}>
      <box
        position="absolute"
        zIndex={5000}
        top={0}
        left={0}
        width={dimensions().width}
        height={dimensions().height}
        flexDirection="column"
        backgroundColor={theme.background}
        paddingLeft={2}
        paddingRight={2}
      >
        <box width="100%" flexDirection="row" justifyContent="space-between" flexShrink={0}>
          <text fg={theme.textMuted}>+</text>
          <text fg={theme.textMuted}>+</text>
        </box>
        <box flexGrow={1} minHeight={0} />
        <box alignItems="center" flexDirection="column" flexShrink={0}>
          <AxonLogo size={showSplashArtwork(dimensions().width, dimensions().height) ? "full" : "compact"} />
          <box height={2} />
          <text fg={snapshot().error ? theme.error : theme.text}>{snapshot().label}</text>
          <text>
            <span style={{ fg: theme.borderSubtle }}>[</span>
            <span style={{ fg: theme.primary }}>{"=".repeat(filled())}</span>
            <span style={{ fg: theme.borderSubtle }}>{"-".repeat(trackWidth() - filled())}]</span>
          </text>
          <text fg={theme.textMuted}>{snapshot().percent}%</text>
        </box>
        <box flexGrow={1} minHeight={0} />
        <box width="100%" flexDirection="row" justifyContent="space-between" flexShrink={0}>
          <text fg={theme.textMuted}>+ Axon {InstallationVersion}</text>
          <text fg={theme.textMuted}>local +</text>
        </box>
      </box>
    </Show>
  )
}
