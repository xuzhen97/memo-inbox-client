import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";

import { DesktopShellHeader } from "../components/DesktopShellHeader";
import { appNavigateEvent } from "../router/createAppRouter";

async function renderHeader(pathname: string, activeTab: "all" | "review") {
  const host = document.createElement("div");
  document.body.appendChild(host);
  window.history.replaceState({}, "", pathname);

  const root = createRoot(host);

  await act(async () => {
    root.render(
      <DesktopShellHeader
        activeTab={activeTab}
        centerSlot={<div data-testid="center-slot">center</div>}
      />,
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

  it("keeps 归档 as a disabled placeholder", async () => {
    const { host, root } = await renderHeader("/", "all");

    expect(host.querySelector('button[aria-label="归档暂未接入"]')?.hasAttribute("disabled")).toBe(true);

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });
});
