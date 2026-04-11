# Memo Inbox Client Shell Homepage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 `memo-inbox-client` 中实现共享架构占位首页，补齐 Web、Desktop、Mobile 三端薄壳入口，并尝试构建 Windows `exe` 与 Android `debug apk`。

**Architecture:** 共享首页与装配逻辑放在 `packages/app-core`，平台差异通过 `packages/platform-bridge` 暴露。`apps/*` 只承担入口、平台注入和构建壳层，保持与既有 Monorepo 分层一致。

**Tech Stack:** pnpm workspace、Vite、React、TypeScript、Tailwind CSS、TanStack Query、Vitest、Tauri、Capacitor

---

### Task 0: 补齐基础依赖与共享工程配置

**Files:**
- Modify: `package.json`
- Modify: `packages/tooling-config/package.json`
- Modify: `packages/tooling-config/src/index.ts`
- Create: `packages/tooling-config/src/tailwind-preset.ts`
- Create: `packages/tooling-config/src/vite.base.ts`
- Create: `packages/tooling-config/src/postcss.cjs`

**Step 1: 增加前端基础依赖**

补齐 `react`、`react-dom`、`vite`、`@vitejs/plugin-react`、`tailwindcss`、`@tailwindcss/typography`、`autoprefixer`、`postcss`、`vitest`、`@types/react`、`@types/react-dom`、`@tanstack/react-query`。

**Step 2: 写共享 Tailwind preset**

只包含基础 tokens 与 typography 插件。

**Step 3: 写共享 Vite 配置片段**

只包含 React plugin、alias 与通用 build 配置。

**Step 4: 暴露 tooling-config 统一导出**

让后续 apps 能直接引用。

**Step 5: 安装依赖并验证**

Run: `pnpm install`
Expected: PASS

### Task 1: 先写 app-core 最小测试并实现共享首页

**Files:**
- Modify: `packages/app-core/package.json`
- Modify: `packages/app-core/src/index.ts`
- Create: `packages/app-core/src/platform/PlatformBridgeContext.tsx`
- Create: `packages/app-core/src/providers/AppProviders.tsx`
- Create: `packages/app-core/src/screens/ShellHomePage.tsx`
- Create: `packages/app-core/src/router/createAppRouter.tsx`
- Create: `packages/app-core/src/query/createQueryClient.ts`
- Create: `packages/app-core/src/styles/shell-home.css`
- Test: `packages/app-core/src/__tests__/createQueryClient.test.ts`

**Step 1: 先写 QueryClient 组装测试**

验证：

- 能创建 `QueryClient`
- 默认 query 配置存在
- 不包含草稿状态逻辑

**Step 2: 运行测试确认失败**

Run: `pnpm --filter "@memo-inbox/app-core" test`
Expected: FAIL

**Step 3: 实现最小装配层与共享首页**

提供：

- `PlatformBridgeContext`
- `AppProviders`
- `createQueryClient`
- `createAppRouter`
- `ShellHomePage`

**Step 4: 运行测试与类型检查**

Run: `pnpm --filter "@memo-inbox/app-core" test`
Expected: PASS

Run: `pnpm --filter "@memo-inbox/app-core" typecheck`
Expected: PASS

### Task 2: 先写 platform-bridge 最小测试并实现三端平台信息

**Files:**
- Modify: `packages/platform-bridge/package.json`
- Modify: `packages/platform-bridge/src/index.ts`
- Modify: `packages/shared-types/src/index.ts`
- Create: `packages/platform-bridge/src/core/createMemoryDraftStore.ts`
- Create: `packages/platform-bridge/src/web/createWebPlatformBridge.ts`
- Create: `packages/platform-bridge/src/tauri/createTauriPlatformBridge.ts`
- Create: `packages/platform-bridge/src/capacitor/createCapacitorPlatformBridge.ts`
- Test: `packages/platform-bridge/src/__tests__/webBridge.test.ts`

**Step 1: 先写 Web bridge 测试**

验证：

- `getPlatformInfo`
- `saveDraft`
- `loadDraft`
- `removeDraft`

**Step 2: 运行测试确认失败**

Run: `pnpm --filter "@memo-inbox/platform-bridge" test`
Expected: FAIL

**Step 3: 实现最小平台桥**

Web 使用内存或浏览器存储占位，Desktop/Mobile 返回明确平台信息。

**Step 4: 运行测试与类型检查**

Run: `pnpm --filter "@memo-inbox/platform-bridge" test`
Expected: PASS

Run: `pnpm --filter "@memo-inbox/platform-bridge" typecheck`
Expected: PASS

### Task 3: 建立 Web 入口并完成首页构建

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/index.html`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.cjs`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/index.css`

**Step 1: 建立 Web 入口**

挂载共享首页并注入 Web platform bridge。

**Step 2: 接入 Tailwind 样式链路**

只保证架构占位页可见，不补业务样式。

**Step 3: 构建与类型检查**

Run: `pnpm --filter "@memo-inbox/web" build`
Expected: PASS

Run: `pnpm --filter "@memo-inbox/web" typecheck`
Expected: PASS

### Task 4: 建立 Desktop 入口并尝试生成 Windows exe

**Files:**
- Create: `apps/desktop/package.json`
- Create: `apps/desktop/index.html`
- Create: `apps/desktop/tsconfig.json`
- Create: `apps/desktop/vite.config.ts`
- Create: `apps/desktop/src/main.tsx`
- Create: `apps/desktop/src/App.tsx`
- Create: `apps/desktop/src/index.css`
- Create: `apps/desktop/src-tauri/Cargo.toml`
- Create: `apps/desktop/src-tauri/build.rs`
- Create: `apps/desktop/src-tauri/tauri.conf.json`
- Create: `apps/desktop/src-tauri/src/main.rs`

**Step 1: 建立 Tauri 前端入口**

挂载共享首页并注入 Tauri platform bridge。

**Step 2: 建立最小 Tauri Rust 壳**

仅保留窗口与构建所需配置。

**Step 3: 先验证前端构建**

Run: `pnpm --filter "@memo-inbox/desktop" build`
Expected: PASS

**Step 4: 尝试生成 exe**

Run: `pnpm --filter "@memo-inbox/desktop" tauri build`
Expected: PASS 或输出明确环境阻塞

### Task 5: 建立 Mobile 入口并尝试生成 Android debug apk

**Files:**
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/index.html`
- Create: `apps/mobile/tsconfig.json`
- Create: `apps/mobile/vite.config.ts`
- Create: `apps/mobile/capacitor.config.ts`
- Create: `apps/mobile/src/main.tsx`
- Create: `apps/mobile/src/App.tsx`
- Create: `apps/mobile/src/index.css`

**Step 1: 建立 Capacitor 前端入口**

挂载共享首页并注入 Capacitor platform bridge。

**Step 2: 建立最小 Capacitor 配置**

目标平台仅先瞄准 Android。

**Step 3: 验证前端构建**

Run: `pnpm --filter "@memo-inbox/mobile" build`
Expected: PASS

**Step 4: 尝试同步 Android 工程并生成 debug apk**

Run: `pnpm --filter "@memo-inbox/mobile" exec cap add android`
Expected: PASS 或已存在

Run: `pnpm --filter "@memo-inbox/mobile" exec cap sync android`
Expected: PASS 或输出明确环境阻塞

Run: `./gradlew assembleDebug`
Workdir: `apps/mobile/android`
Expected: PASS 或输出明确环境阻塞

### Task 6: 串联根级脚本与最终验证

**Files:**
- Modify: `package.json`

**Step 1: 补齐根脚本**

至少保证：

- `typecheck`
- `test`
- `build`

能覆盖已建立项目。

**Step 2: 运行最终验证**

Run: `pnpm typecheck`
Expected: PASS

Run: `pnpm test`
Expected: PASS

Run: `pnpm build`
Expected: PASS

**Step 3: 记录产物或阻塞**

输出：

- Web 构建结果
- Windows `exe` 产物路径或阻塞点
- Android `debug apk` 路径或阻塞点
