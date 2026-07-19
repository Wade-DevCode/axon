// @ts-nocheck

import { Axon } from "@axon-ai/core"
import { ReadTool } from "@axon-ai/core/tools"

const axon = Axon.make({})

axon.tool.add(ReadTool)

axon.tool.add({
  name: "bash",
  schema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The command to run.",
      },
    },
    required: ["command"],
  },
  execute(input, ctx) {},
})

axon.auth.add({
  provider: "openai",
  type: "api",
  value: process.env.OPENAI_API_KEY,
})

axon.agent.add({
  name: "build",
  permissions: [],
  model: {
    id: "gpt-5-5",
    provider: "openai",
    variant: "xhigh",
  },
})

const sessionID = await axon.session.create({
  agent: "build",
})

axon.subscribe((event) => {
  console.log(event)
})

await axon.session.prompt({
  sessionID,
  text: "hey what is up",
})

await axon.session.prompt({
  sessionID,
  text: "what is up with this",
  files: [
    {
      mime: "image/png",
      uri: "data:image/png;base64,xxxx",
    },
  ],
})

await axon.session.wait()

console.log(await axon.session.messages(sessionID))
