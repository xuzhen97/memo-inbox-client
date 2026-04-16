# Desktop Inbox Back To Top And Mobile Review Attachments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为桌面端全部页增加按滚动阈值显示的回到顶部按钮，并让移动端每日回顾按收件箱一致方式正确展示并预览图片。

**Architecture:** 在 `DesktopInbox` 内部新增最小滚动状态与回顶按钮，不改动其他桌面页面。将移动端回顾页的附件解析与缩略图/灯箱入口对齐到已有移动收件箱行为，必要时抽取一个很小的附件工具以消除重复并兼容对象或字符串附件。

**Tech Stack:** React 19, TypeScript, Vitest, jsdom, lucide-react, Tailwind utility classes

---

### Task 1: 先补失败测试锁定行为

**Files:**
- Modify: `packages/app-core/src/__tests__/DesktopInbox.attachments.test.tsx`
- Create: `packages/app-core/src/__tests__/MobileReview.test.tsx`

- [ ] **Step 1: 为桌面收件箱写回顶按钮失败测试**

```tsx
it("shows a back-to-top button after scrolling and scrolls to the top when clicked", async () => {
  const scrollToMock = vi.fn();
  Object.defineProperty(window, "scrollTo", {
    configurable: true,
    writable: true,
    value: scrollToMock,
  });

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

  expect(host.querySelector('[data-testid="desktop-inbox-back-to-top"]')).toBeNull();

  await act(async () => {
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: 500,
    });
    window.dispatchEvent(new Event("scroll"));
  });

  const backToTop = host.querySelector('[data-testid="desktop-inbox-back-to-top"]');
  expect(backToTop).not.toBeNull();

  await act(async () => {
    backToTop?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
});
```

- [ ] **Step 2: 运行桌面收件箱测试并确认失败**

Run: `pnpm --filter @memo-inbox/app-core test -- src/__tests__/DesktopInbox.attachments.test.tsx`
Expected: FAIL，因为当前没有 `desktop-inbox-back-to-top` 元素，也没有回顶行为。

- [ ] **Step 3: 为移动回顾写图片展示与预览失败测试**

```tsx
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
  expect(
    view.host.querySelector('img[src="http://localhost:3000/images/review-1.png"]')
  ).not.toBeNull();

  await act(async () => {
    previews[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  expect(view.host.querySelector('[data-testid="mobile-review-lightbox"]')).not.toBeNull();
  expect(
    view.host.querySelector('img[data-testid="mobile-review-lightbox-image"]')?.getAttribute("src")
  ).toBe("http://localhost:3000/images/review-1.png");
});
```

- [ ] **Step 4: 运行移动回顾测试并确认失败**

Run: `pnpm --filter @memo-inbox/app-core test -- src/__tests__/MobileReview.test.tsx`
Expected: FAIL，因为当前没有 `MobileReview` 测试文件，且现有回顾页对字符串附件兼容和测试标识都不完整。

### Task 2: 最小实现桌面回顶与移动回顾图片兼容

**Files:**
- Modify: `packages/app-core/src/screens/DesktopInbox.tsx`
- Modify: `packages/app-core/src/screens/MobileReview.tsx`
- Create: `packages/app-core/src/utils/memoAttachmentUrls.ts`

- [ ] **Step 1: 抽取最小附件 URL 工具**

```ts
export function normalizeMemoAttachmentUrl(attachment: unknown) {
  if (typeof attachment === "string") return attachment;
  if (attachment && typeof attachment === "object" && "url" in attachment) {
    const url = (attachment as { url?: unknown }).url;
    return typeof url === "string" ? url : "";
  }
  return "";
}

export function resolveMemoAttachmentUrl(baseUrl: string, url?: string) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}
```

- [ ] **Step 2: 在桌面收件箱实现最小回顶按钮**

```tsx
const [showBackToTop, setShowBackToTop] = React.useState(false);

React.useEffect(() => {
  const handleScroll = () => setShowBackToTop(window.scrollY > 360);
  handleScroll();
  window.addEventListener("scroll", handleScroll, { passive: true });
  return () => window.removeEventListener("scroll", handleScroll);
}, []);

const handleBackToTop = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
};
```

并在 JSX 末尾追加：

```tsx
{showBackToTop ? (
  <button
    type="button"
    data-testid="desktop-inbox-back-to-top"
    aria-label="回到顶部"
    className="fixed bottom-8 right-8 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg transition hover:scale-[1.03]"
    onClick={handleBackToTop}
  >
    <ChevronUp size={18} />
  </button>
) : null}
```

- [ ] **Step 3: 在移动回顾接入共享附件工具并补齐测试标识**

```tsx
const attachmentUrls = data.attachments.map(normalizeMemoAttachmentUrl).filter(Boolean);

<div data-testid="mobile-review-attachments" className={`grid ${gridColsClass} max-w-[280px] gap-2`}>
  ...
</div>

<div data-testid="mobile-review-lightbox" ...>
  <img data-testid="mobile-review-lightbox-image" ... />
</div>
```

- [ ] **Step 4: 运行两组测试确认转绿**

Run: `pnpm --filter @memo-inbox/app-core test -- src/__tests__/DesktopInbox.attachments.test.tsx src/__tests__/MobileReview.test.tsx`
Expected: PASS

### Task 3: 完成验证并检查范围

**Files:**
- Modify: `packages/app-core/src/__tests__/DesktopInbox.attachments.test.tsx`
- Modify: `packages/app-core/src/__tests__/MobileReview.test.tsx`
- Modify: `packages/app-core/src/screens/DesktopInbox.tsx`
- Modify: `packages/app-core/src/screens/MobileReview.tsx`
- Create: `packages/app-core/src/utils/memoAttachmentUrls.ts`

- [ ] **Step 1: 运行 app-core 定向测试**

Run: `pnpm --filter @memo-inbox/app-core test -- src/__tests__/DesktopInbox.attachments.test.tsx src/__tests__/MobileReview.test.tsx`
Expected: PASS with 0 failures

- [ ] **Step 2: 运行类型检查**

Run: `pnpm --filter @memo-inbox/app-core typecheck`
Expected: PASS

- [ ] **Step 3: 检查 git 变更范围**

Run: `git -C "D:/vcp-hub/memo-inbox-client" diff -- packages/app-core/src/screens/DesktopInbox.tsx packages/app-core/src/screens/MobileReview.tsx packages/app-core/src/utils/memoAttachmentUrls.ts packages/app-core/src/__tests__/DesktopInbox.attachments.test.tsx packages/app-core/src/__tests__/MobileReview.test.tsx docs/superpowers/plans/2026-04-16-desktop-inbox-back-to-top-and-mobile-review-attachments.md`
Expected: 只出现预期文件改动
