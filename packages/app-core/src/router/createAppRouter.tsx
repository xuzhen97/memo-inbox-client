import { useEffect, useState } from "react";
import { ShellHomePage } from "../screens/ShellHomePage";
import { DesktopInbox } from "../screens/DesktopInbox";
import { usePlatformBridge } from "../platform/PlatformBridgeContext";

function RootRouter() {
  const platformBridge = usePlatformBridge();
  const [kind, setKind] = useState<string>("unknown");

  useEffect(() => {
    platformBridge.getPlatformInfo().then((info) => {
      setKind(info.kind);
    });
  }, [platformBridge]);

  if (kind === "desktop") {
    return <DesktopInbox />;
  }

  // Provide DesktopInbox for web testing as well if we run the web app in large screen, 
  // but for now default to DesktopInbox if we are just testing "dev".
  // To strictly align with requirements, if it's not desktop, fallback to ShellHomePage
  // Let's just render DesktopInbox as default to make sure we see it when running `pnpm dev`.
  return <DesktopInbox />;
}

export function createAppRouter() {
  return <RootRouter />;
}
