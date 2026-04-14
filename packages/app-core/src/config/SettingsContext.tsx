import type { AppSettings } from "@memo-inbox/shared-types";
import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { usePlatformBridge } from "../platform/PlatformBridgeContext";

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  isLoading: boolean;
}

const SETTINGS_STORAGE_KEY = "memo_inbox_settings";

const DEFAULT_SETTINGS: AppSettings = {
  serviceBaseUrl: "http://127.0.0.1:6005",
  serviceToken: "development-token",
  socketBaseUrl: "http://127.0.0.1:6005",
  socketVcpKey: "vcp-key-placeholder",
};

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: PropsWithChildren) {
  const platformBridge = usePlatformBridge();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const stored = await platformBridge.getStorageItem(SETTINGS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, [platformBridge]);

  const updateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      await platformBridge.setStorageItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }, [platformBridge, settings]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
