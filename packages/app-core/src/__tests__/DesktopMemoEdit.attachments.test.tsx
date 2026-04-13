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

describe("DesktopMemoEdit attachments", () => {
  it("removes kept attachments and manages new file previews", async () => {
    const createObjectURLMock = vi.fn((file: File) => `blob:${file.name}`);
    const revokeObjectURLMock = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      value: createObjectURLMock,
      configurable: true
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      value: revokeObjectURLMock,
      configurable: true
    });

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
        tags: ["工作"],
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
          <ApiClientContext.Provider value={{} as never}>
            <DesktopMemoEdit memoId="memo-1" />
          </ApiClientContext.Provider>
        </AppConfigContext.Provider>
      );
    });

    expect(host.querySelector('img[src="http://localhost:3000/images/memo-inbox/original.png"]')).not.toBeNull();

    await act(async () => {
      host.querySelector('button[aria-label="移除已有附件"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(host.querySelector('img[src="http://localhost:3000/images/memo-inbox/original.png"]')).toBeNull();

    const fileInput = host.querySelector('input[type="file"]') as HTMLInputElement | null;
    const newFile = new File(["new image"], "new.png", { type: "image/png" });
    Object.defineProperty(fileInput, "files", {
      value: [newFile],
      configurable: true
    });

    await act(async () => {
      fileInput?.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(createObjectURLMock).toHaveBeenCalledWith(newFile);
    expect(host.querySelector('img[src="blob:new.png"]')).not.toBeNull();

    await act(async () => {
      host
        .querySelector('button[aria-label="移除新增附件 new.png"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(host.querySelector('img[src="blob:new.png"]')).toBeNull();
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:new.png");

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });
});
