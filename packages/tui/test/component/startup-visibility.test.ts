import { expect, jest, test } from "bun:test"
import { createRoot, createSignal } from "solid-js"
import { createStartupVisibility } from "../../src/component/startup-visibility"

test("successful startup reactively hides after the 800 ms hold and cleans its timer", () => {
  jest.useFakeTimers()
  jest.setSystemTime(0)
  const [done, setDone] = createSignal(false)
  const [minimum] = createSignal(800)
  let dispose!: () => void
  let visible!: () => boolean

  createRoot((cleanup) => {
    dispose = cleanup
    visible = createStartupVisibility({ done, minimum })
  })

  setDone(true)
  expect(visible()).toBe(true)
  expect(jest.getTimerCount()).toBe(1)
  jest.advanceTimersByTime(799)
  expect(visible()).toBe(true)
  jest.advanceTimersByTime(1)
  expect(visible()).toBe(false)

  dispose()
  expect(jest.getTimerCount()).toBe(0)
  jest.useRealTimers()
})

test("zero-delay startup hides immediately without scheduling a timer", () => {
  jest.useFakeTimers()
  const [done, setDone] = createSignal(false)
  const [minimum] = createSignal(0)
  let dispose!: () => void
  let visible!: () => boolean

  createRoot((cleanup) => {
    dispose = cleanup
    visible = createStartupVisibility({ done, minimum })
  })

  setDone(true)
  expect(visible()).toBe(false)
  expect(jest.getTimerCount()).toBe(0)
  dispose()
  jest.useRealTimers()
})

test("resizing below artwork height cancels the active hold", () => {
  jest.useFakeTimers()
  jest.setSystemTime(0)
  const [done, setDone] = createSignal(false)
  const [minimum, setMinimum] = createSignal(800)
  let dispose!: () => void
  let visible!: () => boolean

  createRoot((cleanup) => {
    dispose = cleanup
    visible = createStartupVisibility({ done, minimum })
  })

  setDone(true)
  expect(visible()).toBe(true)
  setMinimum(0)
  expect(visible()).toBe(false)
  expect(jest.getTimerCount()).toBe(0)
  dispose()
  jest.useRealTimers()
})
