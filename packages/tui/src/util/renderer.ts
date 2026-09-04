import type { CliRenderer } from "@opentui/core"

const TERMINAL_THINKING_FRAMES = ["┌•┐", "┌─•", "│ •", "└─•", "└•┘", "•─┘", "• │", "•─┐"]

export function createTerminalTitleController(renderer: Pick<CliRenderer, "setTerminalTitle">) {
  let timer: ReturnType<typeof setInterval> | undefined
  let title: string | undefined
  let working = false

  const stop = () => {
    if (timer === undefined) return
    clearInterval(timer)
    timer = undefined
  }

  const set = (nextTitle: string, nextWorking: boolean) => {
    if (title === nextTitle && working === nextWorking) return
    stop()
    title = nextTitle
    working = nextWorking
    if (!nextWorking) {
      renderer.setTerminalTitle(nextTitle)
      return
    }

    let frame = 0
    const render = () => {
      renderer.setTerminalTitle(`${TERMINAL_THINKING_FRAMES[frame]} ${nextTitle}`)
      frame = (frame + 1) % TERMINAL_THINKING_FRAMES.length
    }
    render()
    timer = setInterval(render, 120)
  }

  const dispose = () => {
    stop()
    title = undefined
    working = false
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
