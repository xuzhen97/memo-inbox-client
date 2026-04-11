import { createContext, useContext } from "react";

import type { PlatformBridge } from "@memo-inbox/platform-bridge";

export const PlatformBridgeContext = createContext<PlatformBridge | null>(null);

export function usePlatformBridge(): PlatformBridge {
  const bridge = useContext(PlatformBridgeContext);

  if (!bridge) {
    throw new Error("Platform bridge context is not available.");
  }

  return bridge;
}
