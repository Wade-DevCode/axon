import { describe, expect, test } from "bun:test"
import { agentDescription, agentLabel } from "../../src/util/agent-label"

describe("agent labels", () => {
  test("maps built-in coding agents to Code", () => {
    expect(agentLabel("build")).toBe("Code")
    expect(agentLabel("code")).toBe("Code")
  })

  test("maps built-in product modes", () => {
    expect(agentLabel("ask")).toBe("Ask")
    expect(agentLabel("plan")).toBe("Plan")
    expect(agentLabel("debug")).toBe("Debug")
    expect(agentLabel("review")).toBe("Review")
    expect(agentLabel("orchestrator")).toBe("Orchestrator")
  })

  test("leaves custom agents readable", () => {
    expect(agentLabel("my_custom_agent")).toBe("My Custom Agent")
  })

  test("uses product descriptions for built-ins and custom descriptions otherwise", () => {
    expect(agentDescription({ name: "build", native: true })).toBe("Build and edit code")
    expect(agentDescription({ name: "review", native: true })).toBe("Review diffs and PR feedback")
    expect(agentDescription({ name: "custom", description: "Custom work" })).toBe("Custom work")
  })
})
