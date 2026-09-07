import { expect, test } from "bun:test"
import { createTerminalTitleController, destroyRenderer } from "../../src/util/renderer"

test("uses the same Braille spinner frames in the terminal title", async () => {
  const calls: string[] = []
  const controller = createTerminalTitleController({
    setTerminalTitle(title) {
      calls.push(title)
    },
  })

  try {
    controller.set("Axon | Dream11", true)
    expect(calls[0]).toBe("⠋ Axon | Dream11")
    await Bun.sleep(120)
    expect(calls).toContain("⠙ Axon | Dream11")

    controller.set("Axon | Dream11", false)
    expect(calls.at(-1)).toBe("Axon | Dream11")
    const stopped = calls.length
    await Bun.sleep(120)
    expect(calls).toHaveLength(stopped)
  } finally {
    controller.dispose()
  }
})

test("clears the terminal title before destroying the renderer", () => {
  const calls: string[] = []
  destroyRenderer({
    isDestroyed: false,
    setTerminalTitle(title) {
      calls.push(`title:${title}`)
    },
    destroy() {
      calls.push("destroy")
    },
  })
  expect(calls).toEqual(["title:", "destroy"])
})

test("still clears the title after renderer destruction", () => {
  const calls: string[] = []
  destroyRenderer({
    isDestroyed: true,
    setTerminalTitle(title) {
      calls.push(`title:${title}`)
    },
    destroy() {
      calls.push("destroy")
    },
  })
  expect(calls).toEqual(["title:"])
})
