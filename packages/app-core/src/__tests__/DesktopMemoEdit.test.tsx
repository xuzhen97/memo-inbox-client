import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiClientContext } from "../api/ApiClientContext";
import { AppConfigContext } from "../config/AppConfigContext";
import { DesktopMemoEdit } from "../screens/DesktopMemoEdit";

const useMemoMock = vi.fn();
const useUpdateMemoMock = vi.fn();

vi.mock("@memo-inbox/api-client", () => ({
  useMemo: (...args: unknown[]) => useMemoMock(...args),
  useUpdateMemo: (...args: unknown[]) => useUpdateMemoMock(...args)
}));

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DesktopMemoEdit", () => {
  it("loads the memo by memoId and shows content, tags, and attachments", async () => {
    const apiClient = {} as never;
    useMemoMock.mockReturnValue({
      data: {
        memoId: "memo-1",
        header: { date: "2026-04-12", maidName: "tester" },
        content: "这是原始正文",
        attachments: [
          {
            imageId: "image-1",
            url: "/images/memo-inbox/original.png",
            mimeType: "image/png",
            relativePath: "memo-inbox/original.png"
          }
        ],
        tags: ["工作", "灵感"],
        meta: { memoId: "memo-1" },
        createdAt: "2026-04-12T10:00:00.000Z",
        updatedAt: "2026-04-12T10:00:00.000Z",
        deleted: false,
        filename: "memo-1.md"
      },
      isLoading: false
    });
    useUpdateMemoMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false
    });

    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(
        <AppConfigContext.Provider value={{ apiUrl: "http://localhost:3000" }}>
          <ApiClientContext.Provider value={apiClient}>
            <DesktopMemoEdit memoId="memo-1" />
          </ApiClientContext.Provider>
        </AppConfigContext.Provider>
      );
    });

    expect(useMemoMock).toHaveBeenCalledWith(apiClient, "memo-1");
    expect(host.textContent).toContain("这是原始正文");
    expect(host.textContent).toContain("工作");
    expect(host.textContent).toContain("灵感");
    expect(host.querySelector('img[src="http://localhost:3000/images/memo-inbox/original.png"]')).not.toBeNull();
    expect(host.textContent).toContain("创建时间：2026-04-12 18:00");
    expect(host.textContent).toContain("最后修改：2026-04-12 18:00");

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it("renders the edit page with app shell styling and avoids duplicate-key warnings for repeated tags", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    useMemoMock.mockReturnValue({
      data: {
        memoId: "memo-2",
        header: { date: "2026-04-12", maidName: "tester" },
        content: "测试正文",
        attachments: [],
        tags: ["工作", "工作"],
        meta: { memoId: "memo-2" },
        createdAt: "2026-04-12T10:00:00.000Z",
        updatedAt: "2026-04-12T10:00:00.000Z",
        deleted: false,
        filename: "memo-2.md"
      },
      isLoading: false
    });
    useUpdateMemoMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false
    });

    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(
        <AppConfigContext.Provider value={{ apiUrl: "http://localhost:3000" }}>
          <ApiClientContext.Provider value={{} as never}>
            <DesktopMemoEdit memoId="memo-2" />
          </ApiClientContext.Provider>
        </AppConfigContext.Provider>
      );
    });

    const main = host.querySelector("main");

    expect(main?.className).toContain("min-h-screen");
    expect(main?.className).toContain("bg-surface");
    expect(host.querySelector('img[src="http://localhost:3000/images/memo-inbox/original.png"]')).toBeNull();
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Each child in a list should have a unique \"key\" prop.")
    );

    await act(async () => {
      root.unmount();
    });
    host.remove();
    consoleErrorSpy.mockRestore();
  });

  it("renders existing attachments when the api returns plain string urls", async () => {
    useMemoMock.mockReturnValue({
      data: {
        memoId: "memo-3",
        header: { date: "2026-04-12", maidName: "tester" },
        content: "字符串附件",
        attachments: ["/images/memo-inbox/string-attachment.png"],
        tags: ["工作"],
        meta: { memoId: "memo-3" },
        createdAt: "2026-04-12T10:00:00.000Z",
        updatedAt: "2026-04-12T10:00:00.000Z",
        deleted: false,
        filename: "memo-3.md"
      },
      isLoading: false
    });
    useUpdateMemoMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false
    });

    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(
        <AppConfigContext.Provider value={{ apiUrl: "http://localhost:3000" }}>
          <ApiClientContext.Provider value={{} as never}>
            <DesktopMemoEdit memoId="memo-3" />
          </ApiClientContext.Provider>
        </AppConfigContext.Provider>
      );
    });

    expect(host.querySelector('img[src="http://localhost:3000/images/memo-inbox/string-attachment.png"]')).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it("allows removing and adding tags in the edit page", async () => {
    useMemoMock.mockReturnValue({
      data: {
        memoId: "memo-4",
        header: { date: "2026-04-12", maidName: "tester" },
        content: "标签编辑",
        attachments: [],
        tags: ["工作", "灵感"],
        meta: { memoId: "memo-4" },
        createdAt: "2026-04-12T10:00:00.000Z",
        updatedAt: "2026-04-12T10:00:00.000Z",
        deleted: false,
        filename: "memo-4.md"
      },
      isLoading: false
    });
    useUpdateMemoMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false
    });

    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(
        <AppConfigContext.Provider value={{ apiUrl: "http://localhost:3000" }}>
          <ApiClientContext.Provider value={{} as never}>
            <DesktopMemoEdit memoId="memo-4" />
          </ApiClientContext.Provider>
        </AppConfigContext.Provider>
      );
    });

    await act(async () => {
      host.querySelector('button[aria-label="移除标签 工作"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const tagInput = host.querySelector('input[aria-label="添加标签"]') as HTMLInputElement | null;
    await act(async () => {
      if (tagInput) {
        setInputValue(tagInput, "复盘");
      }
    });

    await act(async () => {
      host.querySelector('button[aria-label="确认添加标签"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(host.textContent).not.toContain("#工作");
    expect(host.textContent).toContain("#灵感");
    expect(host.textContent).toContain("#复盘");

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });
});
