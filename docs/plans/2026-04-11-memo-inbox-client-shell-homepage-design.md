# Memo Inbox Client Shell Homepage 设计

**日期：** 2026-04-11

**目标：** 在 `memo-inbox-client` 中补一个可运行的三端共享架构占位首页，并尝试产出 Windows `exe` 与 Android `debug apk`，但不引入任何 memo 业务功能。

## 设计结论

### 1. 首页采用共享架构占位页

首页只承担工程展示职责，不承担业务职责。页面内容固定为：

- 项目标题与阶段说明
- 当前平台与运行时信息
- 已建立模块边界说明
- 当前未实现能力提示

该页面将放在 `packages/app-core` 中，由三端共用，避免重复实现。

### 2. 三端入口保持极薄

三端结构保持：

- `apps/web`：浏览器入口
- `apps/desktop`：Tauri Windows 入口
- `apps/mobile`：Capacitor Android 入口

各端只负责：

- 创建或注入平台桥
- 挂载共享首页
- 承载各自构建配置

不在入口层写业务状态、业务路由或 API 页面逻辑。

### 3. 首页只展示架构状态

首页信息块限制为：

- `Memo Inbox Client`
- 当前平台类型、运行时类型
- `app-core`、`api-client`、`editor-markdown`、`platform-bridge`、`ui-kit`、`shared-types` 的职责说明
- “尚未接入 memo 业务能力”的显式提示

### 4. 打包目标为“能构建即可”

本轮目标不是发布包，而是验证基础工程链路：

- Web：必须能构建
- Desktop：优先尝试产出 Windows `exe`
- Mobile：优先尝试产出 Android `debug apk`

如果本机缺少下列前置条件，则停在真实报错点：

- Rust
- MSVC / Windows 打包工具链
- WebView2 / Tauri 所需前置
- Java
- Android SDK
- Gradle / Android 构建环境

### 5. 验证原则

每一层只验证当前目标：

- 共享包：类型检查与最小测试
- Web：`build`
- Desktop：前端构建 + Tauri 打包尝试
- Mobile：前端构建 + Capacitor Android 构建尝试

不提前补图标、签名、发布配置或 memo 业务页面。
