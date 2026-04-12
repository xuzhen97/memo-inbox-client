import { QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useMemo } from "react";

import { createApiClient } from "@memo-inbox/api-client";
import type { PlatformBridge } from "@memo-inbox/platform-bridge";

import { PlatformBridgeContext } from "../platform/PlatformBridgeContext";
import { createQueryClient } from "../query/createQueryClient";
import { ApiClientContext } from "../api/ApiClientContext";

const queryClient = createQueryClient();

export interface AppProvidersProps extends PropsWithChildren {
  platformBridge: PlatformBridge;
  apiUrl: string;
  apiToken: string;
}

export function AppProviders({ children, platformBridge, apiUrl, apiToken }: AppProvidersProps) {
  const apiClient = useMemo(
    () => createApiClient({ baseUrl: apiUrl, bearerToken: apiToken }),
    [apiUrl, apiToken]
  );

  return (
    <ApiClientContext.Provider value={apiClient}>
      <PlatformBridgeContext.Provider value={platformBridge}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </PlatformBridgeContext.Provider>
    </ApiClientContext.Provider>
  );
}
