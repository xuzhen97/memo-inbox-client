import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MobileInbox } from "../screens/MobileInbox";
import { TestProviders } from "./testProviders";

const useInfiniteMemoListMock = vi.fn();
const useCreateMemoMock = vi.fn();
const useRemoveMemoMock = vi.fn();

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
              content: "第一条带图 memo",
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

  return { host, root };
}

describe("MobileInbox enhancements", () => {
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

    await act(async () => {
      view.root.unmount();
    });
    view.host.remove();
  });

  it("shows lightbox page indicator and updates image when navigating", async () => {
    const view = await renderMobileInbox();

    await act(async () => {
      const previewImage = view.host.querySelector('img[src="http://localhost:3000/images/1.png"]');
      previewImage?.closest("button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
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

    await act(async () => {
      view.root.unmount();
    });
    view.host.remove();
  });

  it("does not crash when dragging after double-tap zoom", async () => {
    const view = await renderMobileInbox();

    await act(async () => {
      const previewImage = view.host.querySelector('img[src="http://localhost:3000/images/1.png"]');
      previewImage?.closest("button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const lightboxImage = view.host.querySelector('[data-testid="mobile-lightbox-image"]') as HTMLImageElement | null;
    expect(lightboxImage).not.toBeNull();

    await act(async () => {
      lightboxImage?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      lightboxImage?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

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

    expect(view.host.querySelector('[data-testid="mobile-lightbox-image"]')).not.toBeNull();

    await act(async () => {
      view.root.unmount();
    });
    view.host.remove();
  });
});
