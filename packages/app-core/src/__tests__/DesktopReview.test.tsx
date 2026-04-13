import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiClientContext } from "../api/ApiClientContext";
import { AppConfigContext } from "../config/AppConfigContext";
import { DesktopReview } from "../screens/DesktopReview";

const useReviewRandomMemoMock = vi.fn();

vi.mock("@memo-inbox/api-client", () => ({
  useReviewRandomMemo: (...args: unknown[]) => useReviewRandomMemoMock(...args),
}));

function renderDesktopReview() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);

  return {
    host,
    root,
    render: async () => {
      await act(async () => {
        root.render(
          <AppConfigContext.Provider value={{ apiUrl: "http://localhost:3000" }}>
            <ApiClientContext.Provider value={{} as never}>
              <DesktopReview />
            </ApiClientContext.Provider>
          </AppConfigContext.Provider>,
        );
      });
    },
  };
}

describe("DesktopReview", () => {
  beforeEach(() => {
    useReviewRandomMemoMock.mockReset();
  });

  it("renders a memo card when review data is available", async () => {
    useReviewRandomMemoMock.mockReturnValue({
      data: {
        memoId: "memo-1",
        header: { date: "2026-04-10", maidName: "tester" },
        content: "旧记忆内容",
        attachments: [],
        tags: ["回看"],
        meta: { memoId: "memo-1" },
        createdAt: "2026-04-10T10:00:00.000Z",
        updatedAt: "2026-04-10T10:00:00.000Z",
        deleted: false,
        filename: "memo-1.md",
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    });

    const view = renderDesktopReview();
    await view.render();

    expect(view.host.textContent).toContain("重温旧记忆");
    expect(view.host.textContent).toContain("旧记忆内容");
    expect(view.host.textContent).toContain("#回看");

    await act(async () => {
      view.root.unmount();
    });
    view.host.remove();
  });

  it("renders the empty state for MEMO_NOT_FOUND", async () => {
    useReviewRandomMemoMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: { code: "MEMO_NOT_FOUND", message: "memo not found", status: 404 },
      refetch: vi.fn(),
    });

    const view = renderDesktopReview();
    await view.render();

    expect(view.host.textContent).toContain("还没有可回顾的记忆");
    expect(view.host.querySelector('button[aria-label="返回全部页面"]')).not.toBeNull();

    await act(async () => {
      view.root.unmount();
    });
    view.host.remove();
  });

  it("renders retry state for generic request failure", async () => {
    const refetch = vi.fn();
    useReviewRandomMemoMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: { code: "NETWORK_ERROR", message: "failed", status: 500 },
      refetch,
    });

    const view = renderDesktopReview();
    await view.render();

    expect(view.host.textContent).toContain("这次没有取到旧记忆");

    await act(async () => {
      view.host.querySelector('button[aria-label="重新获取旧记忆"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    expect(refetch).toHaveBeenCalled();

    await act(async () => {
      view.root.unmount();
    });
    view.host.remove();
  });

  it("calls refetch when clicking 换一条", async () => {
    const refetch = vi.fn();
    useReviewRandomMemoMock.mockReturnValue({
      data: {
        memoId: "memo-1",
        header: { date: "2026-04-10", maidName: "tester" },
        content: "旧记忆内容",
        attachments: [],
        tags: [],
        meta: { memoId: "memo-1" },
        createdAt: "2026-04-10T10:00:00.000Z",
        updatedAt: "2026-04-10T10:00:00.000Z",
        deleted: false,
        filename: "memo-1.md",
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch,
    });

    const view = renderDesktopReview();
    await view.render();

    await act(async () => {
      view.host.querySelector('button[aria-label="再看一条旧记忆"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    expect(refetch).toHaveBeenCalled();

    await act(async () => {
      view.root.unmount();
    });
    view.host.remove();
  });
});
