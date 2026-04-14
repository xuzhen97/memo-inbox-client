import type { ReactNode } from "react";
import { Bell, Settings, User } from "lucide-react";

import { appNavigateEvent } from "../router/createAppRouter";

interface DesktopShellHeaderProps {
  activeTab: "all" | "review" | "archive";
  centerSlot?: ReactNode;
}

export function DesktopShellHeader({ activeTab, centerSlot }: DesktopShellHeaderProps) {
  const tabClass = (tab: "all" | "review" | "archive") =>
    activeTab === tab
      ? "text-primary font-bold"
      : "text-on-surface-variant/50 transition-colors hover:text-primary";

  const navigateTo = (pathname: string) => {
    if (window.location.pathname === pathname) {
      return;
    }

    window.history.pushState({}, "", pathname);
    window.dispatchEvent(new Event(appNavigateEvent));
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-surface/90 px-6 backdrop-blur-md lg:px-10">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary pb-0.5 font-bold text-white">
          M
        </div>
        <span className="ml-1 text-lg font-bold tracking-wide text-primary">记忆收件箱</span>
      </div>

      <div className="ml-10 flex w-full max-w-3xl items-center gap-12">
        <div className="flex flex-1">{centerSlot}</div>

        <nav className="flex gap-6 text-sm font-medium tracking-wide" aria-label="主导航">
          <button
            type="button"
            aria-label="前往全部页面"
            aria-current={activeTab === "all" ? "page" : undefined}
            className={tabClass("all")}
            onClick={() => navigateTo("/")}
          >
            全部
          </button>
          <button
            type="button"
            aria-label="前往回顾页面"
            aria-current={activeTab === "review" ? "page" : undefined}
            className={tabClass("review")}
            onClick={() => navigateTo("/review")}
          >
            回顾
          </button>
          <button
            type="button"
            aria-label="前往归档页面"
            aria-current={activeTab === "archive" ? "page" : undefined}
            className={tabClass("archive")}
            onClick={() => navigateTo("/archive")}
          >
            归档
          </button>
        </nav>
      </div>

      <div className="ml-auto flex items-center gap-4 text-on-surface-variant">
        <Bell size={20} className="cursor-pointer transition-colors hover:text-primary" />
        <Settings 
          size={20} 
          className="cursor-pointer transition-colors hover:text-primary" 
          onClick={() => navigateTo("/settings")}
        />
        <div className="ml-2 h-8 w-8 overflow-hidden rounded-full border border-outline-variant/20 bg-surface-container-high shadow-sm">
          <User size={24} className="ml-1 mt-1 opacity-50" />
        </div>
      </div>
    </header>
  );
}
