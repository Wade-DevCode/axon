export * from "./client.js"
export * from "./server.js"

import { createAxonClient } from "./client.js"
import { createAxonServer } from "./server.js"
import type { ServerOptions } from "./server.js"

export async function createAxon(options?: ServerOptions) {
  const server = await createAxonServer({
    ...options,
  })

  const client = createAxonClient({
    baseUrl: server.url,
  })

  return {
    client,
    server,
  }
}
