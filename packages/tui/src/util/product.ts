declare const OPENCODE_VERSION: string

export namespace Product {
  export const info = {
    name: "Axon",
    author: "WANGHUI",
    authorSignature: "author: WANGHUI",
    packageName: "@wanghuimvp/axon",
    version: typeof OPENCODE_VERSION === "string" ? OPENCODE_VERSION : "dev",
  } as const
}
