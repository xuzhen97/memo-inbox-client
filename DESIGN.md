# Memo Inbox Client Design System

本文件是 `memo-inbox-client` 的项目级唯一视觉设计源。

本文直接基于 Stitch MCP 中该项目绑定的 design system asset 实际内容同步整理，不是摘要链接，也不是仅基于 screen 的二次推断。

## Source Of Truth

- Project Title: `Memo Inbox 中文原型 2026-04-10`
- Project ID: `projects/14700763739546365165`
- Design System Name: `Ethereal Archive`
- Design System Asset: `assets/7879825571a14de3afd4410d8c254f01`

后续通过 Stitch 生成原型、通过 Codex 落地页面、或对现有界面做视觉校正时，默认都以本文为准。

## 1. Overview & Creative North Star

这套设计系统的 North Star 是：

- `The Digital Curator`

它要脱离现代生产力工具那种高密度、急促、模板化的界面感，把数字信息当作档案、刊物和书桌上的对象来对待。

它是一个：

- desktop-first 的体验
- 面向反思与深度阅读的界面
- 更像高端文学刊物或数字档案台，而不是标准软件控制台

为了打破 SaaS 模板感，这套系统强调：

- intentional asymmetry
- tonal depth
- light misty paper layout
- generous whitespace

界面应该像一张被精心布置的桌面，每个对象都有位置和节奏，而不是一堆被线框切开的模块。

## 2. Colors: Tonal Atmosphere

色彩系统建立在自然、纸面、墨色和低噪声层次之上，而不是合成感很强的数码配色。

### The No-Line Rule

明确规则：

- 传统 `1px solid border` 不能作为主要分区方式。

边界必须通过这些方式建立：

1. 背景色层级变化
2. 垂直留白
3. 容器间的 tonal transition

### Surface Hierarchy & Nesting

界面要像一层层细纸叠起来。

- Base Layer: `surface` / `#FCF9F4`
  主画布。
- Level 1: `surface-container-low` / `#F6F3EE`
  用于轻侧栏、次级承接区、安静分区。
- Level 2: `surface-container` / `#F0EDE9`
  用于输入区、次级交互区、嵌套内容块。
- High Point: `surface-container-lowest` / `#FFFFFF`
  只用于最重要、最活跃、最需要被看的内容，例如当前阅读中的记忆卡片。

### The Glass & Gradient Rule

为了让界面不显得平、死、无气息：

- CTA 可以从 `primary` (`#0D2225`) 轻柔过渡到 `primary-container` (`#23373A`)
- 浮层可以使用半透明 `surface` 加 `20px` 左右 backdrop blur

但这些效果只能轻用，目的是增加 soul，不是让页面变成炫技玻璃风。

### Core Color Roles

- `surface`: `#FCF9F4`
- `surface-container-low`: `#F6F3EE`
- `surface-container`: `#F0EDE9`
- `surface-container-high`: `#EBE8E3`
- `surface-container-highest`: `#E5E2DD`
- `surface-container-lowest`: `#FFFFFF`
- `primary`: `#0D2225`
- `primary-container`: `#23373A`
- `secondary`: `#4E644E`
- `outline-variant`: `#C2C7C8`
- `on-surface`: `#1C1C19`
- `on-surface-variant`: `#424849`

Override accent references:

- Primary override: `#23373A`
- Secondary override: `#738A72`
- Tertiary override: `#C9A46A`

## 3. Typography: The Editorial Voice

Typography 是这套系统的核心，不只是“选什么字体”，而是“阅读”和“工具性”怎么分层。

当前 design system 方向：

- Display & Headline: `Newsreader`
- Title & Body: `Manrope`

### Headline

用于：

- 页面标题
- 档案感页头
- 需要呈现 authority 与 elegance 的位置

它应该像：

- broadsheet newspaper
- 文学刊物标题
- 安静但有气势的栏头

建议逻辑：

- `Headline-LG`: 约 `2rem`
- serif

### Body

用于：

- 元信息
- 导航
- 输入区
- 正文说明
- 组件标签

`Manrope` 的作用是给衬线标题提供干净、现代、稳定的对照。

### Chinese Typeface Strategy

中文实现时必须保持同一逻辑：

- 标题使用高质量宋体 / 衬线中文字体
- 正文使用干净的黑体 / 无衬线中文字体

推荐映射：

- 标题：`Noto Serif SC`, `Source Han Serif SC`, serif
- 正文：`Manrope`, `Noto Sans SC`, `Source Han Sans SC`, sans-serif

## 4. Elevation & Depth: Atmospheric Layering

这套系统拒绝传统 Material Design 那种明显厚重的阴影。

### The Layering Principle

层次主要通过“叠放”实现：

- 把 `surface-container-lowest` 放在 `surface-container-low` 上面

这本身就应该形成自然、柔和的抬升，不需要额外一层重阴影。

### Ambient Shadows

只有当元素真的需要“浮起来”时，例如 context menu，才使用环境阴影。

规则：

- 颜色：基于 `on-surface` (`#1C1C19`)
- 透明度：`4%-6%`
- 模糊：`20px-40px`
- Y offset：轻微下移，约 `4px`

这种阴影应像柔和棚灯下的空气感，而不是明显的卡片投影。

### The Ghost Border Fallback

如果因为可访问性要求必须给边界：

- 使用 `outline-variant` (`#C2C7C8`)
- 透明度约 `15%`

原则：

- border 必须“被感觉到”，而不是“先被看到”

## 5. Components

### Buttons

- Primary:
  `primary` 背景，`on-primary` 文本，`md` 级中等圆角，无阴影
- Secondary:
  `surface-container-high` 背景，无边框
- Tertiary:
  纯文本动作，hover 时出现 `Cloud Blue Gray` (`#D9E4E8`) 下划线或轻托底

按钮不应该有营销页式夸张强调，也不应该有硬朗弹起感。

### Input Fields

规则：

- 极简
- 不使用传统底线输入框
- 不使用厚盒子输入框
- 使用 `surface-container` 作为输入区背景
- Focus 时过渡到 `Input Focus` (`#D9E4E8`)
- 使用 soft glow，而不是强描边高亮
- Label 使用 `label-md`，颜色为 `on-surface-variant`

### Cards & Lists

规则：

- 禁止 divider lines
- 列表项之间使用 `1.5rem-2rem` 的纵向呼吸区
- hover 时从 `surface` 转向 `surface-container-low`

卡片要靠留白和层级组织，不靠边框切块。

### Chips (Tags)

规则：

- pill 形
- Success / Archived 状态使用 `Moss Green` (`#738A72`)
- Review 状态使用 `Warm Amber` (`#C9A46A`)
- 使用 10% opacity 的 tint 背景
- 文本保持 100% 可读

### The Memory Thread

如果需要表达记忆流，不要做 chat UI。

应该做成：

- 纵向 thread
- 极细 `0.5px` 虚线
- 节点以低调 dot 收尾

它应该像 timeline 或档案索引，而不是对话气泡。

## 6. Do’s and Don’ts

### Do

- 允许留白比内容本身更大
- 使用 tonal shifts，而不是线条，来定义结构
- 保持 moderate rounding
- 让页面像被整理过的桌面，而不是填满的容器网格

### Don’t

- 不要 dense widget grid
- 不要 purple / SaaS blue
- 不要 rigid data table
- 不要 hover pop
- 不要厚重阴影
- 不要依赖边框组织页面

## 7. Implementation Notes For Memo Inbox Client

以下内容用于把 Stitch 设计系统落到当前项目。

### Cross-Platform Skeleton

Desktop 应保持：

- 统一 header
- 主内容区
- 安静右 rail

Mobile 应保持：

- 顶部统一节奏
- 连续内容流
- 固定底部导航

### Page Intent

- Inbox:
  第一视觉锚点是书写和收纳，不是管理
- Review:
  是 resurfacing，不是 algorithmic recommendation
- Search:
  是同一产品中的 retrieval mode，不是另一套工具页
- Detail:
  是 reading-first 页面，正文优先于操作

### Chinese Copy Tone

中文文案必须：

- 温和
- 克制
- 清楚
- 无运营腔
- 无教程腔

推荐基线：

- `记忆收件箱`
- `先记下来，整理可以晚一点`
- `记下此刻的想法...`
- `记录这条想法`
- `已收入记忆`
- `搜索一句话、一个标签，或者某段时间的记忆`
- `今日回顾`

## 8. Anti-Drift Checklist

在新增页面、编辑 Stitch screens、或实现前端页面前，先检查：

1. 是否仍然是同一个 editorial archive 家族？
2. 是否仍然通过 tonal shifts 和留白组织界面？
3. 是否仍然遵循 serif headline + sans body 的排版逻辑？
4. 是否仍然遵循 no-line rule？
5. 是否仍然避免后台化、聊天化、营销页化？
6. 颜色是否仍然围绕 paper, ink, moss, warm amber，而不是新起一套高饱和主题？

只要其中任意一项不成立，就说明设计已经漂移，需要先校正。
