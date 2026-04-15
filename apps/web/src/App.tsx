import { AppProviders, createAppRouter } from "@memo-inbox/app-core";
import { createWebPlatformBridge } from "@memo-inbox/platform-bridge";

const platformBridge = createWebPlatformBridge();

export default function App() {
  return (
    <AppProviders platformBridge={platformBridge}>
      {createAppRouter()}
    </AppProviders>
  );
}
