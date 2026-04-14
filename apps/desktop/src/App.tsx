import { AppProviders, createAppRouter } from "@memo-inbox/app-core";
import { createTauriPlatformBridge, createWebPlatformBridge } from "@memo-inbox/platform-bridge";

const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
const platformBridge = isTauri ? createTauriPlatformBridge() : createWebPlatformBridge();

export default function App() {
  return (
    <AppProviders
      platformBridge={platformBridge}
    >
      {createAppRouter()}
    </AppProviders>
  );
}
