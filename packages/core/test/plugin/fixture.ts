import { Credential } from "@axon-ai/core/credential"
import { EventV2 } from "@axon-ai/core/event"
import { FileSystem } from "@axon-ai/core/filesystem"
import { FSUtil } from "@axon-ai/core/fs-util"
import { Global } from "@axon-ai/core/global"
import { Npm } from "@axon-ai/core/npm"
import { PluginV2 } from "@axon-ai/core/plugin"
import { RepositoryCache } from "@axon-ai/core/repository-cache"
import { Ripgrep } from "@axon-ai/core/ripgrep"
import { SkillDiscovery } from "@axon-ai/core/skill/discovery"
import { Effect, Layer } from "effect"
import { FetchHttpClient } from "effect/unstable/http"
import { tempLocationLayer } from "../fixture/location"

export const PluginTestLayer = Layer.mergeAll(FileSystem.locationLayer, PluginV2.locationLayer).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      Credential.defaultLayer,
      EventV2.defaultLayer,
      FetchHttpClient.layer,
      FSUtil.defaultLayer,
      Global.defaultLayer,
      Layer.succeed(
        Npm.Service,
        Npm.Service.of({
          add: () => Effect.succeed({ directory: "", entrypoint: undefined }),
          install: () => Effect.void,
          which: () => Effect.succeed(undefined),
        }),
      ),
      RepositoryCache.defaultLayer,
      SkillDiscovery.defaultLayer,
      Ripgrep.defaultLayer,
      tempLocationLayer,
    ),
  ),
)
