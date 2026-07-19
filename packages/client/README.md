# @axon-ai/client

Private generation target for clients derived directly from Axon's authoritative Effect `HttpApi`.

## Entrypoints

- `@axon-ai/client`: zero-Effect Promise client using `fetch`.
- `@axon-ai/client/effect`: rich Effect network client using an environment-provided `HttpClient`.

The generated surface starts with the Session group from Server's concrete API. The build compiler reads `@axon-ai/server/api`; the generated Effect runtime imports a client-local projection built from Protocol, with a generation-equivalence test preventing transport drift. Run `bun run generate` after changing the contract and `bun run check:generated` to detect committed-output drift.

The Effect entrypoint uses canonical decoded values such as `Session.ID`, `Location.Ref`, and `Prompt`. These datatypes come from the lightweight `@axon-ai/schema` package and are re-exported so callers depend only on the client surface. Protocol owns endpoint construction and middleware placement; Server supplies the concrete middleware keys used by the build-time API.

The Promise root remains structural and has no Core or Effect runtime dependency. `/effect` depends only on Effect, Schema, and Protocol and is browser-bundle safe. Bundle-boundary tests enforce both import graphs.

Effect consumers construct canonical decoded inputs:

```ts
import { AbsolutePath, Location, Axon, Prompt } from "@axon-ai/client/effect"

const client = yield * Axon.make({ baseUrl: "https://axon.example" })
yield *
  client.sessions.create({
    location: Location.Ref.make({ directory: AbsolutePath.make("/workspace") }),
  })
yield * client.sessions.prompt({ sessionID, prompt: Prompt.make({ text: "Hello" }) })
```
