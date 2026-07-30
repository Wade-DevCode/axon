import { describe, expect, test } from "bun:test"
import {
  AxonServerProtocolError,
  requireCompatibleServerHealth,
  SUPPORTED_APP_SERVER_PROTOCOL,
} from "./server-protocol"

describe("app-server protocol", () => {
  test("accepts the supported protocol and capabilities", () => {
    expect(
      requireCompatibleServerHealth({
        healthy: true,
        version: "1.18.0",
        runtimeVersion: "1.18.0",
        protocolVersion: SUPPORTED_APP_SERVER_PROTOCOL,
        capabilities: ["sessions", "diffs", "permissions"],
      }),
    ).toEqual({
      healthy: true,
      runtimeVersion: "1.18.0",
      protocolVersion: SUPPORTED_APP_SERVER_PROTOCOL,
      capabilities: ["sessions", "diffs", "permissions"],
    })
  })

  test("rejects a legacy server without a protocol handshake", () => {
    expect(() => requireCompatibleServerHealth({ healthy: true, version: "1.17.10" })).toThrow(AxonServerProtocolError)
    expect(() => requireCompatibleServerHealth({ healthy: true, version: "1.17.10" })).toThrow(
      "uses app-server protocol missing",
    )
  })

  test("rejects an unsupported protocol", () => {
    expect(() =>
      requireCompatibleServerHealth({
        healthy: true,
        version: "2.0.0",
        runtimeVersion: "2.0.0",
        protocolVersion: SUPPORTED_APP_SERVER_PROTOCOL + 1,
        capabilities: [],
      }),
    ).toThrow(`Desktop supports protocol ${SUPPORTED_APP_SERVER_PROTOCOL}`)
  })
})
