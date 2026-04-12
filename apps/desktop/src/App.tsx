import { AppProviders, createAppRouter } from "@memo-inbox/app-core";
import { createTauriPlatformBridge } from "@memo-inbox/platform-bridge";

const platformBridge = createTauriPlatformBridge();

export default function App() {
  return (
    <AppProviders
      platformBridge={platformBridge}
      apiUrl={import.meta.env.VITE_API_URL || "http://127.0.0.1:6005"}
      apiToken={import.meta.env.VITE_API_TOKEN || "development-token"}
    >
      {createAppRouter()}
    </AppProviders>
  );
}
