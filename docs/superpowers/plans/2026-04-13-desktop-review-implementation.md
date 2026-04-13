# Desktop Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `memo-inbox-client` 的桌面端补上独立的“回顾”页、顶部导航真实跳转与选中态，并严格复用当前 `review.random` 轻量接口实现“重温一条旧 memo”。

**Architecture:** 在 `packages/app-core` 内新增一个共享桌面头部组件和一个 `DesktopReview` 页面，复用现有路由事件机制完成 `/` 与 `/review` 切换。数据层保持诚实边界，只新增一个很薄的 `useReviewRandomMemo` hook 包装 `apiClient.review.random()`，不引入 `daily`、伪随机、回顾历史或归档页。

**Tech Stack:** React 19、TypeScript、TanStack Query、Vitest、Vite、GitNexus

---

## File Structure

- Modify: `memo-inbox-client/packages/app-core/src/router/createAppRouter.tsx`
  - 责任：新增 `/review` 路由，并保持现有 `appNavigateEvent` 路由同步机制
- Create: `memo-inbox-client/packages/app-core/src/screens/DesktopReview.tsx`
  - 责任：承载回顾页的加载、成功、空、失败四类状态与“换一条”动作
- Modify: `memo-inbox-client/packages/app-core/src/screens/DesktopInbox.tsx`
  - 责任：接入共享头部组件，保留现有首页搜索与 memo 流能力
- Create: `memo-inbox-client/packages/app-core/src/components/DesktopShellHeader.tsx`
  - 责任：统一桌面头部布局、导航按钮、选中态和路由跳转
- Create: `memo-inbox-client/packages/app-core/src/__tests__/DesktopReview.test.tsx`
  - 责任：覆盖回顾页成功、空、失败、刷新动作
- Create: `memo-inbox-client/packages/app-core/src/__tests__/DesktopShellHeader.test.tsx`
  - 责任：覆盖顶部导航选中态、跳转行为、归档占位态
- Modify: `memo-inbox-client/packages/app-core/src/__tests__/createAppRouter.test.tsx`
  - 责任：补齐 `/review` 路由测试
- Modify: `memo-inbox-client/packages/api-client/src/hooks.ts`
  - 责任：新增 `useReviewRandomMemo` query hook，保持 `api-client` 作为 Query 边界

## Task 0: 先做 GitNexus 影响分析

**Files:**
- Modify: `memo-inbox-client/packages/app-core/src/router/createAppRouter.tsx`
- Modify: `memo-inbox-client/packages/app-core/src/screens/DesktopInbox.tsx`
- Modify: `memo-inbox-client/packages/api-client/src/hooks.ts`

- [ ] **Step 1: 分析 `createAppRouter` 的上游影响**

Run tool:

```text
gitnexus_impact({
  repo: "memo-inbox-client",
  target: "createAppRouter",
  direction: "upstream"
})
```

Expected: 返回使用该路由装配的调用方与受影响流程；风险应可控。若为 HIGH/CRITICAL，先记录受影响点再继续。

- [ ] **Step 2: 分析 `DesktopInbox` 的上游影响**

Run tool:

```text
gitnexus_impact({
  repo: "memo-inbox-client",
  target: "DesktopInbox",
  direction: "upstream"
})
```

Expected: 识别桌面首页与相关测试文件；确认变更会波及现有编辑入口、删除交互和附件展示测试。

- [ ] **Step 3: 分析 `hooks.ts` 的上游影响**

Run tool:

```text
gitnexus_impact({
  repo: "memo-inbox-client",
  target: "hooks.ts",
  direction: "upstream"
})
```

Expected: 主要影响 `api-client` 导出和消费它的页面层；若风险偏高，保持修改范围仅限新增 hook，不重构现有 hook。

- [ ] **Step 4: 记录 blast radius**

在工作笔记或最终汇报中记录：

```text
- createAppRouter：风险等级、直接调用方、受影响流程
- DesktopInbox：风险等级、直接调用方、现有测试影响
- hooks.ts：风险等级、导出影响范围
```

## Task 1: 先让路由测试失败，再补上 `/review`

**Files:**
- Modify: `memo-inbox-client/packages/app-core/src/__tests__/createAppRouter.test.tsx`
- Modify: `memo-inbox-client/packages/app-core/src/router/createAppRouter.tsx`

- [ ] **Step 1: 在路由测试里加入 `/review` 失败用例**

```tsx
vi.mock("../screens/DesktopReview", () => ({
  DesktopReview() {
    return <div>重温旧记忆页面</div>;
  }
}));

it("renders DesktopReview for /review", async () => {
  const { host, root } = await renderRouterAt("/review");

  expect(host.textContent).toContain("重温旧记忆页面");

  await act(async () => {
    root.unmount();
  });
  host.remove();
});
```

- [ ] **Step 2: 运行单测确认失败**

Run:

```bash
pnpm --filter "@memo-inbox/app-core" test -- src/__tests__/createAppRouter.test.tsx
```

Expected: FAIL，失败原因应为 `/review` 仍然落到 `ShellHomePage`，或者 `DesktopReview` 尚未被路由分发。

- [ ] **Step 3: 在路由装配里新增 `/review` 分支**

```tsx
import { DesktopReview } from "../screens/DesktopReview";

function renderRoute(pathname: string) {
  const editMatch = pathname.match(/^\/memos\/([^/]+)\/edit\/?$/);

  if (editMatch) {
    return <DesktopMemoEdit memoId={decodeURIComponent(editMatch[1])} />;
  }

  if (pathname === "/review") {
    return <DesktopReview />;
  }

  if (pathname === "/") {
    return <DesktopInbox />;
  }

  return <ShellHomePage />;
}
```

- [ ] **Step 4: 重新运行路由测试确认通过**

Run:

```bash
pnpm --filter "@memo-inbox/app-core" test -- src/__tests__/createAppRouter.test.tsx
```

Expected: PASS，`/` 仍然渲染 `DesktopInbox`，`/review` 渲染 `DesktopReview`，`/memos/:memoId/edit` 不回归。

## Task 2: 先写共享头部测试，再提取桌面导航

**Files:**
- Create: `memo-inbox-client/packages/app-core/src/components/DesktopShellHeader.tsx`
- Create: `memo-inbox-client/packages/app-core/src/__tests__/DesktopShellHeader.test.tsx`
- Modify: `memo-inbox-client/packages/app-core/src/screens/DesktopInbox.tsx`

- [ ] **Step 1: 写共享头部的失败测试**

```tsx
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";

import { DesktopShellHeader } from "../components/DesktopShellHeader";
import { appNavigateEvent } from "../router/createAppRouter";

async function renderHeader(pathname: string, activeTab: "all" | "review") {
  const host = document.createElement("div");
  document.body.appendChild(host);
  window.history.replaceState({}, "", pathname);
  const root = createRoot(host);

  await act(async () => {
    root.render(
      <DesktopShellHeader
        activeTab={activeTab}
        centerSlot={<div data-testid="center-slot">center</div>}
      />
    );
  });

  return { host, root };
}

describe("DesktopShellHeader", () => {
  it("marks the active tab with aria-current", async () => {
    const { host, root } = await renderHeader("/review", "review");

    expect(host.querySelector('button[aria-current="page"]')?.textContent).toContain("回顾");

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it("navigates to / when clicking 全部", async () => {
    const events: string[] = [];
    window.addEventListener(appNavigateEvent, () => {
      events.push("navigate");
    });

    const { host, root } = await renderHeader("/review", "review");

    await act(async () => {
      host.querySelector('button[aria-label="前往全部页面"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });

    expect(window.location.pathname).toBe("/");
    expect(events).toEqual(["navigate"]);

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it("keeps 归档 as a disabled placeholder", async () => {
    const { host, root } = await renderHeader("/", "all");

    expect(host.querySelector('button[aria-label="归档暂未接入"]')?.hasAttribute("disabled")).toBe(true);

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });
});
```

- [ ] **Step 2: 运行共享头部测试并确认失败**

Run:

```bash
pnpm --filter "@memo-inbox/app-core" test -- src/__tests__/DesktopShellHeader.test.tsx
```

Expected: FAIL，失败原因应为 `DesktopShellHeader` 文件尚不存在。

- [ ] **Step 3: 实现共享头部组件**

```tsx
import * as React from "react";
import { Bell, Settings, User } from "lucide-react";

import { appNavigateEvent } from "../router/createAppRouter";

interface DesktopShellHeaderProps {
  activeTab: "all" | "review";
  centerSlot?: React.ReactNode;
}

function navigateTo(pathname: string) {
  if (window.location.pathname === pathname) {
    return;
  }

  window.history.pushState({}, "", pathname);
  window.dispatchEvent(new Event(appNavigateEvent));
}

export function DesktopShellHeader({ activeTab, centerSlot }: DesktopShellHeaderProps) {
  const tabClass = (tab: "all" | "review") =>
    activeTab === tab
      ? "text-primary font-bold"
      : "text-on-surface-variant/50 hover:text-primary transition-colors";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-surface/90 px-6 backdrop-blur-md lg:px-10">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary pb-0.5 font-bold text-white">
          M
        </div>
        <span className="ml-1 text-lg font-bold tracking-wide text-primary">记忆收件箱</span>
      </div>

      <div className="ml-10 flex w-full max-w-3xl items-center gap-12">
        <div className="flex-1">{centerSlot}</div>

        <nav className="flex gap-6 text-sm font-medium tracking-wide" aria-label="主导航">
          <button
            type="button"
            aria-label="前往全部页面"
            aria-current={activeTab === "all" ? "page" : undefined}
            className={tabClass("all")}
            onClick={() => navigateTo("/")}
          >
            全部
          </button>
          <button
            type="button"
            aria-label="前往回顾页面"
            aria-current={activeTab === "review" ? "page" : undefined}
            className={tabClass("review")}
            onClick={() => navigateTo("/review")}
          >
            回顾
          </button>
          <button
            type="button"
            aria-label="归档暂未接入"
            className="cursor-not-allowed text-on-surface-variant/35"
            disabled
          >
            归档
          </button>
        </nav>
      </div>

      <div className="ml-auto flex items-center gap-4 text-on-surface-variant">
        <Bell size={20} className="transition-colors hover:text-primary" />
        <Settings size={20} className="transition-colors hover:text-primary" />
        <div className="ml-2 h-8 w-8 overflow-hidden rounded-full border border-outline-variant/20 bg-surface-container-high shadow-sm">
          <User size={24} className="ml-1 mt-1 opacity-50" />
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: 在 `DesktopInbox` 中接入共享头部**

将原有 header 区块替换为：

```tsx
import { DesktopShellHeader } from "../components/DesktopShellHeader";

const inboxHeaderSlot = (
  <div className="flex bg-surface-container-low rounded-full h-10 px-4 items-center flex-1 max-w-md focus-within:ring-2 focus-within:ring-primary/20 transition-shadow">
    <Search size={16} className="text-on-surface-variant/40 mr-2" />
    <input
      type="text"
      placeholder="搜索记忆、标签或灵感..."
      className="w-full border-none bg-transparent text-sm text-primary outline-none placeholder:text-on-surface-variant/40"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          const match = searchQuery.match(/(?:^|\s)#([^\s#]+)/);
          if (match) {
            e.preventDefault();
            setSelectedTag(match[1]);
            setSearchQuery(searchQuery.replace(match[0], "").trim());
          }
        } else if (e.key === "Backspace" && searchQuery === "" && selectedTag) {
          setSelectedTag(undefined);
        }
      }}
    />
    {selectedTag ? (
      <div className="ml-2 flex flex-shrink-0 items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-primary">
        <span className="text-[11px] font-bold">#{selectedTag}</span>
        <X size={12} className="cursor-pointer opacity-70 hover:opacity-100" onClick={() => setSelectedTag(undefined)} />
      </div>
    ) : null}
  </div>
);

return (
  <div className="min-h-screen bg-surface text-on-surface font-sans flex flex-col">
    <DesktopShellHeader activeTab="all" centerSlot={inboxHeaderSlot} />
    <main className="flex-1 flex max-w-6xl mx-auto w-full px-6 py-10 gap-14">
      {/* existing content */}
    </main>
  </div>
);
```

- [ ] **Step 5: 重新运行共享头部与既有编辑入口测试**

Run:

```bash
pnpm --filter "@memo-inbox/app-core" test -- src/__tests__/DesktopShellHeader.test.tsx src/__tests__/DesktopInbox.edit-link.test.tsx
```

Expected: PASS，共享头部测试通过，首页原有编辑跳转测试不回归。

## Task 3: 先写回顾页测试，再实现随机回顾 hook 与页面

**Files:**
- Create: `memo-inbox-client/packages/app-core/src/__tests__/DesktopReview.test.tsx`
- Create: `memo-inbox-client/packages/app-core/src/screens/DesktopReview.tsx`
- Modify: `memo-inbox-client/packages/api-client/src/hooks.ts`

- [ ] **Step 1: 写回顾页失败测试**

```tsx
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { ApiClientContext } from "../api/ApiClientContext";
import { AppConfigContext } from "../config/AppConfigContext";
import { DesktopReview } from "../screens/DesktopReview";

const useReviewRandomMemoMock = vi.fn();

vi.mock("@memo-inbox/api-client", () => ({
  useReviewRandomMemo: (...args: unknown[]) => useReviewRandomMemoMock(...args)
}));

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
        filename: "memo-1.md"
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn()
    });

    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(
        <AppConfigContext.Provider value={{ apiUrl: "http://localhost:3000" }}>
          <ApiClientContext.Provider value={{} as never}>
            <DesktopReview />
          </ApiClientContext.Provider>
        </AppConfigContext.Provider>
      );
    });

    expect(host.textContent).toContain("重温旧记忆");
    expect(host.textContent).toContain("旧记忆内容");
    expect(host.textContent).toContain("#回看");

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it("renders the empty state for MEMO_NOT_FOUND", async () => {
    useReviewRandomMemoMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: { code: "MEMO_NOT_FOUND", message: "memo not found", status: 404 },
      refetch: vi.fn()
    });

    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(
        <AppConfigContext.Provider value={{ apiUrl: "http://localhost:3000" }}>
          <ApiClientContext.Provider value={{} as never}>
            <DesktopReview />
          </ApiClientContext.Provider>
        </AppConfigContext.Provider>
      );
    });

    expect(host.textContent).toContain("还没有可回顾的记忆");
    expect(host.querySelector('button[aria-label="返回全部页面"]')).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
    host.remove();
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
        filename: "memo-1.md"
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch
    });

    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(
        <AppConfigContext.Provider value={{ apiUrl: "http://localhost:3000" }}>
          <ApiClientContext.Provider value={{} as never}>
            <DesktopReview />
          </ApiClientContext.Provider>
        </AppConfigContext.Provider>
      );
    });

    await act(async () => {
      host.querySelector('button[aria-label="再看一条旧记忆"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });

    expect(refetch).toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });
});
```

- [ ] **Step 2: 运行回顾页测试并确认失败**

Run:

```bash
pnpm --filter "@memo-inbox/app-core" test -- src/__tests__/DesktopReview.test.tsx
```

Expected: FAIL，失败原因应为 `DesktopReview` 文件尚不存在。

- [ ] **Step 3: 在 `api-client` 新增随机回顾 hook**

```ts
export function useReviewRandomMemo(apiClient: ApiClient) {
  return useQuery({
    queryKey: [...queryKeys.memos, "review", "random"],
    queryFn: () => apiClient.review.random(),
  });
}
```

- [ ] **Step 4: 实现 `DesktopReview` 页面**

```tsx
import * as React from "react";
import { Loader2, RefreshCcw } from "lucide-react";
import { useReviewRandomMemo } from "@memo-inbox/api-client";

import { useApiClient } from "../api/ApiClientContext";
import { useAppConfig } from "../config/AppConfigContext";
import { appNavigateEvent } from "../router/createAppRouter";
import { formatDateTime } from "../utils/formatDateTime";
import { DesktopShellHeader } from "../components/DesktopShellHeader";

function resolveAttachmentUrl(baseUrl: string, url?: string) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

function navigateToInbox() {
  window.history.pushState({}, "", "/");
  window.dispatchEvent(new Event(appNavigateEvent));
}

export function DesktopReview() {
  const apiClient = useApiClient();
  const { apiUrl } = useAppConfig();
  const { data, isLoading, isFetching, error, refetch } = useReviewRandomMemo(apiClient);

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans flex flex-col">
      <DesktopShellHeader
        activeTab="review"
        centerSlot={<div className="h-10 max-w-md rounded-full bg-surface-container-low/70" />}
      />

      <main className="mx-auto flex w-full max-w-6xl flex-1 gap-14 px-6 py-10">
        <div className="flex-1 max-w-3xl">
          <div className="mb-8">
            <h1 className="mb-3 text-4xl font-serif font-bold italic tracking-tight text-primary">重温旧记忆</h1>
            <p className="text-[13px] tracking-wide text-on-surface-variant">
              偶尔回看一条旧记录，让一些片段重新浮现。
            </p>
          </div>

          {isLoading ? (
            <div className="rounded-[24px] bg-surface-container-low p-8">正在取一条旧记忆...</div>
          ) : error && (error as { code?: string }).code === "MEMO_NOT_FOUND" ? (
            <div className="rounded-[24px] bg-surface-container-low p-8">
              <h2 className="mb-3 text-2xl font-serif text-primary">还没有可回顾的记忆</h2>
              <button
                type="button"
                aria-label="返回全部页面"
                className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-white"
                onClick={navigateToInbox}
              >
                回到全部
              </button>
            </div>
          ) : error ? (
            <div className="rounded-[24px] bg-surface-container-low p-8">
              <h2 className="mb-3 text-2xl font-serif text-primary">这次没有取到旧记忆</h2>
              <button
                type="button"
                className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-white"
                onClick={() => void refetch()}
              >
                重试
              </button>
            </div>
          ) : data ? (
            <>
              <article className="rounded-[24px] bg-surface-container-low p-8">
                <div className="mb-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40">
                  {formatDateTime(data.createdAt)} · 旧记录
                </div>
                <p className="mb-6 whitespace-pre-wrap text-lg leading-[1.8] text-primary">{data.content}</p>
                {data.attachments.length > 0 ? (
                  <div className="mb-6 grid max-w-[360px] grid-cols-2 gap-3">
                    {data.attachments.map((attachment) => (
                      <img
                        key={attachment.imageId}
                        src={resolveAttachmentUrl(apiUrl, attachment.url)}
                        alt={attachment.relativePath}
                        className="aspect-square rounded-[20px] object-cover"
                      />
                    ))}
                  </div>
                ) : null}
                {data.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {data.tags.map((tag) => (
                      <span key={tag} className="rounded-lg bg-surface-container px-3 py-1 text-[11px] font-bold text-on-surface-variant">
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>

              <div className="mt-6">
                <button
                  type="button"
                  aria-label="再看一条旧记忆"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
                  onClick={() => void refetch()}
                  disabled={isFetching}
                >
                  {isFetching ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                  {isFetching ? "取回中..." : "换一条"}
                </button>
              </div>
            </>
          ) : null}
        </div>

        <aside className="w-72 flex-shrink-0 pt-[88px]">
          <section className="rounded-[24px] bg-surface-container-low p-7">
            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40">回顾说明</h3>
            <p className="text-sm leading-7 text-on-surface-variant">
              这里会重新翻看一条已有 memo。当前是轻量实现，不承诺复杂策略或真正随机。
            </p>
          </section>
        </aside>
      </main>
    </div>
  );
}
```

- [ ] **Step 5: 运行回顾页测试确认通过**

Run:

```bash
pnpm --filter "@memo-inbox/app-core" test -- src/__tests__/DesktopReview.test.tsx
```

Expected: PASS，成功态、空状态、刷新动作都通过。

## Task 4: 做一次全量验证并检查变更范围

**Files:**
- Modify: `memo-inbox-client/packages/app-core/src/router/createAppRouter.tsx`
- Modify: `memo-inbox-client/packages/app-core/src/screens/DesktopInbox.tsx`
- Create: `memo-inbox-client/packages/app-core/src/screens/DesktopReview.tsx`
- Create: `memo-inbox-client/packages/app-core/src/components/DesktopShellHeader.tsx`
- Create: `memo-inbox-client/packages/app-core/src/__tests__/DesktopReview.test.tsx`
- Create: `memo-inbox-client/packages/app-core/src/__tests__/DesktopShellHeader.test.tsx`
- Modify: `memo-inbox-client/packages/app-core/src/__tests__/createAppRouter.test.tsx`
- Modify: `memo-inbox-client/packages/api-client/src/hooks.ts`

- [ ] **Step 1: 运行 app-core 测试**

Run:

```bash
pnpm --filter "@memo-inbox/app-core" test
```

Expected: PASS，既有 `DesktopInbox` / `DesktopMemoEdit` / `createAppRouter` 测试与新增回顾相关测试全部通过。

- [ ] **Step 2: 运行 app-core 类型检查**

Run:

```bash
pnpm --filter "@memo-inbox/app-core" typecheck
```

Expected: PASS，无新增 TypeScript 错误。

- [ ] **Step 3: 运行桌面端构建**

Run:

```bash
pnpm --filter "@memo-inbox/desktop" build
```

Expected: PASS，桌面壳成功消费新的头部组件、回顾页和路由装配。

- [ ] **Step 4: 检查改动范围**

Run:

```bash
git diff -- \
  "memo-inbox-client/packages/app-core/src/router/createAppRouter.tsx" \
  "memo-inbox-client/packages/app-core/src/screens/DesktopInbox.tsx" \
  "memo-inbox-client/packages/app-core/src/screens/DesktopReview.tsx" \
  "memo-inbox-client/packages/app-core/src/components/DesktopShellHeader.tsx" \
  "memo-inbox-client/packages/app-core/src/__tests__/createAppRouter.test.tsx" \
  "memo-inbox-client/packages/app-core/src/__tests__/DesktopShellHeader.test.tsx" \
  "memo-inbox-client/packages/app-core/src/__tests__/DesktopReview.test.tsx" \
  "memo-inbox-client/packages/api-client/src/hooks.ts"
```

Expected: 仅包含回顾页、导航、路由和对应测试；没有扩散到 `daily`、归档页、搜索逻辑或服务端协议。

- [ ] **Step 5: 用 GitNexus 检查最终改动影响**

Run tool:

```text
gitnexus_detect_changes({
  repo: "memo-inbox-client",
  scope: "all"
})
```

Expected: 仅报告桌面首页、桌面回顾页、路由和 Query hook 的预期影响范围。

## Self-Review

- Spec coverage: 已覆盖 `/review` 独立页、导航跳转与选中态、随机回顾单条展示、空状态、失败状态、归档占位态
- Placeholder scan: 计划中无 TBD / TODO / “稍后处理”
- Type consistency: 统一使用 `DesktopShellHeader`、`DesktopReview`、`useReviewRandomMemo`、`activeTab: "all" | "review"`
