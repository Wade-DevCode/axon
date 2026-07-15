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
  const headers = lines.some((line, index) => diffHeader(line, "---") && diffHeader(lines[index + 1] ?? "", "+++"))
  const hunk = lines.some((line) => /^@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@(?: .*)?$/.test(line))
  if (!headers || !hunk) return {}
  return lines.reduce(
    (counts, line) => ({
      additions: counts.additions + (line.startsWith("+") && !diffHeader(line, "+++") ? 1 : 0),
      deletions: counts.deletions + (line.startsWith("-") && !diffHeader(line, "---") ? 1 : 0),
    }),
    { additions: 0, deletions: 0 },
  )
}

function diffHeader(line: string, marker: "---" | "+++") {
  return line.startsWith(marker) && (line.length === marker.length || /\s/.test(line.charAt(marker.length)))
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
