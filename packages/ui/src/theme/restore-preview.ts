export function restorePreviewTheme<T>(input: {
  themeId: string
  mode: "light" | "dark"
  theme: T | undefined
  load: () => Promise<T | undefined>
  current: () => { themeId: string; mode: "light" | "dark"; previewing: boolean }
  apply: (theme: T, themeId: string, mode: "light" | "dark") => void
}) {
  if (input.theme) {
    input.apply(input.theme, input.themeId, input.mode)
    return Promise.resolve()
  }

  return input.load().then((theme) => {
    if (!theme) return
    const current = input.current()
    if (current.themeId !== input.themeId || current.mode !== input.mode || current.previewing) return
    input.apply(theme, input.themeId, input.mode)
  })
}
