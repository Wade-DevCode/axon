import { sentryVitePlugin } from "@sentry/vite-plugin"
import type { GetManualChunk } from "rollup"
import { defineConfig } from "vite"
import desktopPlugin from "./vite"

const sentry =
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
    ? sentryVitePlugin({
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        telemetry: false,
        release: {
          name: process.env.SENTRY_RELEASE ?? process.env.VITE_SENTRY_RELEASE,
        },
        sourcemaps: {
          assets: "./dist/**",
          filesToDeleteAfterUpload: "./dist/**/*.map",
        },
      })
    : false

export default defineConfig({
  plugins: [desktopPlugin, sentry] as any,
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    port: 3000,
  },
  build: {
    target: "esnext",
    sourcemap: true,
    rollupOptions:
      process.env.AXON_VSCODE === "true"
        ? {
            output: {
              manualChunks: createShikiChunks(),
              experimentalMinChunkSize: 20_000,
            },
          }
        : undefined,
  },
  worker:
    process.env.AXON_VSCODE === "true"
      ? {
          rollupOptions: {
            output: {
              manualChunks: createShikiChunks(),
              experimentalMinChunkSize: 20_000,
            },
          },
        }
      : undefined,
})

function createShikiChunks(): GetManualChunk {
  const depths = new Map<string, number>()

  return (id, meta) => {
    const module = shikiModule(id)
    if (!module) return

    const bucket = /^[a-m]/.test(module.name) ? "a-m" : "rest"
    if (module.kind === "themes") return `shiki-themes-${bucket}`

    const depth = (current: string): number => {
      const cached = depths.get(current)
      if (cached !== undefined) return cached

      const dependencies =
        meta.getModuleInfo(current)?.importedIds.filter((dependency) => shikiModule(dependency)?.kind === "langs") ?? []
      const value = Math.max(0, ...dependencies.map((dependency) => depth(dependency) + 1))
      depths.set(current, value)
      return value
    }

    // Composite grammars import their base grammars. Keeping dependency depths
    // separate lets us bundle aggressively without creating circular chunks.
    return `shiki-langs-${depth(id)}-${bucket}`
  }
}

function shikiModule(id: string) {
  const path = id.replaceAll("\\", "/")
  const module =
    path.match(/\/@shikijs\/(langs|themes)\/dist\/([^/]+)\.mjs$/) ??
    path.match(/\/shiki\/dist\/(langs|themes)\/([^/]+)\.mjs$/)
  if (!module?.[1] || !module[2]) return
  return { kind: module[1], name: module[2] }
}
