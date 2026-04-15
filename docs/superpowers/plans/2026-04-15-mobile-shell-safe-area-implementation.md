# Mobile Shell Safe Area Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 `memo-inbox-client` 手机端收件页的横向溢出和底部安全区问题，让内容保持单屏宽度并让底部导航与系统手势区衔接更自然。

**Architecture:** 由 `MobileShell` 统一收口移动端一屏高度、主滚动区和底部导航安全区逻辑，由 `MobileInbox` 负责 memo 内容列的收缩、断行和局部宽度约束。测试先落在现有 `MobileInbox.test.tsx` 和新增的 `MobileShell.test.tsx`，先红后绿，避免靠手工试出来。

**Tech Stack:** React 19、TypeScript、Vitest、jsdom、Tailwind utility classes

---

## File Map

- Modify: `packages/app-core/src/screens/MobileInbox.tsx`
  - 责任：修复 memo 列表项右侧内容列收缩、正文断行、附件/标签/操作区的宽度约束
- Modify: `packages/app-core/src/screens/MobileShell.tsx`
  - 责任：统一移动端壳层的一屏高度、主滚动区底部预留、底部导航安全区内边距和横向溢出保护
- Modify: `packages/app-core/src/__tests__/MobileInbox.test.tsx`
  - 责任：先写失败测试，锁定移动端超长内容时必须具备的收缩和断行类名
- Create: `packages/app-core/src/__tests__/MobileShell.test.tsx`
  - 责任：先写失败测试，锁定 `MobileShell` 的主滚动区和底部导航安全区样式

## Preconditions

- 不创建分支，不做 `git commit`。仓库与项目级 `AGENTS.md` 明确要求：用户未主动要求时不要计划和执行提交。
- 进入实现前，先对将要修改的符号执行 GitNexus impact analysis：
  - `MobileShell`
  - `MobileInbox`
- 如果 impact 返回 `HIGH` 或 `CRITICAL`，暂停并向用户报告 blast radius。

---

### Task 1: 锁定 `MobileInbox` 的移动端收缩与断行约束

**Files:**
- Modify: `packages/app-core/src/__tests__/MobileInbox.test.tsx`
- Test: `packages/app-core/src/__tests__/MobileInbox.test.tsx`

- [ ] **Step 1: 在测试数据里加入超长内容样本**

把 `buildListResult()` 里的 `content` 改成包含超长连续字符和长链接的文本，避免测试只覆盖“正常短文案”。

```tsx
content:
  "https://example.com/" +
  "superlongsegment".repeat(12) +
  "\n" +
  "连续内容".repeat(40),
```

- [ ] **Step 2: 写一个失败测试，锁定正文和内容列类名**

在 `describe("MobileInbox enhancements", ...)` 末尾新增测试，先断言还不存在目标类名。

```tsx
it("keeps memo rows shrinkable and wraps long content on mobile", async () => {
  const view = await renderMobileInbox();

  const memoRow = view.host.querySelector('[data-testid="mobile-memo-row"]');
  const contentColumn = view.host.querySelector('[data-testid="mobile-memo-content"]');
  const contentText = view.host.querySelector('[data-testid="mobile-memo-text"]');
  const attachmentGrid = view.host.querySelector('[data-testid="mobile-memo-attachments"]');

  expect(memoRow).not.toBeNull();
  expect(contentColumn).not.toBeNull();
  expect(contentText).not.toBeNull();
  expect(attachmentGrid).not.toBeNull();

  expect(contentColumn?.className).toContain("min-w-0");
  expect(contentText?.className).toContain("break-words");
  expect(contentText?.className).toContain("[overflow-wrap:anywhere]");
  expect(attachmentGrid?.className).toContain("max-w-full");

  await act(async () => {
    view.root.unmount();
  });
  view.host.remove();
});
```

- [ ] **Step 3: 跑单测，确认它先失败**

Run:

```bash
pnpm --filter @memo-inbox/app-core test -- MobileInbox.test.tsx
```

Expected:

```text
FAIL  src/__tests__/MobileInbox.test.tsx
+ expected "...className..." to contain "min-w-0"
```

- [ ] **Step 4: 最小实现 `MobileInbox` 所需的测试锚点和类名**

在 `packages/app-core/src/screens/MobileInbox.tsx` 的 memo 列表渲染处加 `data-testid` 和必要 class，不改页面结构。

```tsx
<div key={memo.memoId} data-testid="mobile-memo-row" className="flex gap-5 relative">
  <div className="w-[52px] flex-shrink-0 text-[11px] font-bold text-on-surface-variant/40 tracking-wider pt-1 uppercase text-right">
    {timeLabelStr}
  </div>

  <div data-testid="mobile-memo-content" className="min-w-0 flex-1 flex flex-col pt-0.5">
    <p
      data-testid="mobile-memo-text"
      className="mb-3 whitespace-pre-wrap break-words text-[15px] leading-[1.8] text-[#2C2C2C] font-sans [overflow-wrap:anywhere]"
    >
      {memo.content}
    </p>

    {memo.attachments && memo.attachments.length > 0 && (
      <div className="mb-4 max-w-full">
        <div
          data-testid="mobile-memo-attachments"
          className={`grid ${gridColsClass} max-w-full gap-2 sm:max-w-[280px]`}
        >
          {/* existing attachment buttons */}
        </div>
      </div>
    )}
  </div>
</div>
```

- [ ] **Step 5: 跑单测，确认转绿**

Run:

```bash
pnpm --filter @memo-inbox/app-core test -- MobileInbox.test.tsx
```

Expected:

```text
PASS  src/__tests__/MobileInbox.test.tsx
```

---

### Task 2: 补齐 `MobileInbox` 的操作区和标签区宽度约束

**Files:**
- Modify: `packages/app-core/src/screens/MobileInbox.tsx`
- Test: `packages/app-core/src/__tests__/MobileInbox.test.tsx`

- [ ] **Step 1: 写一个失败测试，锁定操作区不会把内容列撑宽**

在 `MobileInbox.test.tsx` 新增一个测试，要求标签容器和操作区具备 `flex-wrap` / `min-w-0` 约束。

```tsx
it("keeps tag and action rows wrappable inside the memo column", async () => {
  const view = await renderMobileInbox();

  const tagRow = view.host.querySelector('[data-testid="mobile-memo-tags"]');
  const actionRow = view.host.querySelector('[data-testid="mobile-memo-actions"]');

  expect(tagRow).not.toBeNull();
  expect(actionRow).not.toBeNull();
  expect(tagRow?.className).toContain("flex-wrap");
  expect(actionRow?.className).toContain("flex-wrap");
  expect(actionRow?.className).toContain("min-w-0");

  await act(async () => {
    view.root.unmount();
  });
  view.host.remove();
});
```

- [ ] **Step 2: 跑单测，确认它先失败**

Run:

```bash
pnpm --filter @memo-inbox/app-core test -- MobileInbox.test.tsx
```

Expected:

```text
FAIL  src/__tests__/MobileInbox.test.tsx
+ expected "...className..." to contain "flex-wrap"
```

- [ ] **Step 3: 最小实现标签区与操作区约束**

只在现有容器上补充 class 和测试锚点，不移动交互逻辑。

```tsx
{memo.tags && memo.tags.length > 0 && (
  <div data-testid="mobile-memo-tags" className="mb-2 flex flex-wrap gap-2">
    {memo.tags.map((tag) => (
      <button
        key={tag}
        onClick={() => toggleTag(tag)}
        className={`rounded-[10px] px-3 py-1 text-[10px] font-bold tracking-wide transition-colors ${
          selectedTag === tag ? "bg-primary text-white" : "bg-[#F2F2F2] text-[#6B6B6B]"
        }`}
      >
        #{tag}
      </button>
    ))}
  </div>
)}

<div
  data-testid="mobile-memo-actions"
  className="mt-1 flex min-w-0 flex-wrap justify-end items-center gap-3"
>
  {/* existing delete confirm / edit / delete buttons */}
</div>
```

- [ ] **Step 4: 跑单测，确认 `MobileInbox` 全部转绿**

Run:

```bash
pnpm --filter @memo-inbox/app-core test -- MobileInbox.test.tsx
```

Expected:

```text
PASS  src/__tests__/MobileInbox.test.tsx
```

---

### Task 3: 为 `MobileShell` 写失败测试，锁定安全区和滚动区约束

**Files:**
- Create: `packages/app-core/src/__tests__/MobileShell.test.tsx`
- Test: `packages/app-core/src/__tests__/MobileShell.test.tsx`

- [ ] **Step 1: 新建 `MobileShell` 测试文件**

创建最小渲染工具，直接挂载 `MobileShell`，避免引入路由或平台桥噪音。

```tsx
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";

import { MobileShell } from "../screens/MobileShell";

async function renderMobileShell(activePath = "/") {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);

  await act(async () => {
    root.render(
      <MobileShell activePath={activePath}>
        <div data-testid="mobile-shell-content">content</div>
      </MobileShell>,
    );
  });

  return { host, root };
}
```

- [ ] **Step 2: 写一个失败测试，要求主滚动区和底栏暴露稳定样式**

```tsx
it("applies bottom safe-area padding to nav and scroll padding to main content", async () => {
  const view = await renderMobileShell("/");

  const shellRoot = view.host.querySelector('[data-testid="mobile-shell-root"]') as HTMLDivElement | null;
  const main = view.host.querySelector('[data-testid="mobile-shell-main"]') as HTMLElement | null;
  const nav = view.host.querySelector('[data-testid="mobile-shell-nav"]') as HTMLElement | null;

  expect(shellRoot).not.toBeNull();
  expect(main).not.toBeNull();
  expect(nav).not.toBeNull();

  expect(shellRoot?.className).toContain("overflow-x-hidden");
  expect(main?.className).toContain("overflow-y-auto");
  expect(main?.className).toContain("overflow-x-hidden");
  expect(main?.style.paddingBottom).toContain("env(safe-area-inset-bottom)");
  expect(nav?.style.paddingBottom).toContain("env(safe-area-inset-bottom)");

  await act(async () => {
    view.root.unmount();
  });
  view.host.remove();
});
```

- [ ] **Step 3: 跑单测，确认它先失败**

Run:

```bash
pnpm --filter @memo-inbox/app-core test -- MobileShell.test.tsx
```

Expected:

```text
FAIL  src/__tests__/MobileShell.test.tsx
+ expected "" to contain "env(safe-area-inset-bottom)"
```

---

### Task 4: 最小实现 `MobileShell` 的一屏布局和底部安全区

**Files:**
- Modify: `packages/app-core/src/screens/MobileShell.tsx`
- Test: `packages/app-core/src/__tests__/MobileShell.test.tsx`

- [ ] **Step 1: 在组件顶部引入稳定的安全区尺寸常量**

把魔法数字集中起来，避免后面主内容区、回到顶部按钮和底栏各自猜高度。

```tsx
const mobileBottomNavBaseHeight = 72;
const mobileBottomNavOffset = `calc(env(safe-area-inset-bottom) + ${mobileBottomNavBaseHeight}px)`;
const mobileBottomNavPadding = "calc(env(safe-area-inset-bottom) + 12px)";
```

- [ ] **Step 2: 最小实现壳层测试锚点和主滚动区样式**

给根节点、`main`、`nav` 加 `data-testid`，并用 style 明确安全区和滚动区关系。

```tsx
return (
  <div
    data-testid="mobile-shell-root"
    className="relative flex h-[100dvh] w-full flex-col overflow-hidden overflow-x-hidden bg-[#FCFAFA] font-sans text-on-surface"
  >
    <header
      className="flex flex-shrink-0 items-center justify-between bg-[#FCFAFA] px-5"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 24px)",
        paddingBottom: "12px",
      }}
    >
      {/* existing header buttons */}
    </header>

    <main
      ref={mainRef}
      data-testid="mobile-shell-main"
      onScroll={handleScroll}
      className="custom-scrollbar flex-1 overflow-x-hidden overflow-y-auto scroll-smooth"
      style={{ paddingBottom: mobileBottomNavOffset }}
    >
      {children}
    </main>

    <nav
      data-testid="mobile-shell-nav"
      className="absolute inset-x-0 bottom-0 bg-[#FCFAFA]/92 px-2 pt-2 backdrop-blur-md"
      style={{ paddingBottom: mobileBottomNavPadding }}
    >
      <div className="flex items-center justify-around rounded-t-[24px] bg-[#FCFAFA] px-1 py-2">
        {/* existing nav buttons */}
      </div>
    </nav>
  </div>
);
```

- [ ] **Step 3: 对回到顶部按钮同步使用统一偏移**

避免底栏变高后按钮仍旧停在旧位置。

```tsx
{showBackToTop && (
  <button
    onClick={scrollToTop}
    className="absolute right-5 z-50 flex items-center justify-center rounded-full bg-[#051F14]/90 p-3 text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] backdrop-blur transition-all hover:bg-black active:scale-95"
    style={{ bottom: `calc(${mobileBottomNavOffset} + 16px)` }}
  >
    <ChevronUp size={20} />
  </button>
)}
```

- [ ] **Step 4: 跑 `MobileShell` 单测，确认转绿**

Run:

```bash
pnpm --filter @memo-inbox/app-core test -- MobileShell.test.tsx
```

Expected:

```text
PASS  src/__tests__/MobileShell.test.tsx
```

---

### Task 5: 跑受影响范围验证并复核实现边界

**Files:**
- Modify: `packages/app-core/src/screens/MobileInbox.tsx`
- Modify: `packages/app-core/src/screens/MobileShell.tsx`
- Modify: `packages/app-core/src/__tests__/MobileInbox.test.tsx`
- Create: `packages/app-core/src/__tests__/MobileShell.test.tsx`

- [ ] **Step 1: 运行受影响测试集**

Run:

```bash
pnpm --filter @memo-inbox/app-core test -- MobileInbox.test.tsx MobileShell.test.tsx
```

Expected:

```text
PASS  src/__tests__/MobileInbox.test.tsx
PASS  src/__tests__/MobileShell.test.tsx
```

- [ ] **Step 2: 运行 `typecheck`**

Run:

```bash
pnpm --filter @memo-inbox/app-core typecheck
```

Expected:

```text
Done in
```

- [ ] **Step 3: 运行 GitNexus 变更检测，确认只影响预期符号**

在实现完成但未提交前运行：

```text
gitnexus_detect_changes({scope: "all"})
```

Expected:

```text
Changed symbols map to MobileShell, MobileInbox, and their related tests only.
```

- [ ] **Step 4: 人工复核边界**

确认以下 5 点：

```text
1. 没有改动移动端其它页面或全局 design token
2. 顶部状态栏 paddingTop 逻辑未回退
3. 断行依然保留 whitespace-pre-wrap 的原始换行语义
4. overflow-x-hidden 只是兜底，不是唯一修复手段
5. 底部导航仍保留当前四个入口和现有导航行为
```

## Self-Review

- **Spec coverage:** 规格里的 5 个验收标准都已映射到任务。`Task 1` 和 `Task 2` 覆盖横向溢出、长文本断行和局部宽度约束；`Task 3` 和 `Task 4` 覆盖主滚动区、底部导航和系统安全区；`Task 5` 覆盖自动验证、变更检测和边界复核。
- **Placeholder scan:** 计划里没有 `TODO`、`TBD`、"适当处理" 这类空指令。每个代码步骤都包含了具体片段，每个验证步骤都包含了具体命令和预期输出。
- **Type consistency:** 所有测试锚点和类名命名保持一致，只使用 `mobile-shell-root`、`mobile-shell-main`、`mobile-shell-nav`、`mobile-memo-row`、`mobile-memo-content`、`mobile-memo-text`、`mobile-memo-attachments`、`mobile-memo-tags`、`mobile-memo-actions` 这 9 个标识，后续任务没有改名漂移。
