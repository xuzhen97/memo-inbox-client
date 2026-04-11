import type { PlatformBridge } from "@memo-inbox/shared-types";

import { createMemoryDraftStore } from "../core/createMemoryDraftStore";

export function createTauriPlatformBridge(): PlatformBridge {
  const draftStore = createMemoryDraftStore();

  return {
    async getPlatformInfo() {
      return {
        kind: "desktop",
        runtime: "tauri",
        target: "windows"
      };
    },
    saveDraft: draftStore.saveDraft,
    loadDraft: draftStore.loadDraft,
    removeDraft: draftStore.removeDraft
  };
}
