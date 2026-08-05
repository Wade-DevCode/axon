export function inheritCspNonce(element: HTMLStyleElement) {
  const source = document.querySelector<HTMLScriptElement>("script[nonce]")
  const nonce = source?.nonce || source?.getAttribute("nonce")
  if (nonce) element.setAttribute("nonce", nonce)
  return element
}
