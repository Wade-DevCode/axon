import { createSignal, onCleanup, Show } from "solid-js"
import { useTheme } from "../context/theme"
import { useKV } from "../context/kv"
import type { JSX } from "@opentui/solid"
import { RGBA } from "@opentui/core"
import "opentui-spinner/solid"

export const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
const THINKING_PATH_LENGTH = 8

export function Spinner(props: { children?: JSX.Element; color?: RGBA }) {
  const { theme } = useTheme()
  const kv = useKV()
  const color = () => props.color ?? theme.textMuted
  return (
    <Show when={kv.get("animations_enabled", true)} fallback={<text fg={color()}>⋯ {props.children}</text>}>
      <box flexDirection="row" gap={1}>
        <spinner frames={SPINNER_FRAMES} interval={80} color={color()} />
        <Show when={props.children}>
          <text fg={color()}>{props.children}</text>
        </Show>
      </box>
    </Show>
  )
}

export function ThinkingIndicator(props: { text: string; color?: RGBA }) {
  const { theme } = useTheme()
  const kv = useKV()
  const color = () => props.color ?? theme.textMuted
  const [frame, setFrame] = createSignal(0)
  const timer = setInterval(() => setFrame((current) => (current + 1) % THINKING_PATH_LENGTH), 120)
  onCleanup(() => clearInterval(timer))
  const animated = () => kv.get("animations_enabled", true)
  const cellColor = (index: number) => {
    if (!animated()) return color()
    const distance = (index - frame() + THINKING_PATH_LENGTH) % THINKING_PATH_LENGTH
    const alpha = distance === 0 ? color().a : distance === 1 ? color().a * 0.75 : color().a * 0.4
    return RGBA.fromValues(color().r, color().g, color().b, alpha)
  }
  const cell = (index: number, value: string) => (
    <span style={{ fg: cellColor(index) }}>{animated() && index === frame() ? "•" : value}</span>
  )

  return (
    <box flexDirection="row" gap={1} alignItems="center">
      <box width={3} height={3} flexShrink={0} flexDirection="column">
        <text wrapMode="none">
          {cell(0, "┌")}
          {cell(1, "─")}
          {cell(2, "┐")}
        </text>
        <text wrapMode="none">
          {cell(7, "│")} {cell(3, "│")}
        </text>
        <text wrapMode="none">
          {cell(6, "└")}
          {cell(5, "─")}
          {cell(4, "┘")}
        </text>
      </box>
      <text fg={color()} wrapMode="none">
        {props.text}
      </text>
    </box>
  )
}
