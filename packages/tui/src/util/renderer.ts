import type { CliRenderer } from "@opentui/core"

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
