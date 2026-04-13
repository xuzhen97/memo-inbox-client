import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiClientContext } from "../api/ApiClientContext";
import { AppConfigContext } from "../config/AppConfigContext";
import { DesktopMemoEdit } from "../screens/DesktopMemoEdit";

const useMemoMock = vi.fn();
const useUpdateMemoMock = vi.fn();
const mutateAsyncMock = vi.fn();

vi.mock("@memo-inbox/api-client", () => ({
  useMemo: (...args: unknown[]) => useMemoMock(...args),
  useUpdateMemo: (...args: unknown[]) => useUpdateMemoMock(...args)
}));

function setTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  setter?.call(textarea, value);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mutateAsyncMock.mockReset();
});

function createMemoFixture() {
  return {
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
  };
}

describe("DesktopMemoEdit save", () => {
  it("submits JSON-style input for content-only changes and returns to list", async () => {
    useMemoMock.mockReturnValue({
      data: createMemoFixture(),
      isLoading: false
    });
    mutateAsyncMock.mockResolvedValue(createMemoFixture());
    useUpdateMemoMock.mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false
    });

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
      setTextareaValue(textarea, "只改正文");
    }

    await act(async () => {
      host.querySelector('button[aria-label="保存 memo"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      memoId: "memo-1",
      input: {
        content: "只改正文",
        tags: ["工作", "灵感"]
      }
    });
    expect(window.location.pathname).toBe("/");

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it("submits keepAttachmentUrls and files when attachments change", async () => {
    const createObjectURLMock = vi.fn((file: File) => `blob:${file.name}`);
    Object.defineProperty(URL, "createObjectURL", {
      value: createObjectURLMock,
      configurable: true
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      value: vi.fn(),
      configurable: true
    });

    useMemoMock.mockReturnValue({
      data: createMemoFixture(),
      isLoading: false
    });
    mutateAsyncMock.mockResolvedValue(createMemoFixture());
    useUpdateMemoMock.mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false
    });

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
      host.querySelector('button[aria-label="移除已有附件"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const fileInput = host.querySelector('input[type="file"]') as HTMLInputElement | null;
    const newFile = new File(["new image"], "new.png", { type: "image/png" });
    Object.defineProperty(fileInput, "files", {
      value: [newFile],
      configurable: true
    });

    await act(async () => {
      fileInput?.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await act(async () => {
      host.querySelector('button[aria-label="保存 memo"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      memoId: "memo-1",
      input: {
        content: "这是原始正文",
        tags: ["工作", "灵感"],
        keepAttachmentUrls: [],
        files: [newFile]
      }
    });

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it("submits edited tags when tags are added and removed", async () => {
    useMemoMock.mockReturnValue({
      data: createMemoFixture(),
      isLoading: false
    });
    mutateAsyncMock.mockResolvedValue(createMemoFixture());
    useUpdateMemoMock.mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false
    });

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
      host.querySelector('button[aria-label="移除标签 灵感"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
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

    await act(async () => {
      host.querySelector('button[aria-label="保存 memo"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      memoId: "memo-1",
      input: {
        content: "这是原始正文",
        tags: ["工作", "复盘"]
      }
    });

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });
});
