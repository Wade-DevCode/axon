# @axon-ai/sdk-next

Effect-native scoped Axon host for in-process applications. This transitional package will replace the existing generated `@axon-ai/sdk` after its consumers migrate.

The SDK executes Server's assembled HTTP router in memory. It opens no listener and performs no network I/O, while preserving the same routing, middleware, handlers, codecs, and errors as the network client.

```ts
import { Axon } from "@axon-ai/sdk-next"

const axon = yield * Axon.create()
const session = yield * axon.sessions.get({ sessionID })
```

It also exposes local-only `tools.register(...)`. Closing the owning Effect Scope releases router resources, location services, fibers, and scoped tool registrations.

The same constructor is available as a service Layer:

```ts
const program = Effect.gen(function* () {
  const axon = yield* Axon.Service
  return yield* axon.sessions.get({ sessionID })
})

yield * program.pipe(Effect.provide(Axon.layer))
```

`Axon.layer` adapts `Axon.create()` for dependency injection; it does not define another host implementation.
