import { expect, test } from "bun:test"
import { applyDotEnv, parseDotEnv } from "../../src/env/index"

test("parses dotenv assignments and common quoting forms", () => {
  expect(
    parseDotEnv([
      "# comment",
      "export PLAIN=value # inline comment",
      'DOUBLE="value with spaces and # hash"',
      "SINGLE='literal value'",
      "MULTILINE=\"first\\nsecond\"",
      "EMPTY=",
      "invalid line",
    ].join("\n")),
  ).toEqual({
    PLAIN: "value",
    DOUBLE: "value with spaces and # hash",
    SINGLE: "literal value",
    MULTILINE: "first\nsecond",
    EMPTY: "",
  })
})

test("does not override variables already present in the process environment", () => {
  const target: Record<string, string | undefined> = { EXISTING: "system-value" }

  applyDotEnv(target, "EXISTING=file-value\nFROM_FILE=loaded")

  expect(target).toEqual({ EXISTING: "system-value", FROM_FILE: "loaded" })
})
