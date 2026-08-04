import { afterEach, describe, expect, test } from "bun:test"
import { isVsCode } from "./vscode"

const host = window as typeof window & { __AXON_VSCODE__?: unknown }

afterEach(() => {
  delete host.__AXON_VSCODE__
})

describe("VS Code host detection", () => {
  test("detects the extension bootstrap", () => {
    host.__AXON_VSCODE__ = { serverUrl: "http://localhost" }
    expect(isVsCode()).toBe(true)
  })

  test("leaves normal web views unchanged", () => {
    expect(isVsCode()).toBe(false)
  })
})
