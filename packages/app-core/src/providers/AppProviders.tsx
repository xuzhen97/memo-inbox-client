import { QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useMemo } from "react";

import { createApiClient } from "@memo-inbox/api-client";
import type { PlatformBridge } from "@memo-inbox/platform-bridge";

import { PlatformBridgeContext } from "../platform/PlatformBridgeContext";
import { createQueryClient } from "../query/createQueryClient";
import { ApiClientContext } from "../api/ApiClientContext";
import { AppConfigContext } from "../config/AppConfigContext";
import { usePlatformBridge } from "../platform/PlatformBridgeContext";
import { SettingsProvider, useSettings } from "../config/SettingsContext";
import { TaskEventProvider } from "../api/TaskEventContext";

const queryClient = createQueryClient();

export interface AppProvidersProps extends PropsWithChildren {
  platformBridge: PlatformBridge;
}

export function AppProviders({ children, platformBridge }: AppProvidersProps) {
  return (
    <PlatformBridgeContext.Provider value={platformBridge}>
      <SettingsProvider>
        <AppProvidersInner>{children}</AppProvidersInner>
      </SettingsProvider>
    </PlatformBridgeContext.Provider>
  );
}

function AppProvidersInner({ children }: PropsWithChildren) {
  const { settings, isLoading } = useSettings();
  
  const apiClient = useMemo(
    () => createApiClient({ 
      baseUrl: settings.serviceBaseUrl, 
      bearerToken: settings.serviceToken 
    }),
    [settings.serviceBaseUrl, settings.serviceToken]
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface font-sans text-on-surface">
        <div className="animate-pulse text-sm font-medium tracking-widest text-primary/40">
          INITIALIZING...
        </div>
      </div>
    );
  }

  return (
    <AppConfigContext.Provider value={{ apiUrl: settings.serviceBaseUrl }}>
      <ApiClientContext.Provider value={apiClient}>
        <TaskEventProvider>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </TaskEventProvider>
      </ApiClientContext.Provider>
    </AppConfigContext.Provider>
  );
}
