import { load } from "@tauri-apps/plugin-store";
import type { PlatformBridge } from "@memo-inbox/shared-types";
import { createMemoryDraftStore } from "../core/createMemoryDraftStore";

export function createTauriPlatformBridge(): PlatformBridge {
  const draftStore = createMemoryDraftStore();
  
  // Lazily load the store to avoid top-level await in the factory
  const getStore = async () => load("settings.json", { autoSave: true, defaults: {} });

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
    removeDraft: draftStore.removeDraft,
    async getStorageItem(key) {
      try {
        const store = await getStore();
        const value = await store.get<string>(key);
        return value || null;
      } catch (e) {
        console.error("Tauri Store error:", e);
        return localStorage.getItem(key);
      }
    },
    async setStorageItem(key, value) {
      try {
        const store = await getStore();
        await store.set(key, value);
        // Note: autoSave is true, so no need for explicit save()
      } catch (e) {
        console.error("Tauri Store error:", e);
        localStorage.setItem(key, value);
      }
    }
  };
}
