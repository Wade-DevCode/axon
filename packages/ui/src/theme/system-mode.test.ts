import { describe, expect, test } from "bun:test"
import { resolveSystemMode } from "./system-mode"

describe("resolveSystemMode", () => {
  test("follows the VS Code dark theme instead of the operating system", () => {
    expect(resolveSystemMode({ host: "vscode", bodyClasses: ["vscode-dark"], prefersDark: false })).toBe("dark")
    expect(resolveSystemMode({ host: "vscode", bodyClasses: ["vscode-high-contrast"], prefersDark: false })).toBe(
      "dark",
    )
  })

  test("follows the VS Code light theme instead of the operating system", () => {
    expect(resolveSystemMode({ host: "vscode", bodyClasses: ["vscode-light"], prefersDark: true })).toBe("light")
    expect(
      resolveSystemMode({ host: "vscode", bodyClasses: ["vscode-high-contrast-light"], prefersDark: true }),
    ).toBe("light")
  })

  test("uses the operating system preference outside VS Code", () => {
    expect(resolveSystemMode({ host: undefined, bodyClasses: ["vscode-light"], prefersDark: true })).toBe("dark")
    expect(resolveSystemMode({ host: undefined, bodyClasses: [], prefersDark: false })).toBe("light")
  })
})
