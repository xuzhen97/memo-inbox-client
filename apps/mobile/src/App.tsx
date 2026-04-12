import { AppProviders, createAppRouter } from "@memo-inbox/app-core";
import { createCapacitorPlatformBridge } from "@memo-inbox/platform-bridge";

const platformBridge = createCapacitorPlatformBridge();

export default function App() {
  return (
    <AppProviders
      platformBridge={platformBridge}
      apiUrl={import.meta.env.VITE_API_URL || "http://localhost:3000"}
      apiToken={import.meta.env.VITE_API_TOKEN || "development-token"}
    >
      {createAppRouter()}
    </AppProviders>
  );
}
