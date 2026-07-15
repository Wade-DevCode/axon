import { InstallationVersion } from "@opencode-ai/core/installation/version"
import { useTerminalDimensions } from "@opentui/solid"
import { TextAttributes } from "@opentui/core"
import { createMemo, createSignal, onCleanup, Show } from "solid-js"
import { useKV } from "../context/kv"
import { useStartupProgress } from "../context/startup"
import { useTheme } from "../context/theme"
import { brandDensity, showSplashArtwork } from "../util/brand-layout"
import { startupMinimumDelay } from "../util/startup"

export function StartupLoading() {
  const dimensions = useTerminalDimensions()
  const startup = useStartupProgress()
  const theme = useTheme().theme
  const kv = useKV()
  const minimum = startupMinimumDelay(
    kv.get("animations_enabled", true),
    dimensions().width,
    dimensions().height,
  )
  const [minimumElapsed, setMinimumElapsed] = createSignal(minimum === 0)
  const timer = minimum === 0 ? undefined : setTimeout(() => setMinimumElapsed(true), minimum).unref()
  const snapshot = createMemo(() => startup.snapshot())
  const visible = createMemo(() => !snapshot().done || !minimumElapsed())
  const trackWidth = createMemo(() => {
    if (brandDensity(dimensions().width, dimensions().height) === "compact") return Math.max(1, dimensions().width - 6)
    if (brandDensity(dimensions().width, dimensions().height) === "normal") return 48
    return 64
  })
  const track = createMemo(() => {
    const filled = Math.floor((trackWidth() * snapshot().percent) / 100)
    return `[${"=".repeat(filled)}${"-".repeat(trackWidth() - filled)}]`
  })

  onCleanup(() => {
    if (timer) clearTimeout(timer)
  })

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
          <Show when={showSplashArtwork(dimensions().width, dimensions().height)}>
            <text fg={theme.primary} attributes={TextAttributes.BOLD}>/\  /\</text>
            <text fg={theme.primary} attributes={TextAttributes.BOLD}> A X</text>
            <box height={1} />
          </Show>
          <text fg={theme.text} attributes={TextAttributes.BOLD}>A X O N</text>
          <text fg={theme.textMuted}>Developer Agent for the Terminal</text>
          <box height={2} />
          <text fg={snapshot().error ? theme.error : theme.text}>{snapshot().label}</text>
          <text fg={theme.primary}>{track()}</text>
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
