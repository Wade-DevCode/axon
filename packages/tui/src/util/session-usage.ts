import type { AssistantMessage, Message } from "@axon-ai/sdk/v2"

export function sessionUsage(input: {
  messages: Message[]
  providers: {
    id: string
    models: Record<string, { limit: { context: number } }>
  }[]
  fallback?: {
    providerID: string
    modelID: string
  }
}) {
  const last = input.messages.findLast(
    (item): item is AssistantMessage => item.role === "assistant" && item.tokens.output > 0,
  )
  const fallback = input.fallback
  const model = last
    ? input.providers.find((item) => item.id === last.providerID)?.models[last.modelID]
    : fallback
      ? input.providers.find((item) => item.id === fallback.providerID)?.models[fallback.modelID]
      : undefined
  const tokens = last
    ? last.tokens.input + last.tokens.output + last.tokens.reasoning + last.tokens.cache.read + last.tokens.cache.write
    : 0
  if (!model?.limit.context && tokens === 0) return

  return {
    tokens,
    context: model?.limit.context,
    percentLeft: model?.limit.context ? Math.max(0, 100 - Math.round((tokens / model.limit.context) * 100)) : undefined,
  }
}
