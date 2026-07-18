import { axonMark, axonMarkWidth, axonWordmark } from "../logo"

const reset = "\x1b[0m"
const bold = "\x1b[1m"
const dim = "\x1b[90m"

function wordmark(pad = "") {
  const center = " ".repeat(Math.max(0, Math.floor((axonMarkWidth - axonWordmark.length) / 2)))
  return [...axonMark.map((line) => `${pad}${dim}${line}${reset}`), `${pad}${center}${bold}${axonWordmark}${reset}`]
}

export function sessionEpilogue(input: { title: string; sessionID?: string }) {
  const weak = (text: string) => `${dim}${text.padEnd(10, " ")}${reset}`
  return [
    ...wordmark("  "),
    "",
    `  ${weak("Session")}${bold}${input.title}${reset}`,
    `  ${weak("Continue")}${bold}axon -s ${input.sessionID}${reset}`,
    "",
  ].join("\n")
}
