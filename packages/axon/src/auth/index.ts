import { LayerNode } from "@axon-ai/core/effect/layer-node"
import path from "path"
import { Effect, Layer, Record, Result, Schema, Context } from "effect"
import { NonNegativeInt } from "@axon-ai/core/schema"
import { Global } from "@axon-ai/core/global"
import { FSUtil } from "@axon-ai/core/fs-util"

export const OAUTH_DUMMY_KEY = "axon-oauth-dummy-key"

const file = path.join(Global.Path.data, "auth.json")

const fail = (message: string) => (cause: unknown) => new AuthError({ message, cause })

export class Oauth extends Schema.Class<Oauth>("OAuth")({
  type: Schema.Literal("oauth"),
  refresh: Schema.String,
  access: Schema.String,
  expires: NonNegativeInt,
  accountId: Schema.optional(Schema.String),
  enterpriseUrl: Schema.optional(Schema.String),
}) {}

export class Api extends Schema.Class<Api>("ApiAuth")({
  type: Schema.Literal("api"),
  key: Schema.String,
  metadata: Schema.optional(Schema.Record(Schema.String, Schema.String)),
}) {}

export class WellKnown extends Schema.Class<WellKnown>("WellKnownAuth")({
  type: Schema.Literal("wellknown"),
  key: Schema.String,
  token: Schema.String,
}) {}

export const Info = Schema.Union([Oauth, Api, WellKnown]).annotate({ discriminator: "type", identifier: "Auth" })
export type Info = Schema.Schema.Type<typeof Info>

export class Summary extends Schema.Class<Summary>("AuthSummary")({
  type: Schema.Literals(["oauth", "api", "wellknown"]),
  email: Schema.optional(Schema.String),
  name: Schema.optional(Schema.String),
  plan: Schema.optional(Schema.String),
  expires: Schema.optional(NonNegativeInt),
}) {}

export const Summaries = Schema.Record(Schema.String, Summary)
export type Summaries = Schema.Schema.Type<typeof Summaries>

export function summarize(info: Info): Summary {
  if (info.type !== "oauth") return new Summary({ type: info.type })

  const claims = parseJwtClaims(info.access)
  const auth = recordClaim(claims?.["https://api.openai.com/auth"])
  const profile = recordClaim(claims?.["https://api.openai.com/profile"])
  return new Summary({
    type: info.type,
    email: stringClaim(claims?.email, profile?.email, auth?.email),
    name: stringClaim(claims?.name, profile?.name, auth?.name),
    plan: stringClaim(claims?.chatgpt_plan_type, auth?.chatgpt_plan_type),
    expires: info.expires,
  })
}

function parseJwtClaims(token: string) {
  const parts = token.split(".")
  if (parts.length !== 3) return
  try {
    return recordClaim(JSON.parse(Buffer.from(parts[1], "base64url").toString()))
  } catch {
    return
  }
}

function recordClaim(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return
  return value as Record<string, unknown>
}

function stringClaim(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && value.length > 0)
}

export class AuthError extends Schema.TaggedErrorClass<AuthError>()("AuthError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Defect()),
}) {}

export interface Interface {
  readonly get: (providerID: string) => Effect.Effect<Info | undefined, AuthError>
  readonly all: () => Effect.Effect<Record<string, Info>, AuthError>
  readonly summaries: () => Effect.Effect<Summaries, AuthError>
  readonly set: (key: string, info: Info) => Effect.Effect<void, AuthError>
  readonly remove: (key: string) => Effect.Effect<void, AuthError>
}

export class Service extends Context.Service<Service, Interface>()("@axon/Auth") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const fsys = yield* FSUtil.Service
    const decode = Schema.decodeUnknownOption(Info)

    const all = Effect.fn("Auth.all")(function* () {
      if (process.env.AXON_AUTH_CONTENT) {
        try {
          return JSON.parse(process.env.AXON_AUTH_CONTENT)
        } catch (err) {}
      }

      const data = (yield* fsys.readJson(file).pipe(Effect.orElseSucceed(() => ({})))) as Record<string, unknown>
      return Record.filterMap(data, (value) => Result.fromOption(decode(value), () => undefined))
    })

    const get = Effect.fn("Auth.get")(function* (providerID: string) {
      return (yield* all())[providerID]
    })

    const summaries = Effect.fn("Auth.summaries")(function* () {
      return Record.map(yield* all(), summarize)
    })

    const set = Effect.fn("Auth.set")(function* (key: string, info: Info) {
      const norm = key.replace(/\/+$/, "")
      const data = yield* all()
      if (norm !== key) delete data[key]
      delete data[norm + "/"]
      yield* fsys
        .writeJson(file, { ...data, [norm]: info }, 0o600)
        .pipe(Effect.mapError(fail("Failed to write auth data")))
    })

    const remove = Effect.fn("Auth.remove")(function* (key: string) {
      const norm = key.replace(/\/+$/, "")
      const data = yield* all()
      delete data[key]
      delete data[norm]
      yield* fsys.writeJson(file, data, 0o600).pipe(Effect.mapError(fail("Failed to write auth data")))
    })

    return Service.of({ get, all, summaries, set, remove })
  }),
)

export const defaultLayer = layer.pipe(Layer.provide(FSUtil.defaultLayer))

export const node = LayerNode.make(layer, [FSUtil.node])

export * as Auth from "."
