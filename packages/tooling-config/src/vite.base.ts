import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, type UserConfig } from "vite";

export function createBaseViteConfig(): UserConfig {
  return defineConfig({
    plugins: [
      react()
    ],
    resolve: {
      alias: {
        "@memo-inbox/shared-types": fileURLToPath(new URL("../../shared-types/src/index.ts", import.meta.url)),
        "@memo-inbox/api-client": fileURLToPath(new URL("../../api-client/src/index.ts", import.meta.url)),
        "@memo-inbox/editor-markdown": fileURLToPath(new URL("../../editor-markdown/src/index.ts", import.meta.url)),
        "@memo-inbox/platform-bridge": fileURLToPath(new URL("../../platform-bridge/src/index.ts", import.meta.url)),
        "@memo-inbox/ui-kit": fileURLToPath(new URL("../../ui-kit/src/index.ts", import.meta.url)),
        "@memo-inbox/app-core": fileURLToPath(new URL("../../app-core/src/index.ts", import.meta.url)),
        "@memo-inbox/tooling-config": fileURLToPath(new URL("./index.ts", import.meta.url))
      }
    },
    build: {
      target: "es2022",
      sourcemap: true
    }
  });
}
