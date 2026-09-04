import { expect, test } from "bun:test"
import { createTerminalTitleController, destroyRenderer } from "../../src/util/renderer"

test("animates the terminal title while the session is working", async () => {
  const calls: string[] = []
  const controller = createTerminalTitleController({
    setTerminalTitle(title) {
      calls.push(title)
    },
  })

  try {
    controller.set("Axon | Dream11", true)
    expect(calls[0]).toBe("┌•┐ Axon | Dream11")
    await Bun.sleep(140)
    expect(calls.at(-1)).not.toBe(calls[0])
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
