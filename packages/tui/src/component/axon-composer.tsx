import { type JSX } from "solid-js"
import type { BrandDensity } from "../util/brand-layout"

export function AxonComposer(props: {
  density: BrandDensity
  focused?: boolean
  children: JSX.Element
}) {
  return (
    <box
      width="100%"
      flexDirection="column"
      backgroundColor="transparent"
      paddingLeft={0}
      paddingRight={0}
      paddingTop={0}
      paddingBottom={0}
    >
      {props.children}
    </box>
  )
}
