import { expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Flag } from "@axon-ai/core/flag/flag"
import { Effect, Schema } from "effect"

test("embedded client uses the real router and handlers", async () => {
  const directory = await mkdtemp(join(tmpdir(), "axon-embedded-"))
  const database = Flag.AXON_DB
  Flag.AXON_DB = join(directory, "axon.sqlite")
  const { AbsolutePath, Agent, Location, Model, Axon, Prompt, Provider, Session, Tool } = await import("../src")
  const sessionID = Session.ID.make(`ses_embedded_${crypto.randomUUID()}`)
  const model = Model.Ref.make({ id: Model.ID.make("embedded"), providerID: Provider.ID.make("test") })

  try {
    const program = Effect.gen(function* () {
      const axon = yield* Axon.create()
      yield* axon.tools.register({
        embedded_tool: Tool.make({
          description: "Embedded test tool",
          input: Schema.Struct({}),
          output: Schema.Struct({ ok: Schema.Boolean }),
          execute: () => Effect.succeed({ ok: true }),
        }),
      })

      const created = yield* axon.sessions.create({
        id: sessionID,
        agent: Agent.ID.make("build"),
        location: Location.Ref.make({ directory: AbsolutePath.make(directory) }),
      })
      yield* axon.sessions.switchModel({ sessionID, model })
      const selected = yield* axon.sessions.get({ sessionID })
      const page = yield* axon.sessions.list({ directory: AbsolutePath.make(directory) })
      const admitted = yield* axon.sessions.prompt({
        sessionID,
        prompt: Prompt.make({ text: "Do not run" }),
        resume: false,
      })
      const context = yield* axon.sessions.context({ sessionID })
      const missing = yield* Effect.flip(
        axon.sessions.get({ sessionID: Session.ID.make(`ses_missing_${crypto.randomUUID()}`) }),
      )

      expect(created.id).toBe(sessionID)
      expect(selected.model?.id).toBe(model.id)
      expect(selected.model?.providerID).toBe(model.providerID)
      expect(page.data.some((session) => session.id === sessionID)).toBe(true)
      expect(admitted.sessionID).toBe(sessionID)
      expect(context.some((message) => message.type === "model-switched")).toBe(true)
      expect(missing._tag).toBe("SessionNotFoundError")
    })
    await Effect.runPromise(Effect.scoped(program))
  } finally {
    Flag.AXON_DB = database
    await rm(directory, { recursive: true, force: true })
  }
})

test("embedded client is available as a Layer service", async () => {
  const directory = await mkdtemp(join(tmpdir(), "axon-embedded-layer-"))
  const database = Flag.AXON_DB
  Flag.AXON_DB = join(directory, "axon.sqlite")
  const { AbsolutePath, Location, Axon, Session } = await import("../src")
  const sessionID = Session.ID.make(`ses_embedded_${crypto.randomUUID()}`)

  try {
    const created = await Effect.runPromise(
      Effect.gen(function* () {
        const axon = yield* Axon.Service
        return yield* axon.sessions.create({
          id: sessionID,
          location: Location.Ref.make({ directory: AbsolutePath.make(directory) }),
        })
      }).pipe(Effect.provide(Axon.layer), Effect.scoped),
    )

    expect(created.id).toBe(sessionID)
  } finally {
    Flag.AXON_DB = database
    await rm(directory, { recursive: true, force: true })
  }
})
