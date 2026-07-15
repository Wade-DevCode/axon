import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { createStartupProgress } from "../../src/context/startup"
import { startupPhaseOrder } from "../../src/util/startup"

test("startup progress transitions are idempotent and preserve the first error", () => {
  createRoot((dispose) => {
    const startup = createStartupProgress()

    startup.start("configuration")
    startup.start("configuration")
    startup.complete("configuration")
    startup.fail("configuration", new Error("late configuration failure"))
    expect(startup.phases.configuration).toEqual({ state: "complete" })

    startup.start("workspace")
    startup.fail("workspace", new Error("workspace unavailable"))
    startup.start("providers")
    startup.fail("providers", new Error("provider unavailable"))
    for (const phase of startupPhaseOrder) startup.complete(phase)

    expect(startup.snapshot()).toEqual({
      label: "workspace unavailable",
      percent: 100,
      done: true,
      error: "workspace unavailable",
    })
    dispose()
  })
})
