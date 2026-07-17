import { Prompt, type PromptRef } from "../component/prompt"
import { createEffect, createMemo, createSignal, onMount } from "solid-js"
import { AxonComposer } from "../component/axon-composer"
import { useSync } from "../context/sync"
import { Toast } from "../ui/toast"
import { useArgs } from "../context/args"
import { useRouteData } from "../context/route"
import { usePromptRef } from "../context/prompt"
import { useLocal } from "../context/local"
import { usePluginRuntime } from "../plugin/runtime"
import { useEditorContext } from "../context/editor"
import { useProject } from "../context/project"
import { useTheme } from "../context/theme"
import { useTerminalDimensions } from "@opentui/solid"
import { HomeSessionDestinationProvider } from "./home/session-destination"
import { brandDensity } from "../util/brand-layout"
import { Product } from "../util/product"

let once = false
const placeholder = {
  normal: ["Fix a TODO in the codebase", "What is the tech stack of this project?", "Fix broken tests"],
  shell: ["ls -la", "git status", "pwd"],
}

export function Home() {
  const pluginRuntime = usePluginRuntime()
  const sync = useSync()
  const route = useRouteData("home")
  const promptRef = usePromptRef()
  const [ref, setRef] = createSignal<PromptRef | undefined>()
  const args = useArgs()
  const local = useLocal()
  const editor = useEditorContext()
  const project = useProject()
  const theme = useTheme().theme
  const dimensions = useTerminalDimensions()
  const density = createMemo(() => brandDensity(dimensions().width, dimensions().height))
  const directory = createMemo(() => sync.path.directory ?? project.instance.directory())
  let sent = false

  onMount(() => {
    editor.clearSelection()
  })

  const bind = (r: PromptRef | undefined) => {
    setRef(r)
    promptRef.set(r)
    if (once || !r) return
    if (route.prompt) {
      r.set(route.prompt)
      once = true
      return
    }
    if (!args.prompt) return
    r.set({ input: args.prompt, parts: [] })
    once = true
  }

  // Wait for sync and model store to be ready before auto-submitting --prompt
  createEffect(() => {
    const r = ref()
    if (sent) return
    if (!r) return
    if (!sync.ready || !local.model.ready) return
    if (!args.prompt) return
    if (r.current.input !== args.prompt) return
    sent = true
    r.submit()
  })

  return (
    <HomeSessionDestinationProvider>
      <box flexGrow={1} flexDirection="column" alignItems="center">
        <box width="100%" maxWidth={62} alignSelf="flex-start" flexDirection="column" marginLeft={2} paddingTop={1} flexShrink={0}>
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
              <text fg={theme.textMuted} selectable={false}>WANGHUI</text>
            </box>
            <box flexDirection="row" gap={1}>
              <text fg={theme.textMuted} selectable={false}>model:</text>
              <text fg={theme.text} selectable={false}>{local.model.parsed().model}</text>
              <text fg={theme.info} selectable={false}>/models to change</text>
            </box>
            <box flexDirection="row" gap={1}>
              <text fg={theme.textMuted} selectable={false}>directory:</text>
              <text fg={theme.text} selectable={false}>{directory()}</text>
            </box>
          </box>
        </box>
        <box width="100%" paddingLeft={2} paddingRight={2}>
          <pluginRuntime.Slot name="home_bottom" />
        </box>
        <box width="100%" zIndex={1000} paddingTop={1} paddingBottom={1} flexShrink={0}>
          <AxonComposer density={density()} focused>
            <pluginRuntime.Slot name="home_prompt" mode="replace" ref={bind}>
              <Prompt ref={bind} right={<pluginRuntime.Slot name="home_prompt_right" />} placeholders={placeholder} />
            </pluginRuntime.Slot>
          </AxonComposer>
        </box>
        <box flexGrow={1} minHeight={0} />
        <Toast />
      </box>
      <box width="100%" flexShrink={0}>
        <pluginRuntime.Slot name="home_footer" mode="single_winner" />
      </box>
    </HomeSessionDestinationProvider>
  )
}
