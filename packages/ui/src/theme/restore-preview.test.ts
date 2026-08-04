import { describe, expect, test } from "bun:test"
import { restorePreviewTheme } from "./restore-preview"

describe("restorePreviewTheme", () => {
  test("restores a cached theme before the next selection is committed", () => {
    const applied: string[] = []

    void restorePreviewTheme({
      themeId: "old",
      mode: "dark",
      theme: "old-css",
      load: () => Promise.resolve(undefined),
      current: () => ({ themeId: "old", mode: "dark", previewing: false }),
      apply: (theme) => applied.push(theme),
    })
    applied.push("new-css")

    expect(applied).toEqual(["old-css", "new-css"])
  })

  test("does not restore a delayed theme after the committed selection changes", async () => {
    const applied: string[] = []
    const state = { themeId: "old", mode: "dark" as const, previewing: false }
    const pending = Promise.withResolvers<string | undefined>()

    const restored = restorePreviewTheme({
      themeId: "old",
      mode: "dark",
      theme: undefined,
      load: () => pending.promise,
      current: () => state,
      apply: (theme) => applied.push(theme),
    })
    state.themeId = "new"
    pending.resolve("old-css")
    await restored

    expect(applied).toEqual([])
  })
})
