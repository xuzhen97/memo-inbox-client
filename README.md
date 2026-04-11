# memo-inbox-client

`memo-inbox-client` 是 `vcp-hub` 下的独立 Git submodule，用于承载 Memo Inbox 三端前端项目。

当前阶段包含三端工程骨架、共享架构占位首页，以及 Windows / Android 打包链路验证；仍不包含任何 memo 业务功能。

当前也已经补齐 `packages/shared-types` 与 `packages/api-client` 的 MemoInboxAPI 基础 SDK，可用于 HTTP 接口和任务 WebSocket 事件接入。

## 目录约定

- `apps/*`：三端入口壳层，后续分别承载 Web、Desktop、Mobile 启动入口。
- `packages/app-core`：应用装配层占位。
- `packages/api-client`：服务端访问与 Query 边界占位。
- `packages/editor-markdown`：Markdown / 编辑器边界占位。
- `packages/platform-bridge`：平台桥接抽象占位。
- `packages/shared-types`：跨包共享类型。
- `packages/tooling-config`：共享工程配置占位。
- `packages/ui-kit`：界面基础能力占位。

## 当前状态

- 已建立 `pnpm workspace` 根结构。
- 已建立共享类型与平台桥接边界占位。
- 已建立 API、编辑器、UI、装配层包骨架。
- 已建立 `web`、`desktop`、`mobile` 三端入口壳层。
- 已完成 Windows `exe` 与 Android `debug apk` 的一次打包验证。

## 开发与构建

### 安装依赖

```bash
pnpm install
```

### Web

开发：

```bash
pnpm --filter "@memo-inbox/web" dev
```

构建：

```bash
pnpm --filter "@memo-inbox/web" build
```

## SDK 使用

HTTP client：

```ts
import { createApiClient } from "@memo-inbox/api-client";

const api = createApiClient({
  baseUrl: "http://127.0.0.1:3030",
  bearerToken: "<Bearer Token>"
});

const memos = await api.memos.list({ limit: 20 });
```

Task WebSocket client：

```ts
import { createTaskEventClient } from "@memo-inbox/api-client";

const taskEvents = createTaskEventClient({
  baseUrl: "http://127.0.0.1:3030",
  vcpKey: "<VCP_Key>"
});

taskEvents.on("memo_task_completed", (event) => {
  console.log(event.data.taskId);
});

await taskEvents.connect();
taskEvents.subscribeTask("memo-task-xxx");
```

### Windows EXE

前置条件：

- 已安装 Rust / Cargo
- 可用的 Windows 打包环境
- `apps/desktop/src-tauri/icons/icon.ico` 存在

执行过程：

```bash
pnpm --filter "@memo-inbox/desktop" build
pnpm --filter "@memo-inbox/desktop" tauri build
```

本次实际产物路径：

- 安装包：`apps/desktop/src-tauri/target/release/bundle/nsis/Memo Inbox Client_0.1.0_x64-setup.exe`
- 原始可执行文件：`apps/desktop/src-tauri/target/release/memo-inbox-client-desktop.exe`

### Android APK

前置条件：

- 已安装 Android SDK
- `apps/mobile/android/local.properties` 中的 `sdk.dir` 指向有效 SDK 目录
- 使用 `JDK 21+`；本次验证使用 `JDK 24`

执行过程：

首次初始化 Android 工程：

```bash
pnpm --filter "@memo-inbox/mobile" build
pnpm --filter "@memo-inbox/mobile" exec cap add android
pnpm exec cap sync android
```

如果当前终端的 Java 版本不足，可以显式指定 `JAVA_HOME` 后再构建：

```powershell
$env:JAVA_HOME='C:/path/to/jdk'
$env:Path="$env:JAVA_HOME/bin;$env:Path"
```

然后在 Android 工程目录构建：

```bash
./gradlew.bat assembleDebug --console=plain --stacktrace
```

本次实际 APK 产物路径：

- `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`

## Git 提交边界

以下内容应该排除在提交之外：

- `node_modules/`
- 各端 `dist/`
- `apps/desktop/src-tauri/target/`
- `apps/desktop/src-tauri/gen/`
- `apps/mobile/android/.gradle/`
- `apps/mobile/android/local.properties`
- Android 构建生成目录与 Capacitor 同步出来的临时产物（由 `apps/mobile/android/.gitignore` 继续覆盖）

源码、配置、测试、文档和三端工程壳层文件应纳入版本控制。
