export function resolveSystemMode(input: {
  host?: string
  bodyClasses: Iterable<string>
  prefersDark: boolean
}): "light" | "dark" {
  const classes = new Set(input.bodyClasses)

  if (input.host === "vscode") {
    if (classes.has("vscode-light") || classes.has("vscode-high-contrast-light")) return "light"
    if (classes.has("vscode-dark") || classes.has("vscode-high-contrast")) return "dark"
  }

  return input.prefersDark ? "dark" : "light"
}
