import { describe, expect, test } from "bun:test"
import type { AssistantMessage } from "@axon-ai/sdk/v2"
import { sessionUsage } from "../../src/util/session-usage"

const provider = {
  id: "openai",
  models: {
    "gpt-test": {
      limit: {
        context: 100_000,
      },
    },
  },
}

describe("sessionUsage", () => {
  test("uses the latest completed assistant token totals", () => {
    const message = {
      role: "assistant",
      providerID: "openai",
      modelID: "gpt-test",
      tokens: {
        input: 20_000,
        output: 2_000,
        reasoning: 3_000,
        cache: {
          read: 4_000,
          write: 1_000,
        },
      },
    } as AssistantMessage

    expect(sessionUsage({ messages: [message], providers: [provider] })).toEqual({
      tokens: 30_000,
      context: 100_000,
      percentLeft: 70,
    })
  })

  test("reports an unused fallback model as fully available", () => {
    expect({
      ...sessionUsage({
        messages: [],
        providers: [provider],
        fallback: {
          providerID: "openai",
          modelID: "gpt-test",
        },
      }),
    }).toEqual({
      tokens: 0,
      context: 100_000,
      percentLeft: 100,
    })
  })
})
