#!/usr/bin/env bun

import fs from "fs"
import os from "os"
import path from "path"
import semver from "semver"
import pkg from "../package.json"
import { releaseTargetName, releaseTargets } from "./targets"

const dir = path.resolve(import.meta.dir, "..")
const releaseDir = path.join(dir, "release")
const wrapperName = "@wanghuimvp/axon"
const npm = process.platform === "win32" ? "npm.cmd" : "npm"
const scope =
  process.argv.find((arg) => arg.startsWith("--scope="))?.slice("--scope=".length) ??
  process.env.AXON_RELEASE_SCOPE ??
  "all"
const version = (process.env.AXON_VERSION ?? process.env.GITHUB_REF_NAME ?? "").replace(/^v/, "")

if (scope !== "windows" && scope !== "all") throw new Error(`Unsupported release scope: ${scope}`)
if (!semver.valid(version)) throw new Error(`Invalid release version: ${version || "<empty>"}`)

const targets = releaseTargets.filter((target) => scope === "all" || target.os === "win32")
const expected = targets.map((target) => releaseTargetName(pkg.name, target)).sort()
const releaseEnv: Record<string, string | undefined> = {
  ...process.env,
  AXON_CHANNEL: "latest",
  AXON_VERSION: version,
}
delete releaseEnv.AXON_RELEASE

process.chdir(dir)

await run([npm, "whoami"])
await validateExistingWrapper()
await run(["bun", "./script/build.ts", ...(scope === "windows" ? ["--platform=windows"] : [])])
await validateBuild()
if (scope === "all") await packageReleaseAssets()
await run(["bun", "./script/publish.ts"])
await verifyRegistry()
if (scope === "all") {
  await verifyCleanInstall()
  await publishGitHubRelease()
}

console.log(`Released Axon ${version} (${scope})`)

async function validateExistingWrapper() {
  const metadata = await registryPackage(wrapperName)
  if (!metadata) return
  const actual = Object.keys(metadata.optionalDependencies ?? {}).sort()
  if (JSON.stringify(actual) === JSON.stringify(expected)) return
  throw new Error(
    `${wrapperName}@${version} already exists with a different platform set: ${actual.join(", ") || "none"}`,
  )
}

async function validateBuild() {
  const files = Array.from(new Bun.Glob("*/package.json").scanSync({ cwd: path.join(dir, "dist") }))
  const packages = await Promise.all(
    files.map((file) => Bun.file(path.join(dir, "dist", file)).json() as Promise<{ name: string; version: string }>),
  )
  const actual = packages.map((item) => item.name).sort()
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected platform packages. Expected ${expected.join(", ")}; received ${actual.join(", ")}`)
  }
  const mismatched = packages.filter((item) => item.version !== version)
  if (mismatched.length === 0) return
  throw new Error(`Unexpected package versions: ${mismatched.map((item) => `${item.name}@${item.version}`).join(", ")}`)
}

async function packageReleaseAssets() {
  const resolved = path.resolve(releaseDir)
  if (!resolved.startsWith(`${path.resolve(dir)}${path.sep}`)) throw new Error(`Unsafe release directory: ${resolved}`)
  fs.rmSync(resolved, { recursive: true, force: true })
  fs.mkdirSync(resolved, { recursive: true })

  for (const name of expected) {
    const source = path.join(dir, "dist", name)
    if (name.includes("windows")) {
      await run(["zip", "-qr", path.join(resolved, `${name}.zip`), "."], source)
      continue
    }
    await run(["tar", "-czf", path.join(resolved, `${name}.tar.gz`), "-C", source, "."])
  }

  const archives = Array.from(new Bun.Glob("*.{zip,tar.gz}").scanSync({ cwd: resolved })).sort()
  const checksums = await Promise.all(
    archives.map(async (file) => {
      const hasher = new Bun.CryptoHasher("sha256")
      hasher.update(await Bun.file(path.join(resolved, file)).arrayBuffer())
      return `${hasher.digest("hex")}  ${file}`
    }),
  )
  await Bun.write(path.join(resolved, "checksums.txt"), `${checksums.join("\n")}\n`)
}

async function verifyRegistry() {
  const names = [...expected, wrapperName]
  for (const attempt of Array.from({ length: 12 }, (_, index) => index + 1)) {
    const packages = await Promise.all(names.map((name) => registryPackage(name)))
    if (packages.every((item) => item?.version === version)) return
    if (attempt < 12) await Bun.sleep(5_000)
  }
  throw new Error(`npm registry did not expose every ${version} package after 60 seconds`)
}

async function verifyCleanInstall() {
  const prefix = path.join(os.tmpdir(), `axon-install-${crypto.randomUUID()}`)
  await run([npm, "install", "--prefix", prefix, `${wrapperName}@${version}`])
  const process = Bun.spawn([path.join(prefix, "node_modules", ".bin", "axon"), "--version"], {
    cwd: dir,
    env: releaseEnv,
    stdout: "pipe",
    stderr: "inherit",
  })
  const output = await new Response(process.stdout).text()
  const code = await process.exited
  if (code === 0 && output.trim() === version) return
  throw new Error(`Clean install returned ${JSON.stringify(output.trim())} with exit code ${code}`)
}

async function publishGitHubRelease() {
  const repo = process.env.GH_REPO ?? process.env.GITHUB_REPOSITORY
  if (!repo) throw new Error("GH_REPO or GITHUB_REPOSITORY is required for an all-platform release")
  const tag = `v${version}`
  const assets = Array.from(new Bun.Glob("*").scanSync({ cwd: releaseDir })).map((file) => path.join(releaseDir, file))
  const exists = await Bun.spawn(["gh", "release", "view", tag, "--repo", repo], {
    cwd: dir,
    env: releaseEnv,
    stdout: "ignore",
    stderr: "ignore",
  }).exited

  if (exists === 0) {
    await run(["gh", "release", "upload", tag, ...assets, "--clobber", "--repo", repo])
    return
  }

  await run([
    "gh",
    "release",
    "create",
    tag,
    ...assets,
    "--target",
    process.env.GITHUB_SHA ?? "main",
    "--title",
    `Axon ${tag}`,
    "--generate-notes",
    "--repo",
    repo,
  ])
}

async function registryPackage(name: string) {
  const response = await fetch(`https://registry.npmjs.org/${name.replace("/", "%2f")}/${version}`)
  if (response.status === 404) return
  if (!response.ok) throw new Error(`npm registry returned ${response.status} for ${name}@${version}`)
  return (await response.json()) as { version: string; optionalDependencies?: Record<string, string> }
}

async function run(command: string[], cwd = dir) {
  console.log(`$ ${command.join(" ")}`)
  const process = Bun.spawn(command, {
    cwd,
    env: releaseEnv,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  })
  const code = await process.exited
  if (code === 0) return
  throw new Error(`${command[0]} failed with exit code ${code}`)
}
