import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MobileReview } from "../screens/MobileReview";
import { TestProviders } from "./testProviders";

const useReviewRandomMemoMock = vi.fn();

vi.mock("@memo-inbox/api-client", () => ({
  useReviewRandomMemo: (...args: unknown[]) => useReviewRandomMemoMock(...args),
}));

function renderMobileReview() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);

  return {
    host,
    root,
    render: async () => {
      await act(async () => {
        root.render(
          <TestProviders>
            <MobileReview />
          </TestProviders>
        );
      });
    },
  };
}

describe("MobileReview", () => {
  beforeEach(() => {
    useReviewRandomMemoMock.mockReset();
  });

  it("renders review attachments from string urls and opens the lightbox preview", async () => {
    useReviewRandomMemoMock.mockReturnValue({
      data: {
        memoId: "memo-1",
        header: { date: "2026-04-10", maidName: "tester" },
        content: "旧记忆内容",
        attachments: ["/images/review-1.png", "/images/review-2.png"],
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
      refetch: vi.fn(),
    });

    const view = renderMobileReview();
    await view.render();

    const previews = view.host.querySelectorAll('[data-testid="mobile-review-attachments"] button');
    expect(previews.length).toBe(2);
    expect(view.host.querySelector('img[src="http://localhost:3000/images/review-1.png"]')).not.toBeNull();

    await act(async () => {
      previews[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.host.querySelector('[data-testid="mobile-review-lightbox"]')).not.toBeNull();
    expect(
      view.host.querySelector('img[data-testid="mobile-review-lightbox-image"]')?.getAttribute("src")
    ).toBe("http://localhost:3000/images/review-1.png");

    await act(async () => {
      view.root.unmount();
    });
    view.host.remove();
  });
});
