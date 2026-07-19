import { expect } from "bun:test"
import { Effect } from "effect"
import { testEffect } from "../lib/effect"
import { Command } from "../../src/command"

const it = testEffect(Command.defaultLayer)

it.instance("built-in review command uses review agent", () =>
  Effect.gen(function* () {
    const command = yield* Command.Service.use((svc) => svc.get("review"))
    expect(command?.agent).toBe("review")
    expect(command?.subtask).toBe(true)
    expect(command?.hints).toContain("$ARGUMENTS")
  }),
)
