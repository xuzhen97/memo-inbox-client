import { defineConfig, mergeConfig } from "vite";

import { createBaseViteConfig } from "../tooling-config/src/vite.base";

export default mergeConfig(createBaseViteConfig(), defineConfig({}));
