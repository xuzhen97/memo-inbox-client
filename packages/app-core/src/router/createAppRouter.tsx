import { useEffect, useState } from "react";
import { ShellHomePage } from "../screens/ShellHomePage";
import { DesktopInbox } from "../screens/DesktopInbox";
import { DesktopReview } from "../screens/DesktopReview";
import { DesktopMemoEdit } from "../screens/DesktopMemoEdit";
import { usePlatformBridge } from "../platform/PlatformBridgeContext";

export const appNavigateEvent = "memo-inbox:navigate";

function renderRoute(pathname: string) {
  const editMatch = pathname.match(/^\/memos\/([^/]+)\/edit\/?$/);

  if (editMatch) {
    return <DesktopMemoEdit memoId={decodeURIComponent(editMatch[1])} />;
  }

  if (pathname === "/review") {
    return <DesktopReview />;
  }

  if (pathname === "/") {
    return <DesktopInbox />;
  }

  return <ShellHomePage />;
}

function RootRouter() {
  const platformBridge = usePlatformBridge();
  const [kind, setKind] = useState<string>("unknown");
  const [pathname, setPathname] = useState(() => window.location.pathname || "/");

  useEffect(() => {
    platformBridge.getPlatformInfo().then((info) => {
      setKind(info.kind);
    });
  }, [platformBridge]);

  useEffect(() => {
    const syncPathname = () => {
      setPathname(window.location.pathname || "/");
    };

    window.addEventListener("popstate", syncPathname);
    window.addEventListener(appNavigateEvent, syncPathname);

    return () => {
      window.removeEventListener("popstate", syncPathname);
      window.removeEventListener(appNavigateEvent, syncPathname);
    };
  }, []);

  void kind;
  return renderRoute(pathname);
}

export function createAppRouter() {
  return <RootRouter />;
}
