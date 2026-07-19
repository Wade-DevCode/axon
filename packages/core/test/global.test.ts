import { describe, expect, test } from "bun:test"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { Global } from "@axon-ai/core/global"

describe("global paths", () => {
  test("config path uses the Axon home directory", () => {
    expect(Global.Path.config).toBe(path.join(os.homedir(), ".axon"))
    expect(Global.make().config).toBe(Global.Path.config)
  })

  test("tmp path is under the system temp directory", () => {
    expect(Global.Path.tmp).toBe(path.join(os.tmpdir(), "axon"))
    expect(Global.make().tmp).toBe(Global.Path.tmp)
  })

  test("tmp path is created on module load", async () => {
    expect((await fs.stat(Global.Path.tmp)).isDirectory()).toBe(true)
  })
})
