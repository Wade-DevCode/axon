interface ImportMetaEnv {
  readonly AXON_CHANNEL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module "virtual:axon-server" {
  export namespace Server {
    export const listen: typeof import("../../../axon/dist/types/src/node").Server.listen
    export type Listener = import("../../../axon/dist/types/src/node").Server.Listener
  }
  export namespace Config {
    export const get: typeof import("../../../axon/dist/types/src/node").Config.get
    export type Info = import("../../../axon/dist/types/src/node").Config.Info
  }
  export const bootstrap: typeof import("../../../axon/dist/types/src/node").bootstrap
}
