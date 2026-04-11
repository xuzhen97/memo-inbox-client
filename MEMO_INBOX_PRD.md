# Memo Inbox PRD

**版本**：落地版  
**日期**：2026-04-11  
**状态**：基于当前实现整理

## 1. 产品定位

Memo Inbox 是一个基于 VCPToolBox 插件体系构建的单用户 memo 收件箱能力。

它的目标不是再做一套独立笔记系统，而是在现有 `DailyNote`、`ImageServer`、`WebSocketServer` 和知识库索引链路之上，提供一组稳定、可接入、可维护的 memo API。

对外，它提供 memo 语义的 HTTP / WebSocket 能力。  
对内，它把 memo 写入 `dailynote/MyMemos/`，并复用现有日记与 RAG 管道。

## 2. 要解决的问题

- 需要一个比原始日记文件更适合第三方客户端和自动化接入的 memo 接口层。
- 需要支持文本与图片 memo，而不是只支持纯文本记录。
- 需要支持异步导入和维护任务，并暴露任务状态。
- 需要让新增 memo 自动进入现有知识库与 RAG 体系，而不是形成平行存储。

## 3. 产品目标

- 为单用户场景提供统一的 memo API 插件。
- 支持 memo 的创建、读取、更新、删除、恢复和永久删除。
- 支持图片附件写入，并复用现有图片访问体系。
- 支持基础搜索、回顾、批量导入和维护操作。
- 支持 HTTP 轮询和 WebSocket 推送两种任务状态消费方式。
- 保持对现有 VCPToolBox 运行时的低侵入复用。

## 4. 目标用户

- 自用型 memo 客户端。
- 桌面组件、移动端壳、脚本或自动化程序。
- 需要通过 Bearer Key 与 VCPToolBox 交互的外部调用方。

## 5. 当前版本范围

### 5.1 已实现能力

- `MemoInboxAPI` 以 `hybridservice` 插件运行，挂载在 `/api/plugins/MemoInboxAPI`。
- Bearer 鉴权复用服务端全局中间件，插件层不重复实现鉴权。
- 支持 memo CRUD、回收站、搜索、回顾、导入、维护、任务查询。
- 支持图片输入：`imageUrls`、`imageBase64`、`multipart/form-data` 文件上传。
- 支持任务 WebSocket 订阅与推送。
- memo 文件写入 `dailynote/MyMemos/`，软删除移动到 `.trash/`。
- memo 内容可沿用现有知识库监听与索引链路。

### 5.2 当前版本能力简化

- `GET /memos` 当前只支持 `limit` 与 `cursor`，未实现 `tag/from/to` 过滤。
- 搜索是基于当前 memo 列表的关键词过滤，不是语义搜索。
- `GET /review/random` 当前返回列表中的首条 memo，不是真随机。
- `GET /review/daily` 当前返回按时间排序后的最早一条 memo，并附带固定 `reviewReason`。
- `POST /imports` 接收 `mode`，但当前实现统一按逐条创建处理，未真正实现 `upsert` / `skip_duplicates`。
- `POST /tasks/:taskId/cancel` 当前只更新任务状态，不保证中断已开始的后台执行。
- `POST /maintenance/reconcile` 当前返回占位结果，尚未执行真实修复。
- `GET /maintenance/status` 当前 `attachmentCount` 固定为 `0`。

### 5.3 暂不纳入

- 多用户与租户隔离。
- 独立认证域。
- 语义搜索与 RAG 检索 API 对外暴露。
- 附件去重、附件垃圾回收、附件随 memo 删除联动清理。
- 复杂回顾策略。
- 完整的任务取消语义。

## 6. 核心用户流程

### 6.1 创建 memo

1. 客户端通过 Bearer Key 调用 `POST /memos`。
2. 服务端接收文本、标签和可选图片输入。
3. 图片先落盘到 `image/memo-inbox/YYYY/MM/DD/`。
4. memo 内容经 `DailyNote` 或 `DailyNoteWrite` 写入 `dailynote/MyMemos/`。
5. 服务端返回标准 memo DTO。

### 6.2 浏览与回顾

1. 客户端通过 `GET /memos` 拉取列表。
2. 客户端通过 `GET /memos/:memoId` 查看详情。
3. 客户端通过 `GET /search`、`GET /review/random`、`GET /review/daily` 获取搜索与回顾结果。

### 6.3 删除与恢复

1. 客户端调用 `DELETE /memos/:memoId` 进行软删除。
2. memo 文件移动到 `.trash/`。
3. 客户端可通过 `GET /trash` 查看回收站。
4. 客户端可通过 `POST /memos/:memoId/restore` 恢复，或通过 `DELETE /memos/:memoId/purge` 永久删除。

### 6.4 导入与维护任务

1. 客户端调用 `POST /imports`、`POST /maintenance/reindex` 或 `POST /maintenance/reconcile`。
2. 服务端返回 `taskId`。
3. 客户端通过 `GET /tasks/:taskId` 轮询结果，或通过 WebSocket 订阅增量事件。

## 7. 功能需求

### 7.1 Memo 模型

当前 memo 响应对象至少包含以下字段：

- `memoId`
- `header`
- `content`
- `attachments`
- `tags`
- `meta`
- `createdAt`
- `updatedAt`
- `deleted`
- `filename`

其中：

- `meta` 当前至少包含 `memoId` 和 `source`。
- `createdAt` / `updatedAt` 当前以文件时间为准返回。

### 7.2 存储模型

- memo 文本目录：`dailynote/MyMemos/`
- 回收站目录：`dailynote/MyMemos/.trash/`
- 图片目录：`image/memo-inbox/YYYY/MM/DD/`

memo 文件内容保持与现有日记体系兼容，正文中可包含：

- 正文内容
- `Attachments:` 行
- `Meta:` 行
- `Tag:` 行

### 7.3 写入策略

- 创建时，如果请求显式传入 `tags`，走 `DailyNote`。
- 创建时，如果未传入 `tags`，走 `DailyNoteWrite`，复用现有 Tag 生成能力。
- 更新时直接改写现有 memo 文件，当前只支持更新 `content` 和 `tags`。

### 7.4 附件能力

当前支持三种图片输入：

- `imageUrls`
- `imageBase64`
- `multipart/form-data`

当前约束：

- 文件上传最多 `10` 个文件。
- 单文件大小上限 `20MB`。
- URL 下载超时 `10s`。
- 仅支持常见图片类型。

图片访问地址格式为：

```text
/pw=<Image_Key>/images/memo-inbox/YYYY/MM/DD/<memoId>-<seq>.<ext>
```

### 7.5 搜索与回顾

- `GET /search` 支持 `q`、`tag`、`from`、`to`、`limit`。
- 当前搜索逻辑是对活动 memo 列表做关键词和标签过滤。
- `GET /review/random` 提供轻量回顾入口。
- `GET /review/daily` 提供规则型每日回顾入口。

### 7.6 导入与维护

- `POST /imports` 以异步任务方式执行批量导入。
- `POST /maintenance/reindex` 负责重建 memo 内存索引。
- `POST /maintenance/reconcile` 预留为存储一致性检查入口。

### 7.7 任务与通知

任务状态包括：

- `accepted`
- `running`
- `completed`
- `failed`
- `cancelled`

客户端可通过：

- HTTP：`GET /tasks/:taskId`
- WebSocket：订阅任务事件

WebSocket 接入地址：

```text
ws://<host>:<port>/vcp-memo-inbox/VCP_Key=<VCP_Key>
```

支持的客户端消息：

- `memo_subscribe_task`
- `memo_unsubscribe_task`

支持的服务端事件：

- `memo_task_accepted`
- `memo_task_progress`
- `memo_task_completed`
- `memo_task_failed`
- `memo_task_cancelled`

## 8. 当前接口清单

### 8.1 业务接口

- `POST /api/plugins/MemoInboxAPI/memos`
- `GET /api/plugins/MemoInboxAPI/memos/:memoId`
- `PATCH /api/plugins/MemoInboxAPI/memos/:memoId`
- `DELETE /api/plugins/MemoInboxAPI/memos/:memoId`
- `POST /api/plugins/MemoInboxAPI/memos/:memoId/restore`
- `DELETE /api/plugins/MemoInboxAPI/memos/:memoId/purge`
- `GET /api/plugins/MemoInboxAPI/memos`
- `GET /api/plugins/MemoInboxAPI/trash`
- `GET /api/plugins/MemoInboxAPI/search`
- `GET /api/plugins/MemoInboxAPI/review/random`
- `GET /api/plugins/MemoInboxAPI/review/daily`

### 8.2 任务与运维接口

- `POST /api/plugins/MemoInboxAPI/imports`
- `GET /api/plugins/MemoInboxAPI/tasks/:taskId`
- `GET /api/plugins/MemoInboxAPI/tasks/:taskId/errors`
- `POST /api/plugins/MemoInboxAPI/tasks/:taskId/cancel`
- `GET /api/plugins/MemoInboxAPI/maintenance/status`
- `POST /api/plugins/MemoInboxAPI/maintenance/reindex`
- `POST /api/plugins/MemoInboxAPI/maintenance/reconcile`
- `GET /api/plugins/MemoInboxAPI/status`

## 9. 错误响应要求

当前统一错误结构为：

```json
{
  "error": {
    "code": "MEMO_NOT_FOUND",
    "message": "memo not found",
    "status": 404
  }
}
```

当前已实现错误码：

- `INVALID_REQUEST`
- `MEMO_NOT_FOUND`
- `TASK_NOT_FOUND`
- `INTERNAL_ERROR`

## 10. 产品约束

- 这是单用户能力，不处理用户隔离。
- HTTP 是事实源，WebSocket 是增量通知通道。
- memo 的长期存储依赖现有日记文件体系，而不是独立数据库。
- 当前不承诺对附件做生命周期回收。
- 当前不承诺导入去重与幂等。
- 当前不承诺真正的随机回顾和高阶回顾策略。

## 11. 验收标准

- 能通过 Bearer Key 创建、读取、更新、删除和恢复 memo。
- 能创建带图片附件的 memo，并返回可访问的图片 URL。
- 能通过列表、详情、搜索与回收站接口获取 memo。
- 能发起导入、重建索引、对账任务，并获得 `taskId`。
- 能通过 HTTP 查询任务状态。
- 能通过 WebSocket 接收任务状态变更事件。
- 新创建 memo 落入 `dailynote/MyMemos/`，不引入独立持久化体系。

## 12. 后续演进建议

- 为 `GET /memos` 补齐标签和时间过滤能力。
- 将搜索从关键词过滤升级到 KnowledgeBaseManager 检索。
- 将导入模式扩展为真正的 `upsert`、去重和幂等导入。
- 为回顾能力引入真正随机与规则策略。
- 为维护接口补齐真实附件检查和漂移修复。
