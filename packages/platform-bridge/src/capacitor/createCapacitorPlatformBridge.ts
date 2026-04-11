import type { PlatformBridge } from "@memo-inbox/shared-types";

import { createMemoryDraftStore } from "../core/createMemoryDraftStore";

export function createCapacitorPlatformBridge(): PlatformBridge {
  const draftStore = createMemoryDraftStore();

  return {
    async getPlatformInfo() {
      return {
        kind: "mobile",
        runtime: "capacitor",
        target: "android"
      };
    },
    saveDraft: draftStore.saveDraft,
    loadDraft: draftStore.loadDraft,
    removeDraft: draftStore.removeDraft
  };
}
