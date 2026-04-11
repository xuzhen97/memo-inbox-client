# Memo Inbox Client SDK Design

**Date:** 2026-04-11

## Context

`memo-inbox-client` 当前已经有三端壳层、`app-core` 装配占位、`platform-bridge` 草稿存储占位，以及 `api-client` 的空实现。

服务端 `VCPToolBox/Plugin/MemoInboxAPI` 已经在仓库中实现，提供 memo CRUD、搜索、回顾、导入、维护、任务查询和任务 WebSocket 推送能力。

本次范围只做基础 SDK，不涉及任何页面实现，也不把能力接入 `app-core`。

## Goal

在 `memo-inbox-client` 中补齐一个可复用的 Memo Inbox 基础 SDK：

- 共享类型契约
- HTTP API client
- Task WebSocket client
- 对应测试

## Scope

### In Scope

- 在 `packages/shared-types` 中定义配置、DTO、错误、任务事件类型
- 在 `packages/api-client` 中实现全部已落地接口的 HTTP client
- 在 `packages/api-client` 中实现 task WebSocket client
- 为 HTTP 与 WebSocket 行为补齐单元测试
- 通过 `typecheck` 和 `test` 验证

### Out of Scope

- 页面、路由、组件、Query hook、UI 状态
- `app-core` 集成
- 平台端配置读取
- 离线缓存、智能重连、复杂连接管理
- 对服务端返回做额外领域映射

## Constraints

- 配置采用显式构造，调用方必须主动传入 `baseUrl`、`bearerToken`、`vcpKey`
- SDK 不隐式读取环境变量，不依赖 `platform-bridge`
- HTTP 是事实源，WebSocket 只承担任务增量通知
- 当前设计要尽量贴近 `MemoInboxAPI` 真实返回，避免无意义 DTO 转换

## Package Boundaries

### `packages/shared-types`

只承载契约，不承载行为逻辑。

包含：

- `AppError`
- `ApiErrorPayload`
- `MemoInboxClientConfig`
- `TaskEventClientConfig`
- memo DTO 与请求类型
- task DTO、task event 类型
- maintenance/system 响应类型

### `packages/api-client`

只承载服务端接入逻辑。

包含：

- `createApiClient(config)`
- `createTaskEventClient(config)`
- 配置归一化 helper
- 通用 HTTP 请求 helper
- multipart 构造 helper
- task socket URL 构造与消息分发

不包含：

- Query 缓存
- 页面状态
- 平台存储

### `packages/platform-bridge`

本次不改动职责，继续只抽象平台能力，不承载服务端配置。

## Configuration Model

推荐调用方式：

```ts
const api = createApiClient({
  baseUrl: "http://127.0.0.1:3030",
  bearerToken: "token"
});

const tasks = createTaskEventClient({
  baseUrl: "http://127.0.0.1:3030",
  vcpKey: "token"
});
```

配置定义与配置来源分离：

- 配置类型放在 `shared-types`
- 配置校验和归一化放在 `api-client`
- 实际配置值由调用方自己决定来源

## API Shape

`createApiClient(config)` 返回分域式零状态对象：

- `memos.create`
- `memos.get`
- `memos.update`
- `memos.remove`
- `memos.restore`
- `memos.purge`
- `memos.list`
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

这样可以保持与服务端资源模型一致，避免一个巨型 client 混合太多职责。

## HTTP Behavior

所有接口统一走内部 `requestJson()`：

- 自动拼接 `/api/plugins/MemoInboxAPI`
- 自动注入 `Authorization: Bearer <token>`
- 统一处理 query string
- 统一解析 JSON 成功响应
- 统一映射服务端错误结构
- `204 No Content` 返回 `void`

`POST /memos` 支持两种输入路径：

- JSON：`content`、`tags`、`source`、`imageUrls`、`imageBase64`
- multipart：在上述基础上允许 `files` 或直接传 `formData`

只有在需要上传文件时才构造 `FormData`，其他场景保持简单 JSON。

## Socket Behavior

`createTaskEventClient(config)` 只做任务事件通道：

- `connect()`
- `disconnect()`
- `subscribeTask(taskId)`
- `unsubscribeTask(taskId)`
- `on(eventType, listener)`
- `off(eventType, listener)`
- `getConnectionState()`

约束如下：

- 不自动订阅 task
- 不直接返回 memo 数据
- 连接断开后可选做轻量重连
- 重连后恢复本实例记录的 task 订阅
- 不做复杂心跳和离线队列

## Shared Types Strategy

共享类型尽量贴近服务端现状：

- `MemoDto`
- `MemoHeader`
- `MemoAttachment`
- `MemoMeta`
- `MemoListResponse`
- `MemoTrashResponse`
- `MemoSearchResponse`
- `MemoReviewDailyResponse`
- `MemoTaskDto`
- `MemoTaskAcceptedResponse`
- `MemoTaskErrorsResponse`
- `MemoTaskEvent`
- `MemoMaintenanceStatus`
- `MemoSystemStatus`

请求类型只按真实接口分开定义，不做过度抽象。

## Error Model

SDK 统一向外抛出 `AppError`。

错误来源包括：

- 服务端标准错误响应
- HTTP 非 2xx 且无标准错误结构
- 网络异常
- 非法响应体
- WebSocket 协议异常

建议客户端内部映射错误码：

- `NETWORK_ERROR`
- `INVALID_RESPONSE`
- `HTTP_ERROR`
- `SOCKET_ERROR`

服务端已有错误码优先透传。

## Testing Strategy

### `shared-types`

不写行为测试，只做类型导出与被其他包消费的验证。

### HTTP Client

需要覆盖：

- 配置归一化
- Bearer 头注入
- URL 拼接与 query 构造
- JSON body
- multipart body
- `204` 响应
- 服务端错误映射
- 全部接口方法的 method/path/body 是否正确

### Task WebSocket Client

需要覆盖：

- WebSocket URL 构造
- connect/disconnect
- subscribe/unsubscribe 消息发送
- 事件分发
- 错误事件
- 可选重连后恢复订阅

## Impact Analysis Note

按仓库规则，本次在动手前尝试使用 GitNexus 做影响分析。

结论：

- `vcp-hub` 主索引当前没有解析出 `memo-inbox-client` 子模块中的 TS 符号
- 因此无法对 `createApiClient` 等目标做精确的符号级 blast radius
- 现有证据显示客户端 SDK 仍处于占位状态，当前变更预计只影响 `memo-inbox-client` 子模块内部

后续如果需要更精确分析，应先重新索引能覆盖子模块源码的仓库范围。
