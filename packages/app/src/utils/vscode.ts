export const isVsCode = () =>
  typeof window === "object" &&
  !!(window as typeof window & { __AXON_VSCODE__?: unknown }).__AXON_VSCODE__
