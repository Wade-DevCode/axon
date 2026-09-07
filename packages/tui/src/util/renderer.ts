import type { CliRenderer } from "@opentui/core"
import { SPINNER_FRAMES } from "../ui/spinner"

const TERMINAL_TITLE_SPINNER_INTERVAL = 100

export function createTerminalTitleController(renderer: Pick<CliRenderer, "setTerminalTitle">) {
  let timer: ReturnType<typeof setInterval> | undefined
  let title: string | undefined
  let spinning = false

  const stop = () => {
    if (timer === undefined) return
    clearInterval(timer)
    timer = undefined
  }

  const set = (nextTitle: string, nextSpinning: boolean) => {
    if (title === nextTitle && spinning === nextSpinning) return
    stop()
    title = nextTitle
    spinning = nextSpinning
    if (!nextSpinning) {
      renderer.setTerminalTitle(nextTitle)
      return
    }

    let frame = 0
    const render = () => {
      renderer.setTerminalTitle(`${SPINNER_FRAMES[frame]} ${nextTitle}`)
      frame = (frame + 1) % SPINNER_FRAMES.length
    }
    render()
    timer = setInterval(render, TERMINAL_TITLE_SPINNER_INTERVAL)
  }

  const dispose = () => {
    stop()
    title = undefined
    spinning = false
  }

  return { set, dispose }
}

export function setTerminalProgress(working: boolean) {
  // Keep control sequences out of OpenTUI's stdout capture path when running in split-footer mode.
  const output = process.stderr.isTTY ? process.stderr : process.stdout.isTTY ? process.stdout : undefined
  if (!output) return
  // Windows Terminal renders OSC 9;4's indeterminate state as an animated tab indicator.
  output.write(`\u001b]9;4;${working ? 3 : 0};0\u0007`)
}

export function destroyRenderer(renderer: Pick<CliRenderer, "isDestroyed" | "setTerminalTitle" | "destroy">) {
  setTerminalProgress(false)
  renderer.setTerminalTitle("")
  if (renderer.isDestroyed) return
  renderer.destroy()
}
