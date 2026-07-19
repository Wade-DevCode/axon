import { type ComponentProps } from "solid-js"

export const Mark = (props: { class?: string }) => {
  return (
    <svg
      data-component="logo-mark"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 38 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="0"
        y="17"
        fill="var(--icon-strong-base)"
        font-family="Cascadia Code, Consolas, monospace"
        font-size="18"
        font-weight="700"
        letter-spacing="0"
      >
        AX
      </text>
    </svg>
  )
}

export const Splash = (props: Pick<ComponentProps<"svg">, "ref" | "class">) => {
  return (
    <svg
      ref={props.ref}
      data-component="logo-splash"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 92 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="0"
        y="52"
        fill="var(--icon-strong-base)"
        font-family="Cascadia Code, Consolas, monospace"
        font-size="56"
        font-weight="700"
        letter-spacing="0"
      >
        AX
      </text>
    </svg>
  )
}

export const Logo = (props: { class?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 142 64"
      fill="none"
      classList={{ [props.class ?? ""]: !!props.class }}
    >
      <text
        x="0"
        y="52"
        font-family="Cascadia Code, Consolas, monospace"
        font-size="56"
        font-weight="700"
        letter-spacing="0"
      >
        <tspan fill="var(--icon-base)">AX</tspan>
        <tspan fill="var(--icon-strong-base)">ON</tspan>
      </text>
    </svg>
  )
}
