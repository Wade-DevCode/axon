import { createEffect, createMemo, createSignal, onCleanup, type Accessor } from "solid-js"

export function createStartupVisibility(input: { done: Accessor<boolean>; minimum: Accessor<number> }) {
  const started = Date.now()
  const [minimumElapsed, setMinimumElapsed] = createSignal(input.minimum() === 0)
  let timer: ReturnType<typeof setTimeout> | undefined

  createEffect(() => {
    const remaining = input.minimum() - (Date.now() - started)
    if (timer) {
      clearTimeout(timer)
      timer = undefined
    }
    if (remaining <= 0) {
      setMinimumElapsed(true)
      return
    }
    setMinimumElapsed(false)
    timer = setTimeout(() => {
      timer = undefined
      setMinimumElapsed(true)
    }, remaining).unref()
  })

  onCleanup(() => {
    if (timer) clearTimeout(timer)
  })

  return createMemo(() => !input.done() || !minimumElapsed())
}
