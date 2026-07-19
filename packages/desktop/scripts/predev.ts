import { $ } from "bun"

await $`bun ./scripts/copy-icons.ts ${process.env.AXON_CHANNEL ?? "dev"}`

await $`cd ../axon && bun script/build-node.ts`
