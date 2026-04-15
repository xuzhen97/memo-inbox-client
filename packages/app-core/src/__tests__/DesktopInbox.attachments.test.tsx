import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import { DesktopInbox } from "../screens/DesktopInbox";
import { TestProviders } from "./testProviders";

vi.mock("@memo-inbox/api-client", () => ({
  useInfiniteMemoList: vi.fn(() => ({
    data: {
      pages: [
        {
          items: [
            {
              memoId: "memo-1",
              header: { date: "2026-04-12", maidName: "tester" },
              content: "需要展示图片的 memo",
              attachments: [
                {
                  imageId: "image-1",
                  url: "/images/memo-inbox/original.png",
                  mimeType: "image/png",
                  relativePath: "memo-inbox/original.png"
                },
                {
                  imageId: "image-2",
                  url: "/images/memo-inbox/second.png",
                  mimeType: "image/png",
                  relativePath: "memo-inbox/second.png"
                },
                {
                  imageId: "image-3",
                  url: "/images/memo-inbox/third.png",
                  mimeType: "image/png",
                  relativePath: "memo-inbox/third.png"
                }
              ],
              tags: ["工作"],
              meta: { memoId: "memo-1" },
              createdAt: "2026-04-12T10:00:00.000Z",
              updatedAt: "2026-04-12T10:00:00.000Z",
              deleted: false,
              filename: "memo-1.md"
            }
          ],
          nextCursor: null,
          total: 1
        }
      ]
    },
    isLoading: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    hasNextPage: false
  })),
  useCreateMemo: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false
  })),
  useRemoveMemo: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false
  }))
}));

describe("DesktopInbox attachments", () => {
  it("resolves attachment urls from the configured api url", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(
        <TestProviders>
          <DesktopInbox />
        </TestProviders>
      );
    });

    expect(host.querySelector('img[src="http://localhost:3000/images/memo-inbox/original.png"]')).not.toBeNull();
    expect(host.textContent).toContain("2026-04-12 18:00");

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it("renders attachment thumbnails and opens a lightbox that can switch images", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(
        <TestProviders>
          <DesktopInbox />
        </TestProviders>
      );
    });

    expect(host.querySelectorAll('[data-testid="memo-attachment-thumbnail"]').length).toBe(3);

    await act(async () => {
      host.querySelectorAll('[data-testid="memo-attachment-thumbnail"]')[1]?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });

    expect(host.querySelector('[data-testid="memo-lightbox"]')).not.toBeNull();
    expect(host.querySelector('img[data-testid="memo-lightbox-image"]')?.getAttribute("src")).toBe(
      "http://localhost:3000/images/memo-inbox/second.png"
    );

    await act(async () => {
      host.querySelector('button[aria-label="查看下一张图片"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });

    expect(host.querySelector('img[data-testid="memo-lightbox-image"]')?.getAttribute("src")).toBe(
      "http://localhost:3000/images/memo-inbox/third.png"
    );

    await act(async () => {
      host.querySelector('button[aria-label="关闭图片预览"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });

    expect(host.querySelector('[data-testid="memo-lightbox"]')).toBeNull();

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it("uses compact square thumbnails inside memo cards", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(
        <TestProviders>
          <DesktopInbox />
        </TestProviders>
      );
    });

    const thumbnails = Array.from(
      host.querySelectorAll('[data-testid="memo-attachment-thumbnail"]')
    ) as HTMLButtonElement[];

    expect(thumbnails.length).toBeGreaterThan(0);
    expect(thumbnails.every((thumbnail) => thumbnail.className.includes("aspect-square"))).toBe(true);
    expect(
      host.querySelector('[data-testid="memo-attachment-grid"]')?.className.includes("max-w-[360px]")
    ).toBe(true);

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });
});
