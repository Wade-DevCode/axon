/// <reference path="../markdown.d.ts" />

export * as SkillPlugin from "./skill"

import { define } from "./internal"
import { Effect } from "effect"
import { AbsolutePath } from "../schema"
import { SkillV2 } from "../skill"
import customizeAxonContent from "./skill/customize-axon.md" with { type: "text" }

export const CustomizeAxonContent = customizeAxonContent

export const Plugin = define({
  id: "skill",
  effect: Effect.fn(function* (ctx) {
    yield* ctx.skill.transform((draft) => {
      draft.source(
        SkillV2.EmbeddedSource.make({
          type: "embedded",
          skill: SkillV2.Info.make({
            name: "customize-axon",
            description:
              "Use ONLY when the user is editing or creating axon's own configuration: axon.json, axon.jsonc, files under .axon/, or files under ~/.axon/. Also use when creating or fixing axon agents, subagents, commands, skills, plugins, MCP servers, or permission rules. Do not use for the user's own application code, or for any project that is not configuring axon itself.",
            location: AbsolutePath.make("/builtin/customize-axon.md"),
            content: CustomizeAxonContent,
          }),
        }),
      )
    })
  }),
})
