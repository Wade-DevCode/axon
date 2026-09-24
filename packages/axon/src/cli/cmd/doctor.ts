import os from "os"
import fs from "fs/promises"
import { Cause, Duration, Effect, Exit } from "effect"
import semver from "semver"
import { Global } from "@axon-ai/core/global"
import { InstallationChannel, InstallationVersion } from "@axon-ai/core/installation/version"
import { Ripgrep } from "@axon-ai/core/ripgrep"
import { InstanceRef } from "@/effect/instance-ref"
import { errorMessage } from "@/util/error"
import { effectCmd, fail } from "../effect-cmd"
import { UI } from "../ui"

type Status = "ok" | "warn" | "fail"

interface Check {
  readonly name: string
  readonly status: Status
  readonly detail: string
  readonly hint?: string
}

export const DoctorCommand = effectCmd({
  command: "doctor",
  describe: "check the installation, configuration, providers, and tools",
  builder: (yargs) =>
    yargs.option("json", {
      describe: "print the results as JSON",
      type: "boolean",
    }),
  handler: Effect.fn("Cli.doctor")(function* (args) {
    const { Installation } = yield* Effect.promise(() => import("@/installation"))
    const { Config } = yield* Effect.promise(() => import("@/config/config"))
    const { Provider } = yield* Effect.promise(() => import("@/provider/provider"))
    const installation = yield* Installation.Service
    const config = yield* Config.Service
    const provider = yield* Provider.Service
    const ripgrep = yield* Ripgrep.Service
    const ctx = yield* InstanceRef

    const checks: Check[] = [
      {
        name: "platform",
        status: "ok",
        detail: `${os.type()} ${os.release()} ${os.arch()}`,
      },
    ]

    const method = yield* installation.method()
    const latest = yield* installation.latest(method).pipe(Effect.timeout(Duration.seconds(10)), Effect.exit)
    checks.push(versionCheck(method, latest))

    const loaded = yield* config.get().pipe(Effect.exit)
    checks.push(
      Exit.isSuccess(loaded)
        ? {
            name: "config",
            status: "ok",
            detail: `loaded (${Object.keys(loaded.value.provider ?? {}).length} custom providers, ${Object.keys(loaded.value.mcp ?? {}).length} MCP servers)`,
          }
        : {
            name: "config",
            status: "fail",
            detail: errorMessage(Cause.squash(loaded.cause)),
            hint: "Run `axon debug config` and fix the reported file",
          },
    )

    const providers = yield* provider.list().pipe(Effect.exit)
    const providerIDs = Exit.isSuccess(providers) ? Object.keys(providers.value).sort() : []
    checks.push(
      providerIDs.length > 0
        ? { name: "providers", status: "ok", detail: providerIDs.join(", ") }
        : {
            name: "providers",
            status: "fail",
            detail: Exit.isFailure(providers)
              ? errorMessage(Cause.squash(providers.cause))
              : "no provider is configured",
            hint: "Run `axon providers login` to connect a model provider",
          },
    )

    if (providerIDs.length > 0) {
      const model = yield* provider.defaultModel().pipe(Effect.exit)
      checks.push(
        Exit.isSuccess(model)
          ? { name: "default model", status: "ok", detail: `${model.value.providerID}/${model.value.modelID}` }
          : {
              name: "default model",
              status: "fail",
              detail: errorMessage(Cause.squash(model.cause)),
              hint: "Set `model` in axon.json or pass `--model provider/model`",
            },
      )
    }

    const git = Bun.which("git")
    checks.push(
      git
        ? { name: "git", status: "ok", detail: git }
        : {
            name: "git",
            status: "warn",
            detail: "not found on PATH",
            hint: "Install git to enable snapshots, diffs, and undo",
          },
    )

    const search = yield* ripgrep
      .glob({ cwd: ctx?.directory ?? process.cwd(), pattern: "*", limit: 1 })
      .pipe(Effect.timeout(Duration.seconds(30)), Effect.exit)
    checks.push(
      Exit.isSuccess(search)
        ? { name: "ripgrep", status: "ok", detail: "available" }
        : {
            name: "ripgrep",
            status: "fail",
            detail: errorMessage(Cause.squash(search.cause)),
            hint: "Install ripgrep (rg) and make sure it is on PATH",
          },
    )

    for (const [name, dir] of Object.entries({ data: Global.Path.data, config: Global.Path.config })) {
      const writable = yield* Effect.promise(() =>
        fs.access(dir, fs.constants.W_OK).then(
          () => true,
          () => false,
        ),
      )
      checks.push(
        writable
          ? { name: `${name} dir`, status: "ok", detail: dir }
          : {
              name: `${name} dir`,
              status: "fail",
              detail: `${dir} is not writable`,
              hint: "Fix the directory permissions or set XDG_DATA_HOME",
            },
      )
    }

    const failed = checks.filter((check) => check.status === "fail").length
    const warned = checks.filter((check) => check.status === "warn").length

    if (args.json) {
      process.stdout.write(JSON.stringify({ version: InstallationVersion, checks }, null, 2) + os.EOL)
    }
    if (!args.json) {
      const color = (style: string, text: string) =>
        process.stdout.isTTY ? `${style}${text}${UI.Style.TEXT_NORMAL}` : text
      const width = Math.max(...checks.map((check) => check.name.length))
      const lines = checks.flatMap((check) => [
        `${color(STYLE[check.status], SYMBOL[check.status])} ${check.name.padEnd(width)}  ${check.detail}`,
        ...(check.hint ? [`  ${" ".repeat(width)}  ${color(UI.Style.TEXT_DIM, check.hint)}`] : []),
      ])
      const summary =
        failed > 0
          ? color(UI.Style.TEXT_DANGER_BOLD, `${failed} problem(s) found`)
          : color(UI.Style.TEXT_SUCCESS_BOLD, `All checks passed${warned > 0 ? ` with ${warned} warning(s)` : ""}`)
      process.stdout.write([...lines, "", summary].join(os.EOL) + os.EOL)
    }
    if (failed > 0) return yield* fail("", 1)
  }),
})

const SYMBOL: Record<Status, string> = { ok: "✓", warn: "!", fail: "✗" }

const STYLE: Record<Status, string> = {
  ok: UI.Style.TEXT_SUCCESS_BOLD,
  warn: UI.Style.TEXT_WARNING_BOLD,
  fail: UI.Style.TEXT_DANGER_BOLD,
}

function versionCheck(method: string, latest: Exit.Exit<string, unknown>): Check {
  const detail = `${InstallationVersion} (${InstallationChannel}, installed via ${method})`
  if (InstallationChannel === "local") return { name: "version", status: "ok", detail }
  if (Exit.isFailure(latest)) {
    return { name: "version", status: "warn", detail: `${detail}; could not check for updates` }
  }
  if (semver.valid(latest.value) && semver.valid(InstallationVersion) && semver.gt(latest.value, InstallationVersion)) {
    return {
      name: "version",
      status: "warn",
      detail: `${detail}; ${latest.value} is available`,
      hint: "Run `axon upgrade`",
    }
  }
  return { name: "version", status: "ok", detail: `${detail}; up to date` }
}
