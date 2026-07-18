import { expect, test } from "bun:test"
import { sessionEpilogue } from "../../src/util/presentation"

test("formats session continuation summary", () => {
  const epilogue = sessionEpilogue({ title: "A session", sessionID: "ses_123" })
  expect(epilogue).toContain("/__/ \\______\\")
  expect(epilogue).toContain("A X O N")
  expect(epilogue).not.toContain("▄▀▀▄")
  expect(epilogue).toContain("A session")
  expect(epilogue).toContain("axon -s ses_123")
})
