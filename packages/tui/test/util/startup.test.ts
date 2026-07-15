import { describe, expect, test } from "bun:test"
import { initialStartupPhases, startupMinimumDelay, startupSnapshot } from "../../src/util/startup"

describe("startupSnapshot", () => {
  test("reports completed real phases without interpolating", () => {
    const phases = initialStartupPhases()
    phases.configuration = { state: "complete" }
    phases.workspace = { state: "running" }

    expect(startupSnapshot(phases)).toMatchObject({
      label: "Opening workspace",
      percent: 17,
      done: false,
    })
  })

  test("surfaces the first failure and still reaches a terminal state", () => {
    const phases = initialStartupPhases()
    for (const name of Object.keys(phases) as Array<keyof typeof phases>) phases[name] = { state: "complete" }
    phases.mcp = { state: "error", error: "MCP status unavailable" }

    expect(startupSnapshot(phases)).toEqual({
      label: "MCP status unavailable",
      percent: 100,
      done: true,
      error: "MCP status unavailable",
    })
  })

  test("keeps progress stable while a real phase is running", () => {
    const phases = initialStartupPhases()
    phases.configuration = { state: "complete" }
    phases.workspace = { state: "running" }

    expect(startupSnapshot(phases).percent).toBe(17)
    expect(startupSnapshot(phases).percent).toBe(17)
  })
})

describe("startupMinimumDelay", () => {
  test("holds artwork for 800 ms only when animations are enabled and it fits", () => {
    expect(startupMinimumDelay(true, 120, 24)).toBe(800)
    expect(startupMinimumDelay(false, 120, 24)).toBe(0)
    expect(startupMinimumDelay(true, 80, 14)).toBe(0)
  })
})
