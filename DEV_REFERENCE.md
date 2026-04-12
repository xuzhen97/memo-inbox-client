# Memo Inbox Client — 开发参考文档

> **用途**：本文档面向实际开发，描述当前代码库的真实状态、层间关系、开发规范、已知问题与下一步任务。所有描述均基于当前真实代码，不包含推测性内容。
>
> **维护约定**：每次完成一个功能阶段后更新"当前完成度"和"已知问题"章节。

---

## 1. 工程概览

| 项 | 值 |
|---|---|
| 包管理器 | `pnpm@10.19.0`（workspace 模式） |
| TypeScript | `^5.9.3` |
| React | `^19.1.1` |
| 构建工具 | Vite `^7.1.7` |
| 测试框架 | Vitest `^3.2.4` |
| 样式方案 | Tailwind CSS `^3.4.17` + CSS Modules（视情况） |
| Desktop 壳 | Tauri（Rust，已完成打包验证） |
| Mobile 壳 | Capacitor（已完成 Android APK 验证） |
| 后端 | VCPToolBox / MemoInboxAPI 插件（Node.js） |

---

## 2. 目录结构

```text
memo-inbox-client/
├── apps/
│   ├── web/          # Vite + React，浏览器端
│   ├── desktop/      # Vite + React + Tauri，Windows EXE
│   └── mobile/       # Vite + React + Capacitor，Android APK
│
├── packages/
│   ├── shared-types/     # 跨包 TypeScript 类型，无运行时依赖
│   ├── api-client/       # HTTP SDK + WebSocket 任务客户端
│   ├── platform-bridge/  # 三端平台能力抽象（Web/Tauri/Capacitor）
│   ├── app-core/         # 装配层：Provider、Router、Screen
│   ├── ui-kit/           # UI 组件库（当前为占位边界）
│   ├── editor-markdown/  # Markdown 编辑器边界（当前为占位边界）
│   └── tooling-config/   # 共享 Vite base、Tailwind preset、PostCSS 配置
│
├── tsconfig.base.json    # 根 TS 基础配置，所有子包 extend 此文件
├── pnpm-workspace.yaml
└── package.json          # 根 workspace，只含 devDependencies 和 scripts
```

---

## 3. 包依赖与调用链路

### 3.1 三端统一启动链路

```text
apps/web/src/main.tsx (以 Web 为例)
  └── <App />

apps/web/src/App.tsx
  ├── createWebPlatformBridge()  [提供具体平台的 bridge 实现]
  │
  ├── <AppProviders platformBridge={bridge}>  [来自 app-core]
  │     ├── <PlatformBridgeContext.Provider value={bridge}>
  │     └── <QueryClientProvider client={queryClient}>
  │
  └── createAppRouter()  [来自 app-core，目前直接返回 <ShellHomePage />]

ShellHomePage (app-core)
  ├── usePlatformBridge()  [获取当前平台能力]
  └── bridge.getPlatformInfo()  [渲染平台标识]
```

### 3.2 包间依赖规则

- **底层**：`shared-types` （零依赖，纯 TS，定义 DTO 与 Bridge 接口）
- **通信层**：`api-client` （依赖 shared-types，提供 HTTP & WebSocket SDK）
- **平台层**：`platform-bridge` （依赖 shared-types，提供各端硬件/存储能力）
- **装配层**：`app-core` （依赖上述所有以及 ui-kit、editor-markdown，组装页面）
- **壳层**：`apps/*` （依赖 app-core 和对应的 platform-bridge 实现，仅做入口）
- **配置层**：`tooling-config` （被各包直接复用，提供 Vite 别名、Tailwind preset 等）

**严格禁止**：`api-client` ↔ `platform-bridge` 之间互相依赖，它们应通过 `app-core` 在业务逻辑中串联。

---

## 4. 各包当前完成度与职责

### `shared-types` ✅ 完整
定义了所有 Memo DTO、请求参数、任务状态枚举、WebSocket 事件格式，以及 `PlatformBridge` 接口合同。

### `api-client` ✅ 完整
- 提供了完整的 HTTP SDK：`createApiClient(config)`，涵盖所有 CRUD、Search、Review、Tasks 接口。
- 提供了支持自动断线重连和重放订阅的 WebSocket SDK：`createTaskEventClient(config)`。
- 配置参数（fetch、WebSocket）支持外部注入，便于独立测试。
- 暴露了基于 React Query 封装的纯函数 Hooks（如 `useMemoList`, `useCreateMemo` 等），调用者只需传入 `apiClient` 实例即可使用。

### `platform-bridge` ✅ 接口固定，实现暂为内存占位
- 提供了 `createWebPlatformBridge`、`createTauriPlatformBridge`、`createCapacitorPlatformBridge` 三套工厂函数。
- 目前三端的 `draftStore` 均使用统一的 `createMemoryDraftStore`（刷新即丢）作占位，只在 `getPlatformInfo()` 区分平台类型。
- 预留了 `setPlatformBridge`/`getPlatformBridge` 全局单例模式，供非 React 上下文（如 WebSocket 监听器）使用。

### `app-core` 🔶 骨架完整
- `AppProviders` 包含 QueryClient (30s stale time)、PlatformBridgeContext 和 ApiClientContext (支持通过 `apiUrl` 和 `apiToken` 初始化)。
- `createAppRouter` 当前直接返回 `ShellHomePage` 占位页，尚未接入真实路由（React Router）。

### `tooling-config` ✅ 完整
- 提供了 `createBaseViteConfig` 统一解决 workspace 内多包的路径别名（Alias）解析。
- `tailwind-preset.ts` 提供了基础的 Tailwind 主题和排版插件支持。

### `ui-kit` & `editor-markdown` 🔶 仅边界占位
- 只有一个导出命名空间的空壳，等待业务组件填充。

---

## 5. 已知问题与修复指南

### 5.1 TSConfig 诊断错误：`baseUrl` 废弃警告
根目录的 `tsconfig.base.json` 配置了 `"baseUrl": "."`。在 TypeScript `moduleResolution: "Bundler"` 模式下，`paths` 别名已不再需要 `baseUrl`，这会在未来版本引发错误。
**修复方案**：后续需要移除 `baseUrl` 并在 `paths` 路径前补充 `./` 前缀。

### 5.2 幽灵依赖与嵌套 TSConfig 解析失败
部分子包在 `node_modules` 中嵌套产生了多份 `shared-types`，导致 `tsconfig.json` 的 extends 相对路径失效。
**修复方案**：已通过在根目录添加 `.npmrc`（设置 `shamefully-hoist=true` 或优先链接配置）并重新 `pnpm install` 来解决。

---

## 6. 开发与调试命令

```bash
# 全局安装与同步
pnpm install

# 各端独立启动
pnpm --filter "@memo-inbox/web" dev
pnpm --filter "@memo-inbox/desktop" dev
pnpm --filter "@memo-inbox/mobile" dev

# 全局类型检查与测试
pnpm typecheck
pnpm test

# 打包构建
pnpm --filter "@memo-inbox/web" build
pnpm --filter "@memo-inbox/desktop" build
# (Mobile 端依赖 Capacitor sync 及 Gradle)
```

---

## 7. 下一步开发指引 (Next Steps)

按照当前骨架状态，接下来的真实功能开发路径应为：

1. ~~**完善 API Context**~~ ✅已完成
   在 `app-core` 中添加 `ApiClientContext`，并在启动时传入服务端 URL 与 Token，供 React 树内部调用。
2. ~~**封装 Query Hooks**~~ ✅已完成
   在 `api-client` 中封装基于 React Query 的 Hooks（如 `useMemoList`, `useCreateMemo`）。
3. ~~**落实 Design Token**~~ ✅已完成
   对照 `DESIGN.md`，在 `tooling-config/src/tailwind-preset.ts` 补齐所有的 `surface` 色板和字体设定。
4. **开发 UI 组件**
   在 `ui-kit` 中开发纯展示的 `MemoCard`、按钮和标签等。
5. **装配 Inbox 列表页**
   在 `app-core` 建立 `InboxPage.tsx`，组合 Query Hooks 和 UI 组件；同时将 `createAppRouter` 升级为真正的 React Router。
6. **升级持久化存储**
   将 `platform-bridge` 各自的 draftStore 替换为真实的 `localStorage` / Tauri Store / Capacitor Preferences。