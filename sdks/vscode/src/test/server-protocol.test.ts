import { equal, throws } from "node:assert/strict"
import {
  AxonServerProtocolError,
  requireCompatibleServerHealth,
  SUPPORTED_APP_SERVER_PROTOCOL,
} from "../server-protocol"

suite("Axon app-server protocol", () => {
  test("accepts the supported protocol", () => {
    const health = requireCompatibleServerHealth({
      healthy: true,
      version: "1.18.0",
      runtimeVersion: "1.18.0",
      protocolVersion: SUPPORTED_APP_SERVER_PROTOCOL,
      capabilities: ["sessions", "diffs", "permissions"],
    })

    equal(health.runtimeVersion, "1.18.0")
    equal(health.protocolVersion, SUPPORTED_APP_SERVER_PROTOCOL)
    equal(health.capabilities.includes("sessions"), true)
  })

  test("rejects a legacy server without a protocol handshake", () => {
    throws(
      () => requireCompatibleServerHealth({ healthy: true, version: "1.17.10" }),
      (error) => error instanceof AxonServerProtocolError && /protocol missing/.test(error.message),
    )
  })

  test("rejects an unsupported protocol", () => {
    throws(
      () =>
        requireCompatibleServerHealth({
          healthy: true,
          version: "2.0.0",
          runtimeVersion: "2.0.0",
          protocolVersion: SUPPORTED_APP_SERVER_PROTOCOL + 1,
          capabilities: [],
        }),
      (error) =>
        error instanceof AxonServerProtocolError &&
        error.message.includes(`supports protocol ${SUPPORTED_APP_SERVER_PROTOCOL}`),
    )
  })
})
