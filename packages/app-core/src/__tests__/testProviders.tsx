import type { ReactNode } from "react";

import { ApiClientContext } from "../api/ApiClientContext";
import { TaskEventContext } from "../api/TaskEventContext";
import { AppConfigContext } from "../config/AppConfigContext";
import { SettingsContext } from "../config/SettingsContext";
import { PlatformBridgeContext } from "../platform/PlatformBridgeContext";

export function TestProviders({ children }: { children: ReactNode }) {
  return (
    <PlatformBridgeContext.Provider
      value={{
        getPlatformInfo: async () => ({ kind: "desktop", runtime: "test" }),
        saveDraft: async () => {},
        loadDraft: async () => null,
        removeDraft: async () => {},
        getStorageItem: async () => null,
        setStorageItem: async () => {},
        invokeCommand: async <T,>() => undefined as T,
        showOpenDialog: async () => null,
        importFlomoExport: async () => null,
      }}
    >
      <SettingsContext.Provider
        value={{
          settings: {
            serviceBaseUrl: "http://localhost:3000",
            serviceToken: "test-token",
            socketBaseUrl: "http://localhost:3001",
            socketVcpKey: "test-socket-key",
            followedTags: [],
          },
          updateSettings: async () => {},
          isLoading: false,
        }}
      >
        <TaskEventContext.Provider
          value={{
            notifications: [],
            activeTasks: {},
            markAsRead: () => {},
            markAllAsRead: () => {},
            clearNotifications: () => {},
            registerTask: () => {},
            unregisterTask: () => {},
            hasUnread: false,
          }}
        >
          <AppConfigContext.Provider value={{ apiUrl: "http://localhost:3000" }}>
            <ApiClientContext.Provider value={{} as never}>{children}</ApiClientContext.Provider>
          </AppConfigContext.Provider>
        </TaskEventContext.Provider>
      </SettingsContext.Provider>
    </PlatformBridgeContext.Provider>
  );
}
