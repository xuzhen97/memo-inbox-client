# Desktop Soft Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `memo-inbox-client` 的桌面收件流补上 memo 软删除入口、确认交互和失败反馈，并复用现有删除 API 完成列表刷新。

**Architecture:** 仅修改 `packages/app-core/src/screens/DesktopInbox.tsx`，在现有 memo 列表渲染里接入 `useRemoveMemo`，增加卡片级确认态与错误提示。保持 `apps/desktop` 入口层、`packages/api-client` 契约层和 `platform-bridge` 不变，严格限制为桌面端软删除最小闭环。

**Tech Stack:** React 19、TypeScript、TanStack Query、Vitest、Vite

---

## File Structure

- Modify: `memo-inbox-client/packages/app-core/src/screens/DesktopInbox.tsx`
  - 责任：接入桌面端 memo 删除交互、卡片确认态、错误提示、删除中禁用状态
- Create: `memo-inbox-client/packages/app-core/src/__tests__/DesktopInbox.delete.test.tsx`
  - 责任：覆盖删除入口展示、确认流程、删除成功刷新、删除失败反馈
- Modify: `memo-inbox-client/packages/app-core/package.json`
  - 责任：将新增测试文件纳入 `test` 脚本执行范围

### Task 1: 编写桌面软删除失败测试

**Files:**
- Create: `memo-inbox-client/packages/app-core/src/__tests__/DesktopInbox.delete.test.tsx`
- Modify: `memo-inbox-client/packages/app-core/package.json`

- [ ] **Step 1: 写删除交互测试**

```tsx
import * as React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DesktopInbox } from "../screens/DesktopInbox";
import { ApiClientContext } from "../api/ApiClientContext";

const invalidateQueries = vi.fn();
const mockRemove = vi.fn();

vi.mock("@memo-inbox/api-client", async () => {
  const actual = await vi.importActual<object>("@memo-inbox/api-client");
  return {
    ...actual,
    useMemoList: () => ({
      data: {
        items: [
          {
            memoId: "memo-1",
            header: { date: "2026-04-12", maidName: "记录" },
            content: "第一条 memo",
            attachments: [],
            tags: ["工作"],
            meta: { memoId: "memo-1" },
            createdAt: "2026-04-12T08:00:00.000Z",
            updatedAt: "2026-04-12T08:00:00.000Z",
            deleted: false,
            filename: "memo-1.md"
          }
        ],
        nextCursor: null
      },
      isLoading: false
    }),
    useMemoSearch: () => ({
      data: {
        items: [
          {
            memoId: "memo-1",
            header: { date: "2026-04-12", maidName: "记录" },
            content: "第一条 memo",
            attachments: [],
            tags: ["工作"],
            meta: { memoId: "memo-1" },
            createdAt: "2026-04-12T08:00:00.000Z",
            updatedAt: "2026-04-12T08:00:00.000Z",
            deleted: false,
            filename: "memo-1.md"
          }
        ]
      },
      isLoading: false
    }),
    useCreateMemo: () => ({
      mutateAsync: vi.fn(),
      isPending: false
    }),
    useRemoveMemo: () => ({
      mutateAsync: mockRemove,
      isPending: false
    })
  };
});

function renderDesktopInbox() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  queryClient.invalidateQueries = invalidateQueries as typeof queryClient.invalidateQueries;

  const apiClient = {
    memos: {
      create: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      restore: vi.fn(),
      purge: vi.fn(),
      list: vi.fn()
    },
    trash: { list: vi.fn() },
    search: { query: vi.fn() },
    review: { random: vi.fn(), daily: vi.fn() },
    imports: { create: vi.fn() },
    tasks: { get: vi.fn(), getErrors: vi.fn(), cancel: vi.fn() },
    maintenance: { getStatus: vi.fn(), reindex: vi.fn(), reconcile: vi.fn() },
    system: { getStatus: vi.fn() }
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <ApiClientContext.Provider value={apiClient as never}>
        <DesktopInbox />
      </ApiClientContext.Provider>
    </QueryClientProvider>
  );
}

describe("DesktopInbox delete", () => {
  beforeEach(() => {
    invalidateQueries.mockReset();
    mockRemove.mockReset();
  });

  it("shows confirmation before deleting a memo", async () => {
    renderDesktopInbox();

    fireEvent.click(screen.getByRole("button", { name: "删除这条 memo" }));

    expect(screen.getByText("移入回收站？")).toBeInTheDocument();
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("calls remove mutation after confirmation", async () => {
    mockRemove.mockResolvedValueOnce(undefined);
    renderDesktopInbox();

    fireEvent.click(screen.getByRole("button", { name: "删除这条 memo" }));
    fireEvent.click(screen.getByRole("button", { name: "确认移入回收站" }));

    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledWith("memo-1");
    });
  });

  it("shows inline error when delete fails", async () => {
    mockRemove.mockRejectedValueOnce(new Error("boom"));
    renderDesktopInbox();

    fireEvent.click(screen.getByRole("button", { name: "删除这条 memo" }));
    fireEvent.click(screen.getByRole("button", { name: "确认移入回收站" }));

    expect(await screen.findByText("删除失败，请稍后重试")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `pnpm --filter "@memo-inbox/app-core" test`

Expected: FAIL，失败原因应为桌面页还没有 `删除这条 memo` / `确认移入回收站` 这些交互元素或测试环境缺少依赖。

- [ ] **Step 3: 纳入测试文件执行范围**

```json
{
  "scripts": {
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "build": "pnpm run typecheck",
    "test": "vitest run src/__tests__/createQueryClient.test.ts src/__tests__/DesktopInbox.delete.test.tsx"
  }
}
```

- [ ] **Step 4: 再次运行测试，确认仍然是功能性失败**

Run: `pnpm --filter "@memo-inbox/app-core" test`

Expected: FAIL，且失败已收敛到删除功能未实现，而不是测试文件未被发现。

### Task 2: 实现桌面端软删除最小闭环

**Files:**
- Modify: `memo-inbox-client/packages/app-core/src/screens/DesktopInbox.tsx`

- [ ] **Step 1: 引入删除 hook 和页面状态**

```tsx
import { useMemoList, useCreateMemo, useMemoSearch, useRemoveMemo } from "@memo-inbox/api-client";

const [pendingDeleteMemoId, setPendingDeleteMemoId] = React.useState<string | null>(null);
const [deleteErrorMessage, setDeleteErrorMessage] = React.useState<string | null>(null);

const { mutateAsync: removeMemo, isPending: isRemoving } = useRemoveMemo(apiClient);
```

- [ ] **Step 2: 添加删除事件处理函数**

```tsx
const openDeleteConfirm = (memoId: string) => {
  setDeleteErrorMessage(null);
  setPendingDeleteMemoId(memoId);
};

const cancelDeleteConfirm = () => {
  if (isRemoving) {
    return;
  }
  setPendingDeleteMemoId(null);
};

const confirmDeleteMemo = async (memoId: string) => {
  setDeleteErrorMessage(null);
  try {
    await removeMemo(memoId);
    setPendingDeleteMemoId(null);
  } catch (error) {
    console.error(error);
    setDeleteErrorMessage("删除失败，请稍后重试");
  }
};
```

- [ ] **Step 3: 在卡片上接入删除入口和确认态**

```tsx
const isDeleteConfirming = pendingDeleteMemoId === memo.memoId;
const isDeletingThisMemo = isRemoving && isDeleteConfirming;

<article key={memo.memoId} className="bg-surface-container-low p-8 rounded-[24px] border border-outline-variant/5 group">
  <div className="flex items-start justify-between gap-4 mb-6">
    <div className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant/40">
      {dateHeader} · 记录
    </div>
    {isDeleteConfirming ? (
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="px-3 py-1.5 rounded-full bg-error/10 text-error text-[11px] font-bold transition-colors disabled:opacity-50"
          onClick={() => void confirmDeleteMemo(memo.memoId)}
          disabled={isDeletingThisMemo}
          aria-label="确认移入回收站"
        >
          {isDeletingThisMemo ? "删除中..." : "确认删除"}
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-bold transition-colors disabled:opacity-50"
          onClick={cancelDeleteConfirm}
          disabled={isDeletingThisMemo}
        >
          取消
        </button>
      </div>
    ) : (
      <button
        type="button"
        className="opacity-0 group-hover:opacity-100 text-on-surface-variant/50 hover:text-error transition-all text-[11px] font-bold"
        onClick={() => openDeleteConfirm(memo.memoId)}
        aria-label="删除这条 memo"
      >
        删除
      </button>
    )}
  </div>

  {isDeleteConfirming && (
    <div className="mb-4 text-[12px] text-on-surface-variant">
      移入回收站？
    </div>
  )}
</article>
```

- [ ] **Step 4: 在列表区域显示内联错误提示**

```tsx
{deleteErrorMessage && (
  <div className="mb-4 rounded-2xl bg-error/8 px-4 py-3 text-sm text-error">
    {deleteErrorMessage}
  </div>
)}
```

- [ ] **Step 5: 运行测试并确认通过**

Run: `pnpm --filter "@memo-inbox/app-core" test`

Expected: PASS，新增删除交互测试与既有 `createQueryClient` 测试全部通过。

### Task 3: 类型检查与桌面构建验证

**Files:**
- Modify: `memo-inbox-client/packages/app-core/src/screens/DesktopInbox.tsx`
- Modify: `memo-inbox-client/packages/app-core/package.json`

- [ ] **Step 1: 运行 app-core 类型检查**

Run: `pnpm --filter "@memo-inbox/app-core" typecheck`

Expected: PASS，无 TypeScript 错误。

- [ ] **Step 2: 运行桌面端构建**

Run: `pnpm --filter "@memo-inbox/desktop" build`

Expected: PASS，Vite 构建成功，说明桌面壳可以消费新的 `DesktopInbox` 交互。

- [ ] **Step 3: 检查改动范围**

Run: `git diff -- memo-inbox-client/packages/app-core/src/screens/DesktopInbox.tsx memo-inbox-client/packages/app-core/src/__tests__/DesktopInbox.delete.test.tsx memo-inbox-client/packages/app-core/package.json`

Expected: 仅包含桌面软删除实现、测试和测试脚本范围调整，没有扩散到回收站、恢复或永久删除。

### Task 4: GitNexus 变更影响复核

**Files:**
- Modify: `memo-inbox-client/packages/app-core/src/screens/DesktopInbox.tsx`

- [ ] **Step 1: 对目标文件做影响分析**

Run tool: `gitnexus_impact({ repo: "memo-inbox-client", target: "DesktopInbox.tsx", direction: "upstream" })`

Expected: 识别桌面页面或路由引用，风险应保持在可控范围内；如果返回 HIGH/CRITICAL，停止并回看改动边界。

- [ ] **Step 2: 分析当前工作区改动影响**

Run tool: `gitnexus_detect_changes({ repo: "memo-inbox-client", scope: "all" })`

Expected: 仅报告桌面收件流相关符号和执行流受到影响。

- [ ] **Step 3: 记录验证结果**

在最终汇报中明确写出：

```text
- 影响分析结果：风险等级、直接调用方、受影响流程
- 已执行验证：test / typecheck / build
- 未执行项：如果有，说明原因
```

## Self-Review

- Spec coverage: 已覆盖删除入口、二次确认、失败提示、删除成功刷新、严格限制范围不扩散
- Placeholder scan: 计划中不含 TBD/TODO/“稍后实现”
- Type consistency: 统一使用 `pendingDeleteMemoId`、`deleteErrorMessage`、`removeMemo`
