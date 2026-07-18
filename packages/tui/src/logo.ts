export const axonMark = String.raw`
        /\
       /  \
   /\ /    \
  /  X      \
 /__/ \______\
`
  .trimEnd()
  .split("\n")
  .slice(1)

export const axonMarkWidth = Math.max(...axonMark.map((line) => line.length))

export const axonWordmark = "A X O N"
export const axonCompact = "AXON"

export const axonDisplayA = String.raw`
    _
   / \
  / _ \
 / ___ \
/_/   \_\
`
  .trimEnd()
  .split("\n")
  .slice(1)

export const axonDisplayAWidth = Math.max(...axonDisplayA.map((line) => line.length))

export const axonDisplayText = String.raw`
__  __   ___   _   _
\ \/ /  / _ \ | \ | |
 \  /  | | | ||  \| |
 /  \  | |_| || |\  |
/_/\_\  \___/ |_| \_|
`
  .trimEnd()
  .split("\n")
  .slice(1)

export const logo = {
  left: axonMark,
  right: axonMark.map(() => ""),
}

export const go = {
  left: ["AX"],
  right: ["ON"],
}

export const marks = ""
