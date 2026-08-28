import { LayerNode } from "@axon-ai/core/effect/layer-node"
import fs from "fs/promises"
import path from "path"
import { Context, Effect, Layer } from "effect"
import { Global } from "@axon-ai/core/global"
import { serviceUse } from "@axon-ai/core/effect/service-use"
import { InstanceState } from "@/effect/instance-state"

type State = Record<string, string | undefined>

export interface Interface {
  readonly get: (key: string) => Effect.Effect<string | undefined>
  readonly all: () => Effect.Effect<State>
  readonly set: (key: string, value: string) => Effect.Effect<void>
  readonly remove: (key: string) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@axon/Env") {}

export const use = serviceUse(Service)

export function parseDotEnv(input: string) {
  return Object.fromEntries(
    input.split(/\r?\n/).flatMap((line) => {
      const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line)
      if (!match) return []
      return [[match[1], parseDotEnvValue(match[2])]]
    }),
  )
}

export function applyDotEnv(target: Record<string, string | undefined>, input: string) {
  for (const [key, value] of Object.entries(parseDotEnv(input))) {
    if (target[key] === undefined) target[key] = value
  }
  return target
}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const content = yield* Effect.promise(() =>
      fs
        .readFile(path.join(process.env.AXON_CONFIG_DIR ?? path.join(Global.Path.home, ".axon"), ".env"), "utf8")
        .catch(() => undefined),
    )
    const dotenv = content === undefined ? {} : parseDotEnv(content)

    const state = yield* InstanceState.make<State>(
      Effect.fn("Env.state")(() => Effect.succeed({ ...dotenv, ...process.env })),
    )

    const get = Effect.fn("Env.get")((key: string) => InstanceState.use(state, (env) => env[key]))
    const all = Effect.fn("Env.all")(() => InstanceState.get(state))
    const set = Effect.fn("Env.set")(function* (key: string, value: string) {
      const env = yield* InstanceState.get(state)
      env[key] = value
    })
    const remove = Effect.fn("Env.remove")(function* (key: string) {
      const env = yield* InstanceState.get(state)
      delete env[key]
    })

    return Service.of({ get, all, set, remove })
  }),
)

export const defaultLayer = layer

export const node = LayerNode.make(layer, [])

function parseDotEnvValue(value: string) {
  if (value.startsWith('"') && value.endsWith('"'))
    return value.slice(1, -1).replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\"/g, '"')
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1)
  return value.replace(/\s+#.*$/, "").trim()
}

export * as Env from "."
