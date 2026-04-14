import { AppProviders, createAppRouter } from "@memo-inbox/app-core";
import { createTauriPlatformBridge } from "@memo-inbox/platform-bridge";

const platformBridge = createTauriPlatformBridge();

export default function App() {
  return (
    <AppProviders
      platformBridge={platformBridge}
    >
      {createAppRouter()}
    </AppProviders>
  );
}
