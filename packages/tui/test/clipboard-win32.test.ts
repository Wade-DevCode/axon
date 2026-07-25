import { expect, test } from "bun:test"
import { inflateSync } from "node:zlib"
import { decodeDib, encodePng } from "../src/clipboard-win32"

test("decodes bottom-up Windows DIB pixels as top-down RGBA", () => {
  const input = Buffer.alloc(40 + 2 * 2 * 4)
  input.writeUInt32LE(40, 0)
  input.writeInt32LE(2, 4)
  input.writeInt32LE(2, 8)
  input.writeUInt16LE(1, 12)
  input.writeUInt16LE(32, 14)
  input.set([255, 0, 0, 255, 255, 255, 255, 255, 0, 0, 255, 255, 0, 255, 0, 255], 40)

  expect(decodeDib(input)).toEqual({
    width: 2,
    height: 2,
    pixels: new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]),
  })
})

test("normalizes missing 32-bit DIB alpha", () => {
  const input = Buffer.alloc(44)
  input.writeUInt32LE(40, 0)
  input.writeInt32LE(1, 4)
  input.writeInt32LE(-1, 8)
  input.writeUInt16LE(1, 12)
  input.writeUInt16LE(32, 14)
  input.set([30, 20, 10, 0], 40)

  expect(decodeDib(input)?.pixels).toEqual(new Uint8Array([10, 20, 30, 255]))
})

test("encodes RGBA pixels as a PNG with matching dimensions", () => {
  const png = encodePng({
    width: 2,
    height: 1,
    pixels: new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]),
  })

  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  expect(png.subarray(12, 16).toString()).toBe("IHDR")
  expect(png.readUInt32BE(16)).toBe(2)
  expect(png.readUInt32BE(20)).toBe(1)
  const compressed = png.subarray(41, 41 + png.readUInt32BE(33))
  expect(inflateSync(compressed)).toEqual(Buffer.from([0, 255, 0, 0, 255, 0, 255, 0, 255]))
})
