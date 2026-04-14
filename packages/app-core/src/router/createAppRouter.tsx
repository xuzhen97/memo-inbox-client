import { useEffect, useState } from "react";
import { ShellHomePage } from "../screens/ShellHomePage";
import { DesktopInbox } from "../screens/DesktopInbox";
import { DesktopReview } from "../screens/DesktopReview";
import { DesktopArchive } from "../screens/DesktopArchive";
import { DesktopMemoEdit } from "../screens/DesktopMemoEdit";
import { DesktopSettings } from "../screens/DesktopSettings";

import { MobileShell } from "../screens/MobileShell";
import { MobileInbox } from "../screens/MobileInbox";
import { MobileArchive } from "../screens/MobileArchive";
import { MobileReview } from "../screens/MobileReview";
import { MobileSettings } from "../screens/MobileSettings";
import { MobileMemoEdit } from "../screens/MobileMemoEdit";

import { usePlatformBridge } from "../platform/PlatformBridgeContext";

export const appNavigateEvent = "memo-inbox:navigate";

function renderDesktopRoute(pathname: string) {
  const editMatch = pathname.match(/^\/memos\/([^/]+)\/edit\/?$/);

  if (editMatch) {
    return <DesktopMemoEdit memoId={decodeURIComponent(editMatch[1])} />;
  }

  if (pathname === "/review") {
    return <DesktopReview />;
  }

  if (pathname === "/archive") {
    return <DesktopArchive />;
  }

  if (pathname === "/settings") {
    return <DesktopSettings />;
  }

  if (pathname === "/" || pathname === "/index.html") {
    return <DesktopInbox />;
  }

  return <ShellHomePage />;
}

function renderMobileRoute(pathname: string) {
  const editMatch = pathname.match(/^\/memos\/([^/]+)\/edit\/?$/);
  if (editMatch) {
    // Edit passes without MobileShell wrapping
    return <MobileMemoEdit memoId={decodeURIComponent(editMatch[1])} />;
  }

  let content = <MobileInbox />;

  if (pathname === "/review") {
    content = <MobileReview />;
  } else if (pathname === "/archive") {
    content = <MobileArchive />;
  } else if (pathname === "/settings") {
    content = <MobileSettings />;
  } else if (pathname === "/" || pathname === "/index.html") {
    content = <MobileInbox />;
  } else {
    // Fallback or full screen pages can be handled here without shell if needed
    content = <MobileInbox />;
  }

  return <MobileShell activePath={pathname}>{content}</MobileShell>;
}

function RootRouter() {
  const platformBridge = usePlatformBridge();
  const [kind, setKind] = useState<string>("unknown");
  const [pathname, setPathname] = useState(() => window.location.pathname || "/");
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    platformBridge.getPlatformInfo().then((info) => {
      setKind(info.kind);
    });
  }, [platformBridge]);

  useEffect(() => {
    const handleResize = () => setIsNarrow(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  const isMobile = kind === "android" || kind === "ios" || kind === "capacitor" || kind === "mobile" || (kind === "web" && isNarrow);

  if (isMobile) {
    return renderMobileRoute(pathname);
  }

  return renderDesktopRoute(pathname);
}

export function createAppRouter() {
  return <RootRouter />;
}
