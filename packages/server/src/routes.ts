import { Database } from "@axon-ai/core/database/database"
import { EventV2 } from "@axon-ai/core/event"
import { LocationServiceMap } from "@axon-ai/core/location-layer"
import { FetchHttpClient, HttpRouter, HttpServer } from "effect/unstable/http"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { Layer, Option } from "effect"
import { Api } from "./api"
import { ServerAuth } from "./auth"
import { handlers } from "./handlers"
import { authorizationLayer } from "./middleware/authorization"
import { schemaErrorLayer } from "./middleware/schema-error"
import { PtyEnvironment } from "./pty-environment"

export function createRoutes(password?: string) {
  return makeRoutes(
    password
      ? ServerAuth.Config.layer({ username: "axon", password: Option.some(password) })
      : ServerAuth.Config.defaultLayer,
  )
}

export function createEmbeddedRoutes() {
  return makeRoutes(ServerAuth.Config.layer({ username: "axon", password: Option.none() }))
}

function makeRoutes<AuthError, AuthServices>(auth: Layer.Layer<ServerAuth.Config, AuthError, AuthServices>) {
  return HttpApiBuilder.layer(Api, { openapiPath: "/openapi.json" }).pipe(
    Layer.provide(handlers),
    Layer.provide(PtyEnvironment.defaultLayer),
    Layer.provide(authorizationLayer),
    Layer.provide(schemaErrorLayer),
    Layer.provide(auth),
    Layer.provide(LocationServiceMap.layer),
    Layer.provide(Database.defaultLayer),
    Layer.provide(EventV2.defaultLayer),
    Layer.provide(FetchHttpClient.layer),
  )
}

export const routes = createRoutes()

export const webHandler = () =>
  HttpRouter.toWebHandler(routes.pipe(Layer.provide(HttpServer.layerServices)), { disableLogger: true })
