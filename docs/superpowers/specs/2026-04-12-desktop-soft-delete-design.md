# Desktop Soft Delete Design

**项目**: `memo-inbox-client`
**日期**: `2026-04-12`
**范围**: `apps/desktop` 对接 memo 软删除
**状态**: 已确认设计，待用户审阅

## 1. 背景

当前桌面端页面由 `packages/app-core/src/screens/DesktopInbox.tsx` 提供主界面能力，已经接入：

- memo 创建
- memo 列表查询
- memo 搜索
- 基础筛选

服务端接入层 `packages/api-client` 已经存在：

- `apiClient.memos.remove(memoId)` 软删除
- `useRemoveMemo(apiClient)` 删除 mutation

因此当前缺口不是后端协议或 SDK，而是桌面端没有提供软删除入口与交互闭环。

## 2. 目标

仅为桌面端实现 memo 软删除能力，形成最小闭环：

- 用户可以从桌面收件流中删除一条 memo
- 删除行为调用现有 `DELETE /memos/:memoId`
- 删除成功后列表自动刷新，不需要手工刷新页面

## 3. 非目标

本次明确不包含以下内容：

- 回收站页面
- 恢复能力
- 永久删除
- 批量删除
- 键盘快捷删除
- 全局通知系统
- 新的共享业务模块抽象

## 4. 方案选择

### 方案 A：卡片悬浮删除入口 + 二次确认

这是本次采用方案。

做法：

- 在桌面 memo 卡片右上角提供删除入口
- 默认低可见，仅在 hover 或确认态时出现
- 点击后在当前卡片内展开轻量确认操作
- 用户确认后调用 `useRemoveMemo`

优点：

- 改动最小
- 不破坏当前桌面端阅读流
- 误删风险可控
- 复用现有 API 和 React Query 刷新机制

### 方案 B：常驻删除按钮 + 二次确认

不采用。

原因：

- 视觉干扰更强
- 与当前“克制、安静”的桌面卡片风格不一致

### 方案 C：点击即删

不采用。

原因：

- 误删风险过高
- 不符合删除操作的安全预期

## 5. 交互设计

### 5.1 删除入口

- 每条 memo 卡片右上角显示一个删除按钮
- 非 hover 状态下保持低可见
- hover 时增强可见性

### 5.2 确认流程

- 首次点击删除按钮，不立即请求后端
- 卡片顶部右侧切换为确认态
- 确认文案表达为“移入回收站”
- 提供“确认删除”和“取消”两个动作

### 5.3 删除中状态

- 当前卡片进入 pending 状态
- 禁用重复点击
- 删除按钮与确认按钮不可重复提交

### 5.4 删除后反馈

- 删除成功：当前列表自动刷新，已删除 memo 从活动列表消失
- 删除失败：在页面内显示简短中文错误提示

## 6. 数据与状态流

### 6.1 数据流

1. 用户点击某条 memo 的删除入口
2. 页面记录当前待删除 memoId
3. 用户确认后调用 `removeMemo(memoId)`
4. `useRemoveMemo` 触发后端软删除请求
5. mutation 成功后，React Query 失效 `memos detail/list`
6. 列表重新获取，已删除 memo 不再出现在当前流中

### 6.2 页面状态

桌面页新增的状态仅限本页：

- `pendingDeleteMemoId`: 当前处于确认态的 memo
- `deleteErrorMessage`: 最近一次删除失败提示

不新增跨页状态，不新增平台桥接状态，不新增本地持久化。

## 7. 代码边界

### 7.1 修改位置

本次实现应尽量只改以下层：

- `packages/app-core/src/screens/DesktopInbox.tsx`

如需少量复用样式，可考虑使用现有按钮样式能力，但不应为了本次需求重构 `ui-kit`。

### 7.2 不改动层

- `apps/desktop` 入口层不加业务逻辑
- `packages/platform-bridge` 不参与删除流程
- `packages/shared-types` 不新增类型
- `packages/api-client` 原则上不新增接口，直接复用现有 `useRemoveMemo`

## 8. 错误处理

- 如果接口失败，保留当前列表内容
- 清除 pending 删除态
- 显示简短错误提示，例如“删除失败，请稍后重试”
- 不引入 toast 系统或复杂错误映射扩展

## 9. 测试与验证

至少覆盖以下验证：

- 桌面页可正常渲染删除入口
- 点击删除后出现确认态，而不是立即发请求
- 确认后调用软删除 mutation
- 删除成功后列表刷新
- 删除失败后页面显示错误提示且不会卡在 pending 状态

优先执行：

- `pnpm --filter "@memo-inbox/app-core" test` 或相关测试
- `pnpm --filter "@memo-inbox/desktop" build`

如果当前仓库没有现成测试覆盖入口，则至少完成构建验证并在结果中明确说明测试缺口。

## 10. 验收标准

- 桌面端每条 memo 都有可用的软删除入口
- 删除前存在明确确认步骤
- 删除调用现有软删除 API，而不是前端伪删除
- 删除成功后 memo 从当前活动列表消失
- 本次改动不引入恢复、永久删除、回收站浏览等额外能力
