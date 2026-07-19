import { join } from "node:path"

const child = Bun.spawn(
  [
    process.execPath,
    "run",
    "build",
    "--",
    "--base=./",
    "--outDir=../../sdks/vscode/webview",
    "--sourcemap=false",
    "--emptyOutDir",
  ],
  {
    cwd: join(import.meta.dir, "../../../packages/app"),
    env: { ...Bun.env, AXON_CHANNEL: "prod" },
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  },
)

process.exit(await child.exited)
