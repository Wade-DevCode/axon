import type { ToolPart } from "@opencode-ai/sdk/v2"

export type ToolRowStatus = "pending" | "running" | "success" | "failed" | "cancelled"

export type ToolRow = {
  id: string
  kind: string
  label: string
  target: string
  status: ToolRowStatus
  duration?: number
  additions?: number
  deletions?: number
  error?: string
}

export type ChangeFile = {
  path: string
  additions?: number
  deletions?: number
}

const kinds: Record<string, string> = {
  read: "Read",
  grep: "Search",
  glob: "Search",
  edit: "Edit",
  write: "Write",
  apply_patch: "Patch",
  bash: "Run",
  task: "Agent",
}

export function toolRow(part: ToolPart, now = Date.now()): ToolRow {
  const counts = mutationCounts(part)
  const duration = toolDuration(part, now)
  const error = part.state.status === "error" ? part.state.error : undefined
  return {
    id: part.id,
    kind: kinds[part.tool] ?? titleCase(part.tool),
    label: part.tool,
    target: toolTarget(part),
    status: toolStatus(part),
    ...(duration === undefined ? {} : { duration }),
    ...(counts === undefined ? {} : counts),
    ...(error === undefined ? {} : { error }),
  }
}

export function changeSummary(parts: readonly ToolPart[]): ChangeFile[] {
  const files = new Map<string, ChangeFile & { proven: boolean }>()
  parts
    .filter((part) => part.state.status === "completed")
    .flatMap(changeFiles)
    .forEach((file) => {
      const current = files.get(file.path)
      if (!current) {
        files.set(file.path, {
          ...file,
          proven: file.additions !== undefined && file.deletions !== undefined,
        })
        return
      }
      if (!current.proven || file.additions === undefined || file.deletions === undefined) {
        files.set(file.path, { path: file.path, proven: false })
        return
      }
      files.set(file.path, {
        path: file.path,
        additions: current.additions! + file.additions,
        deletions: current.deletions! + file.deletions,
        proven: true,
      })
    })
  return [...files.values()]
    .map(({ path, additions, deletions, proven }) => (proven ? { path, additions, deletions } : { path }))
    .toSorted((a, b) => a.path.localeCompare(b.path))
}

function toolStatus(part: ToolPart): ToolRowStatus {
  if (part.state.status === "completed") return "success"
  if (part.state.status !== "error") return part.state.status
  if (/abort|cancel|interrupt/i.test(part.state.error)) return "cancelled"
  return "failed"
}

function toolTarget(part: ToolPart) {
  for (const key of ["filePath", "pattern", "command", "description"] as const) {
    const value = part.state.input[key]
    if (typeof value === "string" && value.length > 0) return value
  }
  if (part.state.status === "running" || part.state.status === "completed") {
    const title = part.state.title
    if (typeof title === "string" && title.length > 0) return title
  }
  return ""
}

function toolDuration(part: ToolPart, now: number) {
  if (part.state.status === "pending") return
  const end = part.state.status === "running" ? now : part.state.time.end
  if (!Number.isFinite(part.state.time.start) || !Number.isFinite(end)) return
  return Math.max(0, end - part.state.time.start)
}

function mutationCounts(part: ToolPart) {
  if (part.state.status !== "completed") return
  if (part.tool === "apply_patch") {
    const files = patchFiles(part.state.metadata.files)
    if (files.length === 0 || files.some((file) => file.additions === undefined || file.deletions === undefined)) return
    return files.reduce(
      (counts, file) => ({
        additions: counts.additions + file.additions!,
        deletions: counts.deletions + file.deletions!,
      }),
      { additions: 0, deletions: 0 },
    )
  }
  if (part.tool !== "edit" && part.tool !== "write") return
  return diffCounts(part.state.metadata.diff)
}

function changeFiles(part: ToolPart): ChangeFile[] {
  if (part.state.status !== "completed") return []
  if (part.tool === "apply_patch") return patchFiles(part.state.metadata.files)
  if (part.tool !== "edit" && part.tool !== "write") return []
  const path = mutationPath(part)
  if (!path) return []
  return [{ path, ...diffCounts(part.state.metadata.diff) }]
}

function mutationPath(part: ToolPart) {
  const input = part.state.input.filePath
  if (typeof input === "string" && input.length > 0) return input
  if (part.state.status !== "completed") return
  const filepath = part.state.metadata.filepath
  if (typeof filepath === "string" && filepath.length > 0) return filepath
  const filediff = record(part.state.metadata.filediff)
  if (typeof filediff?.file === "string" && filediff.file.length > 0) return filediff.file
}

function patchFiles(value: unknown): ChangeFile[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const file = record(item)
    if (!file) return []
    const path =
      typeof file.relativePath === "string" && file.relativePath.length > 0
        ? file.relativePath
        : typeof file.filePath === "string" && file.filePath.length > 0
          ? file.filePath
          : undefined
    if (!path) return []
    return [{ path, ...diffCounts(file.patch) }]
  })
}

function diffCounts(value: unknown) {
  if (typeof value !== "string") return {}
  const lines = value.split(/\r?\n/)
  const firstHunk = lines.findIndex((line) => hunkHeader(line) !== undefined)
  const fileHeader = lines.findIndex(
    (line, index) => index < firstHunk && diffHeader(line, "---") && diffHeader(lines[index + 1] ?? "", "+++"),
  )
  if (firstHunk < 0 || fileHeader < 0 || firstHunk !== fileHeader + 2) return {}
  return hunkCounts(lines, firstHunk)
}

function diffHeader(line: string, marker: "---" | "+++") {
  return line.startsWith(marker) && /\s/.test(line.charAt(marker.length)) && line.slice(marker.length).trim().length > 0
}

function hunkHeader(line: string) {
  const match = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(?: .*)?$/)
  if (!match) return
  const oldLines = Number(match[2] ?? 1)
  const newLines = Number(match[4] ?? 1)
  if (!Number.isSafeInteger(oldLines) || !Number.isSafeInteger(newLines)) return
  return { oldLines, newLines }
}

function hunkCounts(lines: string[], start: number) {
  let index = start
  let additions = 0
  let deletions = 0
  while (index < lines.length) {
    const header = hunkHeader(lines[index])
    if (!header) return {}
    index++
    let oldLines = 0
    let newLines = 0
    let allowsNoNewlineMarker = false
    while (index < lines.length && hunkHeader(lines[index]) === undefined) {
      const line = lines[index]
      if (line === "" && lines.slice(index).every((item) => item === "")) {
        index = lines.length
        break
      }
      if (line === "\\ No newline at end of file" && allowsNoNewlineMarker) {
        allowsNoNewlineMarker = false
        index++
        continue
      }
      if (line.startsWith(" ")) {
        oldLines++
        newLines++
        allowsNoNewlineMarker = true
      } else if (line.startsWith("+")) {
        newLines++
        additions++
        allowsNoNewlineMarker = true
      } else if (line.startsWith("-")) {
        oldLines++
        deletions++
        allowsNoNewlineMarker = true
      } else {
        return {}
      }
      if (oldLines > header.oldLines || newLines > header.newLines) return {}
      index++
    }
    if (oldLines !== header.oldLines || newLines !== header.newLines) return {}
  }
  return { additions, deletions }
}

function record(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return
  return value as Record<string, unknown>
}

function titleCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}
