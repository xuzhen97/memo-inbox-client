# Memo Inbox Client SDK Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 `memo-inbox-client` 补齐 MemoInboxAPI 的基础 SDK，包括共享类型、HTTP client、task WebSocket client 与测试，不涉及任何页面实现。

**Architecture:** 保持 `shared-types` 只承载契约，`api-client` 只承载服务端接入逻辑。HTTP client 采用分域式零状态 API，task WebSocket client 独立建模，避免把 UI 状态、环境变量、平台桥耦合进 SDK。

**Tech Stack:** TypeScript、pnpm workspace、Vitest、原生 `fetch`、原生 `WebSocket`、FormData

---

### Task 0: 写入设计基线与补充现状说明

**Files:**
- Create: `docs/plans/2026-04-11-memo-inbox-client-sdk-design.md`
- Modify: `README.md`

**Step 1: 记录设计结论**

把以下结论写入设计文档：

- 配置采用显式构造，不从环境变量或平台桥隐式读取
- `shared-types` 只放契约
- `api-client` 只放 HTTP 与 task socket 接入逻辑
- 本次不接入 `app-core`

**Step 2: 在 README 补一行当前 SDK 状态**

说明 `api-client` 将承载 MemoInboxAPI HTTP 与 task socket 基础接入。

**Step 3: 验证文档变更**

Run: `Get-Content -Path "D:/vcp-hub/memo-inbox-client/docs/plans/2026-04-11-memo-inbox-client-sdk-design.md"`
Expected: 包含 scope、package boundaries、error model、testing strategy

### Task 1: 先为 shared-types 写最小消费测试并扩展类型契约

**Files:**
- Modify: `packages/shared-types/src/index.ts`
- Modify: `packages/shared-types/package.json`
- Test: `packages/shared-types/src/__tests__/exports.test.ts`

**Step 1: 先写 failing test**

写测试验证至少能导出以下符号：

- `MemoInboxClientConfig`
- `TaskEventClientConfig`
- `MemoDto`
- `MemoTaskDto`
- `MemoTaskEvent`

**Step 2: 运行测试确认失败**

Run: `pnpm --filter "@memo-inbox/shared-types" test`
Expected: FAIL，提示缺少导出或测试文件

**Step 3: 写最小类型实现**

在 `packages/shared-types/src/index.ts` 中补齐：

- 配置类型
- memo DTO
- task DTO
- search/review/import/maintenance/system 响应类型
- `CreateMemoInput`、`UpdateMemoInput`、`ListMemosInput`、`SearchMemosInput`

**Step 4: 运行测试与类型检查**

Run: `pnpm --filter "@memo-inbox/shared-types" test`
Expected: PASS

Run: `pnpm --filter "@memo-inbox/shared-types" typecheck`
Expected: PASS

### Task 2: 先为 HTTP client 写 failing tests

**Files:**
- Modify: `packages/api-client/package.json`
- Test: `packages/api-client/src/__tests__/apiClient.test.ts`

**Step 1: 写配置与通用请求测试**

覆盖：

- `baseUrl` 归一化
- Bearer 头注入
- `204` 响应返回 `void`
- 服务端标准错误映射成 `AppError`

**Step 2: 写 memo 接口测试**

覆盖：

- `memos.create` JSON 路径
- `memos.create` multipart 路径
- `memos.get`
- `memos.update`
- `memos.remove`
- `memos.restore`
- `memos.purge`
- `memos.list`

**Step 3: 写其余接口测试**

覆盖：

- `trash.list`
- `search.query`
- `review.random`
- `review.daily`
- `imports.create`
- `tasks.get`
- `tasks.getErrors`
- `tasks.cancel`
- `maintenance.getStatus`
- `maintenance.reindex`
- `maintenance.reconcile`
- `system.getStatus`

**Step 4: 运行测试确认失败**

Run: `pnpm --filter "@memo-inbox/api-client" test`
Expected: FAIL，提示 `createApiClient` 未实现

### Task 3: 实现 shared-types 依赖下的 HTTP client 最小代码

**Files:**
- Modify: `packages/api-client/src/index.ts`

**Step 1: 实现配置归一化与错误工厂**

实现：

- `resolveMemoInboxClientConfig`
- `createApiError`
- `toAppError`

**Step 2: 实现通用请求 helper**

实现：

- 路径拼接
- query 构造
- Bearer 头注入
- JSON 解析
- `204` 处理
- 标准错误结构解析

**Step 3: 实现分域式 API client**

实现：

- `memos.*`
- `trash.list`
- `search.query`
- `review.*`
- `imports.create`
- `tasks.*`
- `maintenance.*`
- `system.getStatus`

**Step 4: 实现 `POST /memos` body 构造**

规则：

- 有 `files` 或 `formData` 时走 multipart
- 否则走 JSON

**Step 5: 运行测试与类型检查**

Run: `pnpm --filter "@memo-inbox/api-client" test`
Expected: PASS 当前 HTTP tests

Run: `pnpm --filter "@memo-inbox/api-client" typecheck`
Expected: PASS

### Task 4: 先为 task WebSocket client 写 failing tests

**Files:**
- Test: `packages/api-client/src/__tests__/taskEventClient.test.ts`

**Step 1: 写 URL 构造与连接测试**

覆盖：

- `http` -> `ws`
- `https` -> `wss`
- `/vcp-memo-inbox/VCP_Key=...` 连接地址正确

**Step 2: 写订阅与退订测试**

覆盖：

- `subscribeTask(taskId)` 发送 `memo_subscribe_task`
- `unsubscribeTask(taskId)` 发送 `memo_unsubscribe_task`

**Step 3: 写事件分发与重连测试**

覆盖：

- `memo_task_accepted`
- `memo_task_progress`
- `memo_task_completed`
- `memo_task_failed`
- `memo_task_cancelled`
- 可选重连后恢复订阅

**Step 4: 运行测试确认失败**

Run: `pnpm --filter "@memo-inbox/api-client" test`
Expected: FAIL，提示 `createTaskEventClient` 未实现

### Task 5: 实现 task WebSocket client 最小代码

**Files:**
- Modify: `packages/api-client/src/index.ts`

**Step 1: 实现 task socket URL helper**

根据 `baseUrl` 与 `vcpKey` 生成：

`ws(s)://<host>/vcp-memo-inbox/VCP_Key=<vcpKey>`

**Step 2: 实现连接生命周期**

实现：

- `connect`
- `disconnect`
- `getConnectionState`

**Step 3: 实现订阅集与事件监听器**

实现：

- 订阅集合持久化
- `on/off`
- 任务事件分发
- 错误事件分发

**Step 4: 实现可选轻量重连**

只支持：

- 固定次数
- 固定间隔
- 重连后恢复 task 订阅

不要实现复杂心跳和离线消息队列。

**Step 5: 运行测试与类型检查**

Run: `pnpm --filter "@memo-inbox/api-client" test`
Expected: PASS

Run: `pnpm --filter "@memo-inbox/api-client" typecheck`
Expected: PASS

### Task 6: 收束导出与文档说明

**Files:**
- Modify: `packages/api-client/src/index.ts`
- Modify: `README.md`

**Step 1: 清理导出面**

确保只暴露必要符号：

- `createApiClient`
- `createTaskEventClient`
- `createApiError`
- 配置归一化 helper 如有必要再导出

**Step 2: 更新 README 用法示例**

补最小示例：

- API client 构造
- task event client 构造
- 显式配置方式

**Step 3: 验证 README**

Run: `Get-Content -Path "D:/vcp-hub/memo-inbox-client/README.md"`
Expected: 包含 SDK 使用示例

### Task 7: 最终验证与变更范围检查

**Files:**
- Verify only

**Step 1: 运行 package 级验证**

Run: `pnpm --filter "@memo-inbox/shared-types" test`
Expected: PASS

Run: `pnpm --filter "@memo-inbox/shared-types" typecheck`
Expected: PASS

Run: `pnpm --filter "@memo-inbox/api-client" test`
Expected: PASS

Run: `pnpm --filter "@memo-inbox/api-client" typecheck`
Expected: PASS

**Step 2: 运行根级验证**

Run: `pnpm test`
Expected: PASS

Run: `pnpm typecheck`
Expected: PASS

**Step 3: 检查变更范围**

Run: `git diff -- memo-inbox-client`
Expected: 只包含 `shared-types`、`api-client`、README、docs/plans` 等预期文件

**Step 4: 记录限制**

记录：

- GitNexus 当前未解析 `memo-inbox-client` 子模块 TS 符号，影响分析受限
- 本次未接入 `app-core`
- WebSocket 只做基础任务通知，不做复杂连接管理
