import { beforeEach, describe, expect, test } from "bun:test"
import { inheritCspNonce } from "@axon-ai/ui/theme/csp-nonce"

beforeEach(() => {
  document.head.innerHTML = ""
  document.body.innerHTML = ""
  localStorage.clear()
  Object.defineProperty(window, "matchMedia", {
    value: () =>
      ({
        matches: false,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
    configurable: true,
  })
})

describe("webview theme styles", () => {
  test("copies the VS Code CSP nonce to runtime theme styles", () => {
    const script = document.createElement("script")
    script.setAttribute("nonce", "webview-nonce")
    document.head.appendChild(script)
    const style = inheritCspNonce(document.createElement("style"))

    expect(style.getAttribute("nonce")).toBe("webview-nonce")
  })
})
