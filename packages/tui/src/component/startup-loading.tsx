import { InstallationVersion } from "@axon-ai/core/installation/version"
import { TextAttributes } from "@opentui/core"
import { useTerminalDimensions } from "@opentui/solid"
import { createMemo, For, Show } from "solid-js"
import { AxonLogo } from "./axon-logo"
import { useKV } from "../context/kv"
import { useStartupProgress } from "../context/startup"
import { useTheme } from "../context/theme"
import { brandDensity, showSplashArtwork } from "../util/brand-layout"
import { startupMinimumDelay, startupPhaseOrder, startupPhaseShortLabels } from "../util/startup"
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
  const density = createMemo(() => brandDensity(dimensions().width, dimensions().height))
  const trackWidth = createMemo(() => {
    if (density() === "compact") return Math.max(1, dimensions().width - 14)
    if (density() === "normal") return 50
    return 66
  })
  const filled = createMemo(() => Math.floor((trackWidth() * snapshot().percent) / 100))
  const shortActive = createMemo(() => {
    const active = snapshot().active
    return active ? startupPhaseShortLabels[active] : "READY"
  })
  const stageIcon = (phase: (typeof startupPhaseOrder)[number]) => {
    const state = startup.phases[phase].state
    if (state === "complete") return "✓"
    if (state === "error") return "!"
    if (phase === snapshot().active) return "◆"
    return "·"
  }
  const stageColor = (phase: (typeof startupPhaseOrder)[number]) => {
    const state = startup.phases[phase].state
    if (state === "error") return theme.error
    if (state === "complete") return theme.success
    if (phase === snapshot().active) return theme.primary
    return theme.borderActive
  }

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
        paddingTop={1}
        paddingBottom={1}
      >
        <box width="100%" flexDirection="row" justifyContent="space-between" flexShrink={0}>
          <text fg={theme.textMuted} attributes={TextAttributes.BOLD}>
            AXON <span style={{ fg: theme.borderActive }}>/ STARTUP</span>
          </text>
          <Show when={density() !== "compact"}>
            <text fg={theme.borderActive}>LOCAL RUNTIME</text>
          </Show>
        </box>
        <box flexGrow={1} minHeight={0} />
        <box alignItems="center" flexDirection="column" flexShrink={0}>
          <AxonLogo
            size={
              density() === "wide"
                ? "display"
                : showSplashArtwork(dimensions().width, dimensions().height)
                  ? "full"
                  : "compact"
            }
          />
          <box height={1} />
          <box width={trackWidth() + 8} flexDirection="row" justifyContent="space-between">
            <text fg={snapshot().error ? theme.error : theme.text} attributes={TextAttributes.BOLD}>
              {snapshot().error
                ? "STARTUP INTERRUPTED"
                : density() === "compact"
                  ? shortActive()
                  : snapshot().label.toUpperCase()}
            </text>
            <text fg={theme.textMuted}>
              {String(snapshot().completed).padStart(2, "0")} / {String(startupPhaseOrder.length).padStart(2, "0")}
            </text>
          </box>
          <text>
            <span style={{ fg: theme.primary }}>{"━".repeat(filled())}</span>
            <span style={{ fg: theme.borderSubtle }}>{"─".repeat(trackWidth() - filled())}</span>
            <span style={{ fg: theme.textMuted }}> {String(snapshot().percent).padStart(3, " ")}%</span>
          </text>
          <Show when={density() === "wide"}>
            <box width={trackWidth() + 8} flexDirection="row" justifyContent="space-between">
              <For each={startupPhaseOrder}>
                {(phase) => (
                  <text fg={stageColor(phase)}>
                    {stageIcon(phase)} {startupPhaseShortLabels[phase]}
                  </text>
                )}
              </For>
            </box>
          </Show>
          <Show when={density() === "normal"}>
            <text fg={theme.textMuted}>
              <span style={{ fg: theme.primary }}>{shortActive()}</span>
              {"  ·  "}
              {snapshot().completed} COMPLETE
            </text>
          </Show>
        </box>
        <box flexGrow={2} minHeight={0} />
        <box width="100%" flexDirection="row" justifyContent="space-between" flexShrink={0}>
          <text fg={theme.borderActive}>v{InstallationVersion}</text>
          <Show when={density() !== "compact"}>
            <text fg={theme.borderActive}>INITIALIZING SYSTEM</text>
          </Show>
        </box>
      </box>
    </Show>
  )
}
