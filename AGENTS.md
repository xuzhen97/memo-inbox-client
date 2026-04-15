# memo-inbox-client AGENTS

本文件为 `memo-inbox-client` 项目的局部约束。

它用于补充仓库根级 `AGENTS.md`，只定义本项目自己的产品、设计、架构和实现边界，不重复根级通用安全规则。

## 1. Source Of Truth

本项目开发时，按以下顺序建立事实源：

1. `DESIGN.md`
   视觉与交互事实源。后续 Stitch 原型、Codex 前端实现、页面重构都必须先对齐这里。
2. `MEMO_INBOX_PRD.md`
   产品能力与当前范围事实源。是否支持某能力、当前能力是否简化、哪些行为不能被 UI 暗示，先看这里。
3. 当前代码实现
   当文档与代码不一致时，不允许凭感觉补齐。必须先读代码确认，再决定是修代码、修文档，还是向用户确认。
4. `README.md`
   工程目录、构建方式、工作区命令的事实源。

如果 `DESIGN.md`、`MEMO_INBOX_PRD.md` 和代码实现之间存在冲突，禁止自行脑补产品行为。

## 2. Product Identity

`memo-inbox-client` 是 `MemoInboxAPI` 的三端客户端，不是独立笔记系统，也不是聊天应用或管理后台。

它的核心定位：

- 单用户 memo 客户端
- 面向 Web / Desktop / Mobile 的统一产品壳层
- 消费 `MemoInboxAPI` 提供的 HTTP / WebSocket 能力
- 前端不自创一套平行持久化或平行业务模型

必须始终记住：

- HTTP 是事实源
- WebSocket 是增量通知通道
- 长期存储依赖现有 `DailyNote / MyMemos` 链路，而不是客户端私有数据库

## 3. Current Supported Scope

当前可以围绕以下能力设计和实现客户端：

- 创建 memo
- 列表浏览
- 查看详情
- 更新内容与标签
- 软删除、恢复、永久删除
- 回收站查看
- 基础搜索
- 回顾入口
- 导入任务
- 任务状态查询
- 任务 WebSocket 订阅与推送

如果要实现 UI、状态流或交互，默认只能围绕以上能力展开。

## 4. Current Simplifications

以下不是“未来可能支持”，而是“当前实现已经存在的简化现实”。客户端必须如实反映，不能包装成已经完整支持：

- `GET /memos` 当前只支持 `limit` 与 `cursor`，不要默认设计成完整标签/时间过滤列表页。
- 搜索当前是关键词和标签过滤，不是语义搜索，不要用“智能检索”“语义召回”之类文案暗示。
- `review/random` 当前不是真随机，不要包装成复杂回顾引擎。
- `imports` 当前没有真正实现 `upsert` / `skip_duplicates` 语义，不要设计成强幂等导入控制台。
- 任务 `cancel` 当前只更新任务状态，不保证中断后台执行，不要做“立即终止并回滚”式强承诺 UI。

## 5. Explicit Non-Goals

除非用户明确要求并同步推动后端能力变更，否则默认不做以下方向：

- 多用户与租户隔离
- 独立认证域
- 对外语义搜索 / RAG 检索 API
- 附件去重与附件生命周期回收
- 复杂回顾策略
- 完整任务取消语义
- 图谱关系界面
- 知识库关系浏览器
- 大盘式运营统计页
- 通用聊天式交互主界面

如果界面会让用户自然理解为这些能力已存在，就算越界。

## 6. Design Constraints

所有可见界面必须遵守 `DESIGN.md`。

核心要求：

- 使用 `DESIGN.md` 中同步下来的 Stitch design system 作为视觉真相
- 遵守 `The Digital Curator` 的产品气质
- 遵守 `No-Line Rule`
- 通过 tonal shifts、留白、表面层级组织信息，而不是依赖线框切块
- 使用 serif headline + sans body 的排版逻辑
- 保持 paper / ink / moss / warm amber 的配色体系
- 不引入 purple SaaS、后台化、聊天化、营销页化的视觉语言

跨端约束：

- Desktop 保持统一 header + main content + quiet right rail
- Mobile 保持统一顶栏节奏 + 连续内容流 + 固定底部导航
- 新页面必须像同一产品中的新模式，而不是另一套站点

文案约束：

- 所有可见文案默认使用简体中文
- 文案语气保持温和、克制、清楚
- 不使用运营腔、教程腔、命令式强提示

## 7. Architecture Boundaries

目录和包职责必须稳定，不允许随手污染边界。

### `apps/*`

三端入口壳层，只负责：

- 平台入口
- 挂载共享应用
- 承载各自平台配置

禁止：

- 在入口层堆业务逻辑
- 在入口层维护复杂业务状态
- 在多个 app 内复制同一功能实现

### `packages/app-core`

应用装配层。

负责：

- 路由
- 页面组合
- providers
- feature integration
- app-level hooks 和 orchestration

### `packages/api-client`

服务端接入层。

负责：

- HTTP client
- Task WebSocket client
- 请求归一化
- 错误映射

禁止：

- 放 UI 状态
- 放平台存储
- 放视觉逻辑

### `packages/shared-types`

共享契约层。

负责：

- DTO
- 请求/响应类型
- 错误类型
- 配置类型

禁止：

- 行为逻辑
- UI 类型别名滥用
- 与单一页面强耦合的私有类型

### `packages/platform-bridge`

平台抽象层。

负责：

- Web / Desktop / Mobile 平台能力桥接

禁止：

- 直接承载服务端业务逻辑
- 隐式读取服务端配置并控制业务行为

### `packages/ui-kit`

通用视觉与基础组件层。

负责：

- design token 落地
- 可复用 presentational primitives
- 基础组件样式与状态表达

禁止：

- 直接依赖业务接口
- 承担页面编排
- 混入 MemoInboxAPI 请求细节

### `packages/editor-markdown`

编辑器边界层。

负责：

- Markdown / 编辑体验能力

禁止：

- 混入应用装配
- 混入平台壳逻辑

## 8. Implementation Rules

开发时必须遵守以下规则：

- 先读 PRD 和 `DESIGN.md`，再动手实现页面或交互。
- 不允许因为“UI 更完整”就擅自补出后端不存在的能力。
- 不允许在 UI 中暗示一个能力可靠可用，而底层实际上只是占位或简化实现。
- 如果发现 PRD 与代码不一致，先读代码确认，再向用户说明，不要私自选一个版本当真相。
- 复用已有 DTO、client、design token 和组件，不要重复发明。
- 保持 `apps/*` 薄，保持共享逻辑进入 `packages/*`。
- 新增 feature 时，优先放在 `app-core` 或清晰的新共享包，不要把业务代码塞进 `ui-kit`、`platform-bridge` 或入口 app。
- 代码注释语言与现有代码库保持一致。

## 9. UI Truthfulness Rules

客户端页面必须对当前后端能力“诚实”。

具体要求：

- 没有真实能力支持时，不要用已完成态视觉和已上线文案误导用户。
- 占位能力如果必须展示，必须明确为未接入、开发中或只读信息。
- 不要生成看似完整的数据统计、图表或状态面板，除非后端真实提供并且字段可信。
- 不要把当前简化实现包装成“智能”“自动”“语义”“实时一致性修复”。

## 10. Verification Expectations

完成改动前，至少验证受影响范围。

默认要求：

- 改动类型契约时，检查 `shared-types` 和依赖它的包
- 改动 API 接入时，检查 `api-client`
- 改动共享装配或页面时，检查 `app-core`
- 改动某端壳层时，检查对应 app

优先执行：

- `typecheck`
- 相关 `test`
- 受影响 app 或 package 的 `build`

如果因为环境或范围限制未执行，必须明确说明。

## 11. Anti-Drift Checklist

提交任何页面、交互或结构改动前，先自检：

1. 这个改动是否仍然符合 `MEMO_INBOX_PRD.md` 的当前产品范围？
2. 这个改动是否仍然符合 `DESIGN.md` 的设计系统？
3. 这个改动是否保持了当前后端能力的真实边界？
4. 这个改动是否守住了包职责和目录边界？
5. 这个改动是否避免了重复实现和跨层污染？

只要有任意一项答案是否定的，就先修正，再继续。

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **memo-inbox-client** (1646 symbols, 4520 relationships, 136 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/memo-inbox-client/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/memo-inbox-client/context` | Codebase overview, check index freshness |
| `gitnexus://repo/memo-inbox-client/clusters` | All functional areas |
| `gitnexus://repo/memo-inbox-client/processes` | All execution flows |
| `gitnexus://repo/memo-inbox-client/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## Keeping the Index Fresh

After committing code changes, the GitNexus index becomes stale. Re-run analyze to update it:

```bash
npx gitnexus analyze
```

If the index previously included embeddings, preserve them by adding `--embeddings`:

```bash
npx gitnexus analyze --embeddings
```

To check whether embeddings exist, inspect `.gitnexus/meta.json` — the `stats.embeddings` field shows the count (0 means no embeddings). **Running analyze without `--embeddings` will delete any previously generated embeddings.**

> Claude Code users: A PostToolUse hook handles this automatically after `git commit` and `git merge`.

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
