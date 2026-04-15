import { describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { PlatformBridge } from "@memo-inbox/shared-types";

import { PlatformBridgeContext } from "../platform/PlatformBridgeContext";
import { createAppRouter } from "../router/createAppRouter";

vi.mock("../screens/DesktopInbox", () => ({
  DesktopInbox() {
    return <div>桌面收件箱占位</div>;
  }
}));

vi.mock("../screens/DesktopReview", () => ({
  DesktopReview() {
    return <div>重温旧记忆页面</div>;
  }
}));

vi.mock("../screens/DesktopMemoEdit", () => ({
  DesktopMemoEdit() {
    return <div>编辑这条记忆</div>;
  }
}));

function createPlatformBridge(): PlatformBridge {
  const invokeCommand: PlatformBridge["invokeCommand"] = async <T,>() => undefined as T;

  return {
    getPlatformInfo: vi.fn().mockResolvedValue({ kind: "desktop", runtime: "test" }),
    saveDraft: vi.fn(),
    loadDraft: vi.fn(),
    removeDraft: vi.fn(),
    getStorageItem: vi.fn().mockResolvedValue(null),
    setStorageItem: vi.fn(),
    invokeCommand,
    showOpenDialog: vi.fn().mockResolvedValue(null),
    importFlomoExport: vi.fn().mockResolvedValue(null),
  };
}

async function renderRouterAt(pathname: string) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  window.history.replaceState({}, "", pathname);

  const root = createRoot(host);

  await act(async () => {
    root.render(
      <PlatformBridgeContext.Provider value={createPlatformBridge()}>
        {createAppRouter()}
      </PlatformBridgeContext.Provider>
    );
  });

  return { host, root };
}

describe("createAppRouter", () => {
  it("renders DesktopInbox for the root path", async () => {
    const { host, root } = await renderRouterAt("/");

    expect(host.textContent).toContain("桌面收件箱占位");

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it("renders DesktopReview for /review", async () => {
    const { host, root } = await renderRouterAt("/review");

    expect(host.textContent).toContain("重温旧记忆页面");

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it("renders the memo edit placeholder for /memos/:memoId/edit", async () => {
    const { host, root } = await renderRouterAt("/memos/abc/edit");

    expect(host.textContent).toContain("编辑这条记忆");

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });
});
