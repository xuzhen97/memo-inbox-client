import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import { ApiClientContext } from "../api/ApiClientContext";
import { AppConfigContext } from "../config/AppConfigContext";
import { DesktopMemoEdit } from "../screens/DesktopMemoEdit";

const useMemoMock = vi.fn();
const useUpdateMemoMock = vi.fn();

vi.mock("@memo-inbox/api-client", () => ({
  useMemo: (...args: unknown[]) => useMemoMock(...args),
  useUpdateMemo: (...args: unknown[]) => useUpdateMemoMock(...args)
}));

function setTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  setter?.call(textarea, value);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function createMemoFixture() {
  return {
    memoId: "memo-1",
    header: { date: "2026-04-12", maidName: "tester" },
    content: "这是原始正文",
    attachments: [],
    tags: ["工作"],
    meta: { memoId: "memo-1" },
    createdAt: "2026-04-12T10:00:00.000Z",
    updatedAt: "2026-04-12T10:00:00.000Z",
    deleted: false,
    filename: "memo-1.md"
  };
}

describe("DesktopMemoEdit leave guard", () => {
  it("prompts before leaving when there are unsaved changes", async () => {
    useMemoMock.mockReturnValue({
      data: createMemoFixture(),
      isLoading: false
    });
    useUpdateMemoMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false
    });

    const confirmMock = vi.spyOn(window, "confirm").mockReturnValue(false);
    const host = document.createElement("div");
    document.body.appendChild(host);
    window.history.replaceState({}, "", "/memos/memo-1/edit");
    const root = createRoot(host);

    await act(async () => {
      root.render(
        <AppConfigContext.Provider value={{ apiUrl: "http://localhost:3000" }}>
          <ApiClientContext.Provider value={{} as never}>
            <DesktopMemoEdit memoId="memo-1" />
          </ApiClientContext.Provider>
        </AppConfigContext.Provider>
      );
    });

    const textarea = host.querySelector("textarea") as HTMLTextAreaElement | null;
    if (textarea) {
      setTextareaValue(textarea, "已改动正文");
    }

    await act(async () => {
      host.querySelector('button[aria-label="取消编辑"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(confirmMock).toHaveBeenCalled();
    expect(window.location.pathname).toBe("/memos/memo-1/edit");
    confirmMock.mockRestore();

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it("returns immediately when there are no unsaved changes", async () => {
    useMemoMock.mockReturnValue({
      data: createMemoFixture(),
      isLoading: false
    });
    useUpdateMemoMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false
    });

    const confirmMock = vi.spyOn(window, "confirm").mockReturnValue(true);
    const host = document.createElement("div");
    document.body.appendChild(host);
    window.history.replaceState({}, "", "/memos/memo-1/edit");
    const root = createRoot(host);

    await act(async () => {
      root.render(
        <AppConfigContext.Provider value={{ apiUrl: "http://localhost:3000" }}>
          <ApiClientContext.Provider value={{} as never}>
            <DesktopMemoEdit memoId="memo-1" />
          </ApiClientContext.Provider>
        </AppConfigContext.Provider>
      );
    });

    await act(async () => {
      host.querySelector('button[aria-label="取消编辑"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(confirmMock).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe("/");
    confirmMock.mockRestore();

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });
});
