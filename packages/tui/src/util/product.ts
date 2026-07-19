declare const AXON_VERSION: string

export namespace Product {
  export const info = {
    name: "Axon",
    author: "WANGHUI",
    authorSignature: "author: WANGHUI",
    packageName: "@wanghuimvp/axon",
    version: typeof AXON_VERSION === "string" ? AXON_VERSION : "dev",
  } as const
}
