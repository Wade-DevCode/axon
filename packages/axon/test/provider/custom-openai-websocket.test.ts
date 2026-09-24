import { afterAll, expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { Auth } from "@/auth"
import { Config } from "@/config/config"
import { Env } from "../../src/env"
import { ModelsDev } from "@axon-ai/core/models-dev"
import { Plugin } from "../../src/plugin/index"
import { Provider } from "../../src/provider/provider"
import { RuntimeFlags } from "../../src/effect/runtime-flags"
import { FSUtil } from "@axon-ai/core/fs-util"
import { ModelV2 } from "@axon-ai/core/model"
import { ProviderV2 } from "@axon-ai/core/provider"
import { testEffect } from "../lib/effect"

const messages: unknown[] = []
const server = Bun.serve({
  port: 0,
  fetch(request, instance) {
    if (instance.upgrade(request)) return
    return new Response("http")
  },
  websocket: {
    message(socket, data) {
      messages.push(JSON.parse(data.toString()))
      socket.send(JSON.stringify({ type: "response.done", response: { id: "resp_test" } }))
    },
  },
})

afterAll(() => server.stop(true))

const providerLayer = Provider.layer.pipe(
  Layer.provide(FSUtil.defaultLayer),
  Layer.provide(Env.defaultLayer),
  Layer.provide(Config.defaultLayer),
  Layer.provide(Auth.defaultLayer),
  Layer.provide(Plugin.defaultLayer),
  Layer.provide(ModelsDev.defaultLayer),
  Layer.provide(RuntimeFlags.layer()),
)

const it = testEffect(providerLayer)

it.instance(
  "custom OpenAI provider uses configured Responses WebSocket transport",
  Effect.gen(function* () {
    messages.length = 0
    const provider = yield* Provider.Service
    const model = yield* provider.getModel(ProviderV2.ID.make("custom-openai-ws"), ModelV2.ID.make("test-model"))
    const language = yield* provider.getLanguage(model)
    const fetch = (language as unknown as { config: { fetch: typeof globalThis.fetch } }).config.fetch
    const response = yield* Effect.promise(() =>
      fetch(`http://127.0.0.1:${server.port}/v1/responses`, {
        method: "POST",
        headers: { "x-session-affinity": "session-test" },
        body: JSON.stringify({ stream: true, input: "hello" }),
      }),
    )

    expect(yield* Effect.promise(() => response.text())).toContain('data: {"type":"response.done"')
    expect(messages).toEqual([{ type: "response.create", input: "hello" }])
  }),
  {
    config: {
      provider: {
        "custom-openai-ws": {
          name: "Custom OpenAI WebSocket",
          npm: "@ai-sdk/openai",
          env: [],
          models: {
            "test-model": {
              name: "Test Model",
              modalities: { input: ["text", "image"], output: ["text"] },
            },
          },
          options: {
            apiKey: "test-key",
            baseURL: `http://127.0.0.1:${server.port}/v1`,
            wire_api: "responses",
            supports_websockets: true,
          },
        },
      },
    },
  },
)

for (const [wireApi, expected] of [
  ["chat", "custom-openai-wire.chat"],
  ["responses", "custom-openai-wire.responses"],
] as const) {
  it.instance(
    `custom OpenAI provider honors wire_api ${wireApi}`,
    Effect.gen(function* () {
      const provider = yield* Provider.Service
      const model = yield* provider.getModel(ProviderV2.ID.make("custom-openai-wire"), ModelV2.ID.make("test-model"))
      const language = yield* provider.getLanguage(model)
      expect((language as unknown as { provider: string }).provider).toBe(expected)
    }),
    {
      config: {
        provider: {
          "custom-openai-wire": {
            name: "Custom OpenAI Wire API",
            npm: "@ai-sdk/openai",
            env: [],
            models: {
              "test-model": {
                name: "Test Model",
                modalities: { input: ["text"], output: ["text"] },
              },
            },
            options: {
              apiKey: "test-key",
              baseURL: "http://127.0.0.1:1/v1",
              wire_api: wireApi,
            },
          },
        },
      },
    },
  )
}
