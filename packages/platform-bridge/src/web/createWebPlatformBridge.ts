import type { PlatformBridge } from "@memo-inbox/shared-types";

import { createMemoryDraftStore } from "../core/createMemoryDraftStore";

export function createWebPlatformBridge(): PlatformBridge {
  const draftStore = createMemoryDraftStore();

  return {
    async getPlatformInfo() {
      return {
        kind: "web",
        runtime: "browser"
      };
    },
    saveDraft: draftStore.saveDraft,
    loadDraft: draftStore.loadDraft,
    removeDraft: draftStore.removeDraft
  };
}
