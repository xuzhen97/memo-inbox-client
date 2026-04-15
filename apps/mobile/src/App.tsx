import { AppProviders, createAppRouter } from "@memo-inbox/app-core";
import { createCapacitorPlatformBridge } from "@memo-inbox/platform-bridge";

const platformBridge = createCapacitorPlatformBridge();

export default function App() {
  return (
    <AppProviders platformBridge={platformBridge}>
      {createAppRouter()}
    </AppProviders>
  );
}
