import { Preferences } from "@capacitor/preferences";
import type { PlatformBridge } from "@memo-inbox/shared-types";
import { createMemoryDraftStore } from "../core/createMemoryDraftStore";

export function createCapacitorPlatformBridge(): PlatformBridge {
  const draftStore = createMemoryDraftStore();

  return {
    async getPlatformInfo() {
      return {
        kind: "mobile",
        runtime: "capacitor",
        target: "android" // Default, usually overridden or detected
      };
    },
    saveDraft: draftStore.saveDraft,
    loadDraft: draftStore.loadDraft,
    removeDraft: draftStore.removeDraft,
    async getStorageItem(key) {
      try {
        const { value } = await Preferences.get({ key });
        return value || null;
      } catch (e) {
        console.error("Capacitor Preferences error:", e);
        return localStorage.getItem(key);
      }
    },
    async setStorageItem(key, value) {
      try {
        await Preferences.set({ key, value });
      } catch (e) {
        console.error("Capacitor Preferences error:", e);
        localStorage.setItem(key, value);
      }
    },
    async invokeCommand() {
      console.warn("invokeCommand is not implemented for Capacitor");
      throw new Error("NOT_IMPLEMENTED");
    },
    async showOpenDialog() {
      console.warn("showOpenDialog is not implemented for Capacitor");
      return null;
    },
    async importFlomoExport() {
      console.warn("importFlomoExport is not implemented for Capacitor");
      return null;
    }
  };
}
