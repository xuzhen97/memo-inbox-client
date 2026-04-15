import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";

import { DesktopShellHeader } from "../components/DesktopShellHeader";
import { appNavigateEvent } from "../router/createAppRouter";
import { TaskEventContext } from "../api/TaskEventContext";

async function renderHeader(pathname: string, activeTab: "all" | "review") {
  const host = document.createElement("div");
  document.body.appendChild(host);
  window.history.replaceState({}, "", pathname);

  const root = createRoot(host);

  await act(async () => {
    root.render(
      <TaskEventContext.Provider
        value={{
          notifications: [],
          activeTasks: {},
          markAsRead: () => {},
          markAllAsRead: () => {},
          clearNotifications: () => {},
          registerTask: () => {},
          unregisterTask: () => {},
          hasUnread: false,
        }}
      >
        <DesktopShellHeader
          activeTab={activeTab}
          centerSlot={<div data-testid="center-slot">center</div>}
        />
      </TaskEventContext.Provider>,
    );
  });

  return { host, root };
}

describe("DesktopShellHeader", () => {
  it("marks the active tab with aria-current", async () => {
    const { host, root } = await renderHeader("/review", "review");

    expect(host.querySelector('button[aria-current="page"]')?.textContent).toContain("回顾");

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it("navigates to / when clicking 全部", async () => {
    const events: string[] = [];
    const handleNavigate = () => {
      events.push("navigate");
    };

    window.addEventListener(appNavigateEvent, handleNavigate);

    const { host, root } = await renderHeader("/review", "review");

    await act(async () => {
      host.querySelector('button[aria-label="前往全部页面"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    expect(window.location.pathname).toBe("/");
    expect(events).toEqual(["navigate"]);

    window.removeEventListener(appNavigateEvent, handleNavigate);

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it("navigates to /archive when clicking 归档", async () => {
    const { host, root } = await renderHeader("/", "all");

    await act(async () => {
      host.querySelector('button[aria-label="前往归档页面"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    expect(window.location.pathname).toBe("/archive");

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });
});
