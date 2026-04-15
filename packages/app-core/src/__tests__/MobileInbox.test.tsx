import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MobileInbox } from "../screens/MobileInbox";
import { TestProviders } from "./testProviders";

const useInfiniteMemoListMock = vi.fn();
const useCreateMemoMock = vi.fn();
const useRemoveMemoMock = vi.fn();
const createObjectURLMock = vi.fn();
const revokeObjectURLMock = vi.fn();

vi.mock("@memo-inbox/api-client", () => ({
  useInfiniteMemoList: (...args: unknown[]) => useInfiniteMemoListMock(...args),
  useCreateMemo: (...args: unknown[]) => useCreateMemoMock(...args),
  useRemoveMemo: (...args: unknown[]) => useRemoveMemoMock(...args),
}));

function buildListResult() {
  return {
    data: {
      pages: [
        {
          items: [
            {
              memoId: "memo-1",
              header: { date: "2026-04-15", maidName: "tester" },
              content:
                "https://example.com/" +
                "superlongsegment".repeat(12) +
                "\n" +
                "连续内容".repeat(40),
              attachments: [
                {
                  imageId: "image-1",
                  url: "/images/1.png",
                  mimeType: "image/png",
                  relativePath: "images/1.png",
                },
                {
                  imageId: "image-2",
                  url: "/images/2.png",
                  mimeType: "image/png",
                  relativePath: "images/2.png",
                },
              ],
              tags: ["工作", "灵感"],
              meta: { memoId: "memo-1" },
              createdAt: "2026-04-15T10:00:00.000Z",
              updatedAt: "2026-04-15T10:00:00.000Z",
              deleted: false,
              filename: "memo-1.md",
            },
          ],
          nextCursor: null,
          total: 1,
        },
      ],
    },
    isLoading: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    refetch: vi.fn(),
  };
}

async function renderMobileInbox() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);

  await act(async () => {
    root.render(
      <TestProviders>
        <MobileInbox />
      </TestProviders>,
    );
  });

  currentHost = host;
  currentRoot = root;
  return { host, root };
}

let currentHost: HTMLDivElement | null = null;
let currentRoot: Root | null = null;

describe("MobileInbox enhancements", () => {
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

  beforeEach(() => {
    useInfiniteMemoListMock.mockReset();
    useCreateMemoMock.mockReset();
    useRemoveMemoMock.mockReset();

    useInfiniteMemoListMock.mockReturnValue(buildListResult());
    useCreateMemoMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useRemoveMemoMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    createObjectURLMock.mockReset();
    revokeObjectURLMock.mockReset();
    createObjectURLMock.mockReturnValue("blob:mock-preview-1");
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: createObjectURLMock,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: revokeObjectURLMock,
    });
  });

  it("renders an empty followed-tag prompt for mobile management", async () => {
    const view = await renderMobileInbox();

    expect(view.host.textContent).toContain("关注标签");
    expect(view.host.textContent).not.toContain("添加常用标签");
    expect(view.host.textContent).not.toContain("点标签筛选，点 x 移除");
    expect(view.host.querySelector('button[aria-label="展开关注标签"]')).not.toBeNull();

    const recordButton = Array.from(view.host.querySelectorAll("button")).find((node) =>
      node.textContent?.includes("记录这条想法"),
    );
    const followToggleButton = view.host.querySelector('button[aria-label="展开关注标签"]');

    expect(recordButton).not.toBeNull();
    expect(followToggleButton).not.toBeNull();
    expect(
      (recordButton?.compareDocumentPosition(followToggleButton as Node) ?? 0) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

  });

  it("shows lightbox page indicator and updates image when navigating", async () => {
    const view = await renderMobileInbox();

    const firstPreviewButton = view.host.querySelector('[data-testid="mobile-memo-attachments"] button');
    expect(firstPreviewButton).not.toBeNull();

    await act(async () => {
      firstPreviewButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.host.textContent).toContain("1 / 2");
    expect(view.host.querySelector('[data-testid="mobile-lightbox-image"]')?.getAttribute("src")).toContain("/images/1.png");

    await act(async () => {
      view.host.querySelector('button[aria-label="查看下一张图片"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    expect(view.host.textContent).toContain("2 / 2");
    expect(view.host.querySelector('[data-testid="mobile-lightbox-image"]')?.getAttribute("src")).toContain("/images/2.png");

  });

  it("does not crash when dragging after double-tap zoom", async () => {
    const view = await renderMobileInbox();

    const firstPreviewButton = view.host.querySelector('[data-testid="mobile-memo-attachments"] button');
    expect(firstPreviewButton).not.toBeNull();

    await act(async () => {
      firstPreviewButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const lightboxImage = view.host.querySelector('[data-testid="mobile-lightbox-image"]') as HTMLImageElement | null;
    expect(lightboxImage).not.toBeNull();

    await act(async () => {
      lightboxImage?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      lightboxImage?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const zoomedTransform = lightboxImage?.style.transform ?? "";
    expect(zoomedTransform).toContain("scale(2)");

    const lightbox = view.host.querySelector('[data-testid="mobile-lightbox"]') as HTMLDivElement | null;
    expect(lightbox).not.toBeNull();

    await act(async () => {
      lightbox?.dispatchEvent(new TouchEvent("touchstart", {
        bubbles: true,
        touches: [{ clientX: 120, clientY: 140 } as Touch],
        changedTouches: [{ clientX: 120, clientY: 140 } as Touch],
      }));
      lightbox?.dispatchEvent(new TouchEvent("touchmove", {
        bubbles: true,
        touches: [{ clientX: 150, clientY: 170 } as Touch],
        changedTouches: [{ clientX: 150, clientY: 170 } as Touch],
      }));
    });

    const draggedTransform = lightboxImage?.style.transform ?? "";
    expect(draggedTransform).not.toEqual(zoomedTransform);
    expect(draggedTransform).toContain("translate(");
    expect(draggedTransform).not.toContain("translate(0px, 0px)");

  });

  it("keeps mobile memo content and attachments constrained for long text", async () => {
    const view = await renderMobileInbox();

    const row = view.host.querySelector('[data-testid="mobile-memo-row"]');
    const content = view.host.querySelector('[data-testid="mobile-memo-content"]');
    const datetime = view.host.querySelector('[data-testid="mobile-memo-datetime"]');
    const text = view.host.querySelector('[data-testid="mobile-memo-text"]');
    const attachments = view.host.querySelector('[data-testid="mobile-memo-attachments"]');

    expect(row).not.toBeNull();
    expect(content).not.toBeNull();
    expect(datetime).not.toBeNull();
    expect(text).not.toBeNull();
    expect(attachments).not.toBeNull();

    expect(row?.className).toContain("flex-col");
    expect(content?.className).toContain("min-w-0");
    expect(datetime?.textContent).toContain("2026-04-15 18:00");
    expect(text?.className).toContain("break-words");
    expect(text?.className).toContain("[overflow-wrap:anywhere]");
    expect(attachments?.className).toContain("max-w-full");
    expect(view.host.textContent).not.toContain("6:00 PM");

  });

  it("keeps mobile memo tags and actions wrapped under narrow width", async () => {
    const view = await renderMobileInbox();

    const tagRow = view.host.querySelector('[data-testid="mobile-memo-tags"]');
    const actionRow = view.host.querySelector('[data-testid="mobile-memo-actions"]');

    expect(tagRow).not.toBeNull();
    expect(actionRow).not.toBeNull();

    expect(tagRow?.className).toContain("flex-wrap");
    expect(actionRow?.className).toContain("flex-wrap");
    expect(actionRow?.className).toContain("min-w-0");
  });

  it("keeps delete confirmation actions wrapped under narrow width", async () => {
    const view = await renderMobileInbox();

    const deleteButton = Array.from(view.host.querySelectorAll("button")).find((node) =>
      node.textContent?.includes("删除"),
    );
    expect(deleteButton).not.toBeNull();

    await act(async () => {
      deleteButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.host.textContent).toContain("移入回收站?");

    const deleteConfirmActions = view.host.querySelector('[data-testid="mobile-memo-delete-actions"]');
    expect(deleteConfirmActions).not.toBeNull();
    expect(deleteConfirmActions?.className).toContain("flex-wrap");
    expect(deleteConfirmActions?.className).toContain("min-w-0");
  });

  it("revokes object urls after send success", async () => {
    const view = await renderMobileInbox();

    const fileInput = view.host.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();

    const file = new File(["img"], "demo.png", { type: "image/png" });
    Object.defineProperty(fileInput as HTMLInputElement, "files", {
      configurable: true,
      value: [file],
    });

    await act(async () => {
      fileInput?.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const sendButton = Array.from(view.host.querySelectorAll("button")).find((node) =>
      node.textContent?.includes("记录这条想法"),
    );
    expect(sendButton).not.toBeNull();

    await act(async () => {
      sendButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:mock-preview-1");
  });

  it("revokes remaining object urls on unmount", async () => {
    const view = await renderMobileInbox();

    const fileInput = view.host.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();

    const file = new File(["img"], "demo.png", { type: "image/png" });
    Object.defineProperty(fileInput as HTMLInputElement, "files", {
      configurable: true,
      value: [file],
    });

    await act(async () => {
      fileInput?.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(revokeObjectURLMock).not.toHaveBeenCalled();

    await act(async () => {
      view.root.unmount();
    });

    currentRoot = null;

    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:mock-preview-1");
  });
});
