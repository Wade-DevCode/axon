import { run as runTui, type TuiInput } from "@axon-ai/tui"
import { Global } from "@axon-ai/core/global"
import { Effect } from "effect"

export function run(input: TuiInput) {
  return runTui(input).pipe(Effect.provide(Global.defaultLayer))
}
