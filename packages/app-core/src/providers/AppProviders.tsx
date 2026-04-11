import { QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";

import type { PlatformBridge } from "@memo-inbox/platform-bridge";

import { PlatformBridgeContext } from "../platform/PlatformBridgeContext";
import { createQueryClient } from "../query/createQueryClient";

const queryClient = createQueryClient();

export interface AppProvidersProps extends PropsWithChildren {
  platformBridge: PlatformBridge;
}

export function AppProviders({ children, platformBridge }: AppProvidersProps) {
  return (
    <PlatformBridgeContext.Provider value={platformBridge}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </PlatformBridgeContext.Provider>
  );
}
