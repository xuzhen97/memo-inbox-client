import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MobileShell } from "../screens/MobileShell";

let currentHost: HTMLDivElement | null = null;
let currentRoot: Root | null = null;
const scrollToMock = vi.fn();

async function renderMobileShell() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);

  await act(async () => {
    root.render(
      <MobileShell activePath="/">
        <div data-testid="mobile-shell-content">content</div>
      </MobileShell>,
    );
  });

  currentHost = host;
  currentRoot = root;
  return { host, root };
}

describe("MobileShell", () => {
  beforeEach(() => {
    scrollToMock.mockReset();
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      writable: true,
      value: scrollToMock,
    });
  });

  afterEach(async () => {
    if (currentRoot) {
      await act(async () => {
        currentRoot?.unmount();
      });
      currentRoot = null;
    }
    currentHost?.remove();
    currentHost = null;
  });

  it("keeps shell containers and safe-area paddings wired", async () => {
    const { host } = await renderMobileShell();
    const root = host.querySelector('[data-testid="mobile-shell-root"]') as HTMLDivElement | null;
    const main = host.querySelector('[data-testid="mobile-shell-main"]') as HTMLElement | null;
    const nav = host.querySelector('[data-testid="mobile-shell-nav"]') as HTMLElement | null;

    expect(root).not.toBeNull();
    expect(main).not.toBeNull();
    expect(nav).not.toBeNull();

    expect(root?.className).toContain("overflow-x-hidden");
    expect(main?.className).toContain("overflow-y-auto");
    expect(main?.className).toContain("overflow-x-hidden");
    expect(main?.style.paddingBottom).toContain("env(safe-area-inset-bottom)");
    expect(nav?.style.paddingBottom).toContain("env(safe-area-inset-bottom)");
  });

  it("shows back-to-top after threshold, scrolls main to top, and keeps shared safe-area baseline", async () => {
    const { host } = await renderMobileShell();
    const main = host.querySelector('[data-testid="mobile-shell-main"]') as HTMLElement | null;
    const nav = host.querySelector('[data-testid="mobile-shell-nav"]') as HTMLElement | null;
    expect(main).not.toBeNull();
    expect(nav).not.toBeNull();
    expect(host.querySelector('[data-testid="mobile-shell-back-to-top"]')).toBeNull();

    await act(async () => {
      if (main) {
        Object.defineProperty(main, "scrollTop", {
          configurable: true,
          writable: true,
          value: 401,
        });
        main.dispatchEvent(new Event("scroll", { bubbles: true }));
      }
    });

    const backToTop = host.querySelector('[data-testid="mobile-shell-back-to-top"]') as HTMLButtonElement | null;
    expect(backToTop).not.toBeNull();

    await act(async () => {
      backToTop?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });

    const mainPadding = main?.style.paddingBottom ?? "";
    const backToTopBottom = backToTop?.style.bottom ?? "";
    expect(mainPadding).toContain("68px");
    expect(mainPadding).toContain("env(safe-area-inset-bottom)");
    expect(backToTopBottom).toContain("env(safe-area-inset-bottom)");
    const mainBase = Number(mainPadding.match(/(\d+)px/)?.[1] ?? "0");
    const backToTopBase = Number(backToTopBottom.match(/(\d+)px/)?.[1] ?? "0");
    expect(backToTopBase).toBe(mainBase + 20);
    expect(nav?.querySelector("div")?.className).toContain("h-[68px]");
  });
});
