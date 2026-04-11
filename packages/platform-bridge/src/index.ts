import type { PlatformBridge } from "@memo-inbox/shared-types";

import { createCapacitorPlatformBridge } from "./capacitor/createCapacitorPlatformBridge";
import { createTauriPlatformBridge } from "./tauri/createTauriPlatformBridge";
import { createWebPlatformBridge } from "./web/createWebPlatformBridge";

let activePlatformBridge: PlatformBridge | null = null;

export type { PlatformBridge } from "@memo-inbox/shared-types";
export { createCapacitorPlatformBridge } from "./capacitor/createCapacitorPlatformBridge";
export { createTauriPlatformBridge } from "./tauri/createTauriPlatformBridge";
export { createWebPlatformBridge } from "./web/createWebPlatformBridge";

export function setPlatformBridge(bridge: PlatformBridge): void {
  activePlatformBridge = bridge;
}

export function getPlatformBridge(): PlatformBridge {
  if (!activePlatformBridge) {
    throw new Error("Platform bridge has not been configured.");
  }

  return activePlatformBridge;
}

export function resetPlatformBridge(): void {
  activePlatformBridge = null;
}

export function createPlatformBridge(kind: "web" | "tauri" | "capacitor"): PlatformBridge {
  switch (kind) {
    case "tauri":
      return createTauriPlatformBridge();
    case "capacitor":
      return createCapacitorPlatformBridge();
    case "web":
    default:
      return createWebPlatformBridge();
  }
}
