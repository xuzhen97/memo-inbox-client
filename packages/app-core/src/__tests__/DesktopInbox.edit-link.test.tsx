import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import { ApiClientContext } from "../api/ApiClientContext";
import { AppConfigContext } from "../config/AppConfigContext";
import { PlatformBridgeContext } from "../platform/PlatformBridgeContext";
import { createAppRouter } from "../router/createAppRouter";

vi.mock("@memo-inbox/api-client", () => ({
  useMemoList: vi.fn(() => ({
    data: {
      items: [
        {
          memoId: "memo-1",
          header: { date: "2026-04-12", maidName: "tester" },
          content: "需要编辑的 memo",
          attachments: [],
          tags: ["工作"],
          meta: { memoId: "memo-1" },
          createdAt: "2026-04-12T10:00:00.000Z",
          updatedAt: "2026-04-12T10:00:00.000Z",
          deleted: false,
          filename: "memo-1.md"
        }
      ],
      nextCursor: null
    },
    isLoading: false
  })),
  useMemoSearch: vi.fn(() => ({
    data: {
      items: [
        {
          memoId: "memo-1",
          header: { date: "2026-04-12", maidName: "tester" },
          content: "需要编辑的 memo",
          attachments: [],
          tags: ["工作"],
          meta: { memoId: "memo-1" },
          createdAt: "2026-04-12T10:00:00.000Z",
          updatedAt: "2026-04-12T10:00:00.000Z",
          deleted: false,
          filename: "memo-1.md"
        }
      ]
    },
    isLoading: false
  })),
  useCreateMemo: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false
  })),
  useRemoveMemo: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false
  })),
  useMemo: vi.fn(() => ({
    data: {
      memoId: "memo-1",
      header: { date: "2026-04-12", maidName: "tester" },
      content: "需要编辑的 memo",
      attachments: [],
      tags: ["工作"],
      meta: { memoId: "memo-1" },
      createdAt: "2026-04-12T10:00:00.000Z",
      updatedAt: "2026-04-12T10:00:00.000Z",
      deleted: false,
      filename: "memo-1.md"
    },
    isLoading: false
  }))
}));

vi.mock("../screens/DesktopMemoEdit", () => ({
  DesktopMemoEdit() {
    return <div>编辑这条记忆</div>;
  }
}));

function createPlatformBridge() {
  return {
    getPlatformInfo: vi.fn().mockResolvedValue({ kind: "desktop", runtime: "test" }),
    saveDraft: vi.fn(),
    loadDraft: vi.fn(),
    removeDraft: vi.fn()
  };
}

describe("DesktopInbox edit link", () => {
  it("navigates to /memos/:memoId/edit when the edit button is clicked", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    window.history.replaceState({}, "", "/");

    const root = createRoot(host);

    await act(async () => {
      root.render(
        <AppConfigContext.Provider value={{ apiUrl: "http://localhost:3000" }}>
          <PlatformBridgeContext.Provider value={createPlatformBridge()}>
            <ApiClientContext.Provider value={{} as never}>{createAppRouter()}</ApiClientContext.Provider>
          </PlatformBridgeContext.Provider>
        </AppConfigContext.Provider>
      );
    });

    const editButton = host.querySelector('button[aria-label="编辑这条 memo"]');

    expect(editButton).not.toBeNull();

    await act(async () => {
      editButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(window.location.pathname).toBe("/memos/memo-1/edit");
    expect(host.textContent).toContain("编辑这条记忆");

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });
});
