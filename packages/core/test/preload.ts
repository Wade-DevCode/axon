import path from "path"

process.env.AXON_DB = ":memory:"
process.env.AXON_MODELS_PATH = path.join(import.meta.dir, "plugin", "fixtures", "models-dev.json")
process.env.AXON_DISABLE_MODELS_FETCH = "true"
