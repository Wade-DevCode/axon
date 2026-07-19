import { Context } from "effect"
import type { InstanceContext } from "@/project/instance-context"
import type { WorkspaceV2 } from "@axon-ai/core/workspace"

export const InstanceRef = Context.Reference<InstanceContext | undefined>("~axon/InstanceRef", {
  defaultValue: () => undefined,
})

export const WorkspaceRef = Context.Reference<WorkspaceV2.ID | undefined>("~axon/WorkspaceRef", {
  defaultValue: () => undefined,
})
