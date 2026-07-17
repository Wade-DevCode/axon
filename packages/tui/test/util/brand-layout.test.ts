import { describe, expect, test } from "bun:test"
import { brandDensity, showSplashArtwork } from "../../src/util/brand-layout"

describe("Axon brand layout", () => {
  test("uses the approved responsive ranges", () => {
    expect(brandDensity(79, 24)).toBe("compact")
    expect(brandDensity(80, 24)).toBe("normal")
    expect(brandDensity(119, 24)).toBe("normal")
    expect(brandDensity(120, 24)).toBe("wide")
  })

  test("omits large splash art in short terminals", () => {
    expect(showSplashArtwork(120, 14)).toBe(false)
    expect(showSplashArtwork(120, 24)).toBe(true)
    expect(showSplashArtwork(79, 18)).toBe(false)
    expect(showSplashArtwork(80, 21)).toBe(false)
    expect(showSplashArtwork(80, 22)).toBe(true)
  })
})
