import { dlopen, FFIType, ptr, toArrayBuffer } from "bun:ffi"
import { deflateSync } from "node:zlib"

const CF_BITMAP = 2
const CF_DIB = 8
const CF_UNICODETEXT = 13
const CF_DIBV5 = 17
const GMEM_MOVEABLE = 0x0002
const RETRIES = 5
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const PNG_FORMAT = Buffer.from("PNG\0", "utf16le")
const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let crc = index
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  return crc >>> 0
})

const user32 = () =>
  dlopen("user32.dll", {
    OpenClipboard: { args: ["ptr"], returns: "i32" },
    CloseClipboard: { returns: "i32" },
    EmptyClipboard: { returns: "i32" },
    GetClipboardData: { args: ["u32"], returns: "ptr" },
    SetClipboardData: { args: ["u32", "ptr"], returns: "ptr" },
    IsClipboardFormatAvailable: { args: ["u32"], returns: "i32" },
    RegisterClipboardFormatW: { args: ["ptr"], returns: "u32" },
  })

const kernel32 = () =>
  dlopen("kernel32.dll", {
    GlobalAlloc: { args: ["u32", FFIType.u64_fast], returns: "ptr" },
    GlobalFree: { args: ["ptr"], returns: "ptr" },
    GlobalLock: { args: ["ptr"], returns: "ptr" },
    GlobalUnlock: { args: ["ptr"], returns: "i32" },
    GlobalSize: { args: ["ptr"], returns: FFIType.u64_fast },
  })

let user: ReturnType<typeof user32> | undefined
let kernel: ReturnType<typeof kernel32> | undefined
let pngFormat = 0

type Image = { width: number; height: number; pixels: Uint8Array }

function load() {
  if (process.platform !== "win32") return false
  try {
    user ??= user32()
    kernel ??= kernel32()
    pngFormat ||= user.symbols.RegisterClipboardFormatW(ptr(PNG_FORMAT))
    return true
  } catch {
    return false
  }
}

async function open(attempt = 0): Promise<boolean> {
  if (user!.symbols.OpenClipboard(null) !== 0) return true
  if (attempt >= RETRIES - 1) return false
  await Bun.sleep(attempt + 1)
  return open(attempt + 1)
}

async function readBytes(format: number): Promise<Uint8Array | undefined> {
  if (!(await open())) return undefined
  try {
    const handle = user!.symbols.GetClipboardData(format)
    if (!handle) return undefined

    const size = Number(kernel!.symbols.GlobalSize(handle))
    if (!size) return undefined

    const memory = kernel!.symbols.GlobalLock(handle)
    if (!memory) return undefined

    try {
      return new Uint8Array(toArrayBuffer(memory, 0, size)).slice()
    } finally {
      kernel!.symbols.GlobalUnlock(handle)
    }
  } finally {
    user!.symbols.CloseClipboard()
  }
}

export function hasImage() {
  if (!load()) return false
  return [pngFormat, CF_BITMAP, CF_DIB, CF_DIBV5].some(
    (format) => format !== 0 && user!.symbols.IsClipboardFormatAvailable(format) !== 0,
  )
}

export function hasText() {
  return load() && user!.symbols.IsClipboardFormatAvailable(CF_UNICODETEXT) !== 0
}

export async function readImage(): Promise<Buffer | undefined> {
  if (!load()) return undefined
  if (pngFormat && user!.symbols.IsClipboardFormatAvailable(pngFormat) !== 0) {
    const png = await readBytes(pngFormat)
    if (png?.subarray(0, PNG_SIGNATURE.length).every((byte, index) => byte === PNG_SIGNATURE[index])) {
      return Buffer.from(png)
    }
  }

  const format = user!.symbols.IsClipboardFormatAvailable(CF_DIBV5) !== 0 ? CF_DIBV5 : CF_DIB
  if (user!.symbols.IsClipboardFormatAvailable(format) === 0) return undefined
  const bytes = await readBytes(format)
  if (!bytes) return undefined
  const image = decodeDib(bytes)
  if (image) return encodePng(image)
  return undefined
}

export async function readText(): Promise<string | undefined> {
  if (!hasText()) return undefined
  const bytes = await readBytes(CF_UNICODETEXT)
  if (!bytes) return undefined
  const text = new TextDecoder("utf-16le").decode(bytes)
  const end = text.indexOf("\0")
  return end === -1 ? text : text.slice(0, end)
}

export async function writeText(text: string) {
  if (!load()) return false
  if (!(await open())) return false

  const bytes = Buffer.from(`${text}\0`, "utf16le")
  const handle = kernel!.symbols.GlobalAlloc(GMEM_MOVEABLE, bytes.length)
  if (!handle) {
    user!.symbols.CloseClipboard()
    return false
  }

  const memory = kernel!.symbols.GlobalLock(handle)
  if (!memory) {
    kernel!.symbols.GlobalFree(handle)
    user!.symbols.CloseClipboard()
    return false
  }

  new Uint8Array(toArrayBuffer(memory, 0, bytes.length)).set(bytes)
  kernel!.symbols.GlobalUnlock(handle)

  const transferred =
    user!.symbols.EmptyClipboard() !== 0 && Boolean(user!.symbols.SetClipboardData(CF_UNICODETEXT, handle))
  if (!transferred) kernel!.symbols.GlobalFree(handle)
  user!.symbols.CloseClipboard()
  return transferred
}

export function decodeDib(input: Uint8Array): Image | undefined {
  if (input.byteLength < 40) return undefined

  const view = new DataView(input.buffer, input.byteOffset, input.byteLength)
  const headerSize = view.getUint32(0, true)
  const width = view.getInt32(4, true)
  const storedHeight = view.getInt32(8, true)
  const bits = view.getUint16(14, true)
  const compression = view.getUint32(16, true)
  if (headerSize < 40 || headerSize > input.byteLength) return undefined
  if (width <= 0 || storedHeight === 0) return undefined
  if (bits !== 24 && bits !== 32) return undefined
  if (compression !== 0 && compression !== 3) return undefined

  const height = Math.abs(storedHeight)
  const masks = headerSize === 40 && compression === 3 ? 12 : 0
  const offset = headerSize + masks
  const stride = Math.ceil((width * bits) / 32) * 4
  if (offset + stride * height > input.byteLength) return undefined

  const pixels = new Uint8Array(width * height * 4)
  const topDown = storedHeight < 0
  let hasAlpha = false

  for (let y = 0; y < height; y++) {
    const sourceY = topDown ? y : height - y - 1
    const sourceRow = offset + sourceY * stride
    for (let x = 0; x < width; x++) {
      const source = sourceRow + x * (bits / 8)
      const target = (y * width + x) * 4
      pixels[target] = input[source + 2]!
      pixels[target + 1] = input[source + 1]!
      pixels[target + 2] = input[source]!
      pixels[target + 3] = bits === 32 ? input[source + 3] : 255
      hasAlpha ||= pixels[target + 3] !== 0
    }
  }

  if (bits === 32 && !hasAlpha) {
    for (let offset = 3; offset < pixels.length; offset += 4) pixels[offset] = 255
  }

  return { width, height, pixels }
}

export function encodePng(image: { width: number; height: number; pixels: Uint8Array }) {
  const stride = image.width * 4
  const scanlines = Buffer.allocUnsafe((stride + 1) * image.height)
  for (let y = 0; y < image.height; y++) {
    const row = y * (stride + 1)
    scanlines[row] = 0
    scanlines.set(image.pixels.subarray(y * stride, (y + 1) * stride), row + 1)
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(image.width, 0)
  header.writeUInt32BE(image.height, 4)
  header[8] = 8
  header[9] = 6
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(scanlines)),
    pngChunk("IEND"),
  ])
}

function pngChunk(type: string, data = Buffer.alloc(0)) {
  const name = Buffer.from(type)
  const chunk = Buffer.allocUnsafe(data.length + 12)
  chunk.writeUInt32BE(data.length, 0)
  name.copy(chunk, 4)
  data.copy(chunk, 8)
  chunk.writeUInt32BE(crc32(chunk.subarray(4, data.length + 8)), data.length + 8)
  return chunk
}

function crc32(input: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of input) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff]
  return (crc ^ 0xffffffff) >>> 0
}
