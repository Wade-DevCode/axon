import { beforeEach, describe, expect, test } from "bun:test"

const src = await Bun.file(new URL("../public/oc-theme-preload.js", import.meta.url)).text()
const html = await Bun.file(new URL("../index.html", import.meta.url)).text()

const run = () => Function(src)()

beforeEach(() => {
  document.head.innerHTML = ""
  document.documentElement.removeAttribute("data-theme")
  document.documentElement.removeAttribute("data-color-scheme")
  document.documentElement.removeAttribute("style")
  localStorage.clear()
  Object.defineProperty(window, "matchMedia", {
    value: () =>
      ({
        matches: false,
      }) as MediaQueryList,
    configurable: true,
  })
})

describe("theme preload", () => {
  test("migrates legacy oc-1 to oc-2 before mount", () => {
    localStorage.setItem("axon-theme-id", "oc-1")
    localStorage.setItem("axon-theme-css-light", "--background-base:#fff;")
    localStorage.setItem("axon-theme-css-dark", "--background-base:#000;")

    run()

    expect(document.documentElement.dataset.theme).toBe("oc-2")
    expect(document.documentElement.dataset.colorScheme).toBe("light")
    expect(document.documentElement.style.backgroundColor).toBe("")
    expect(localStorage.getItem("axon-theme-id")).toBe("oc-2")
    expect(localStorage.getItem("axon-theme-css-light")).toBeNull()
    expect(localStorage.getItem("axon-theme-css-dark")).toBeNull()
    expect(document.getElementById("oc-theme-preload")).toBeNull()
  })

  test("keeps cached css for non-default themes", () => {
    localStorage.setItem("axon-theme-id", "nightowl")
    localStorage.setItem("axon-theme-css-light", "--background-base:#fff;")

    run()

    expect(document.documentElement.dataset.theme).toBe("nightowl")
    expect(document.documentElement.style.backgroundColor).toBe("")
    expect(document.getElementById("oc-theme-preload")?.textContent).toContain("--background-base:#fff;")
  })

  test("uses the active theme background in dark mode", () => {
    localStorage.setItem("axon-theme-id", "cobalt2")
    localStorage.setItem("axon-theme-css-dark", "--v2-background-bg-deep:#041f32;")
    Object.defineProperty(window, "matchMedia", {
      value: () =>
        ({
          matches: true,
        }) as MediaQueryList,
      configurable: true,
    })

    run()

    expect(document.documentElement.dataset.colorScheme).toBe("dark")
    expect(document.documentElement.style.backgroundColor).toBe("")
    expect(document.getElementById("oc-theme-preload")?.textContent).toContain("--v2-background-bg-deep:#041f32;")
  })

  test("lets the document shell follow the active theme background", () => {
    expect(html).toContain("background-color: var(--v2-background-bg-deep, #fafafa)")
    expect(src).not.toContain("document.documentElement.style.backgroundColor")
  })
})
