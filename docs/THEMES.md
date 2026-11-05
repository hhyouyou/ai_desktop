# 桌面主题系统

**全站 5 套主题**，可随时切换，默认「纸面工作台」。主题由 cookie 持久化，根布局在服务端把 `data-theme` 写到 `<html>` 上，刷新不闪。首页「在线桌面」还有一套独立的 `--d-*` token（窗口/壁纸/Dock），内页复用 Tailwind 的 `--color-*` 与新增的 `--ds-*` 设计令牌。

## 怎么用

- 首页右下角「◎ 主题」切换；
- 或 `/settings` → 「桌面外观」（带色板预览）；
- 深链：`/?theme=glass`（也会顺手保存）。

| id | 名称 | 类型 |
|---|---|---|
| `clear` | 清爽桌面 | skin |
| `glass` | 毛玻璃桌面 | skin |
| `minimal` | 极简工作台 | skin |
| `tiling` | 平铺工作台 | layout |
| `paper` | 纸面工作台（默认） | layout |

## 实现结构

```text
lib/theme.ts                    主题注册表（id / 名称 / 描述 / 色板 / kind）+ cookie 名
app/(desktop)/page.tsx          唯一的桌面页；按 cookie 或 ?theme= 决定 data-theme
app/(desktop)/layout.tsx        只引入 desktop.css
app/desktop.css                 首页桌面结构 + 5 套 [data-theme] 的 --d-* token
app/themes.css                  全站主题层：覆盖 --color-* / --radius-* / --font-* / --ds-* 令牌
app/api/theme/route.ts          POST 写入一年期 cookie；GET 读取当前值
components/desktop/theme-picker.tsx   右下角切换器（立即生效 + 写 cookie）
components/desktop/desk-clock.tsx     顶栏/小组件时钟（避免水合不一致）
components/user/appearance-panel.tsx  设置页外观面板
app/(site)/**                   其余页面（工具 / AI / 待办 / 热点…）保持原布局
```

### 为什么切换不闪

1. 首次访问：`page.tsx` 在服务端用 `cookies()` 读 `bs_theme`，把值写进 `<div class="desk-root" data-theme="...">`；
2. 点击切换：先在浏览器里改 `data-theme`（立即生效），再 `POST /api/theme` 写 cookie；
3. 下次刷新：服务端直接渲染成新主题，没有「先默认再切换」的过程。

`?theme=` 参数优先级高于 cookie，用于分享与截图；`localStorage` 只作为 cookie 被清掉后的兜底。

### 皮肤 vs 布局

- **skin（01/02/03）**：只覆盖 `--d-*` token（颜色、圆角、阴影、模糊、字体），DOM 完全不变。
- **layout（04/05）**：仍然复用同一份 DOM，用 `display: contents` 把 `.stage` / `.widgets` 摊平进外层网格，再用 `grid-template-areas` 重排成「四宫格 / 纸面便签」。

所以新增一套皮肤 = 注册表加一条 + 一段 40–60 行的 token 覆盖；新增布局 = 再加 30–50 行结构覆盖。

## 新增一套主题

1. `lib/theme.ts`：`ThemeId` 加 id，`THEMES` 加一条（名称、描述、色板、kind）；
2. `app/desktop.css`：复制一段 `[data-theme="xxx"]` token 块改值；布局型再加结构覆盖；
3. 跑 `npm run typecheck`，刷新首页即可在切换器和设置页看到新主题。

## 验证

```bash
npm run typecheck
node scripts/smoke.mjs            # 全站路由
node scripts/cdp-theme.mjs        # 真实浏览器点选 4 个主题，校验 data-theme / localStorage / cookie
node scripts/cdp-shot.mjs /       # CDP_MOBILE=1 可截移动端
```

当前已知边界：

- 全站主题依赖根布局读 cookie，因此所有页面按动态渲染处理；
- `paper` / `tiling` 是布局型主题，移动端会退化成单列 / 四行；
- 主题切换依赖 cookie，纯静态导出（`output: export`）不适用。

## 视觉语言：首页与内页共用同一套令牌

每套主题同时定义首页桌面的 `--d-*` 和内页的 `--color-*` / `--ds-*`，所以两边永远同步。默认的「纸面工作台」是米白纸面 + 图钉便签 + 宋体；下面以「清爽桌面」为例说明映射关系：

| 元素 | 做法 |
|---|---|
| 页面底色 | 与桌面壁纸同族的浅蓝渐变（`html[data-theme="clear"] body`） |
| 卡片 | 白面 + 1px 半透明边 + 20px 圆角 + 柔和投影（`--ds-*`） |
| 按钮 | 主按钮蓝色实心；次按钮白面细边；**去掉位移与硬投影** |
| 标签 | 淡彩底 + 深色字（`tag-*` 在 clear 主题下的专用配色） |
| 字体 | 标题也改用无衬线（`--font-display` 覆盖），不再用 Arial Black |
| 统计/图表 | `Stat`、`MiniStat`、待办图表全部改成白卡 + 彩色小圆点，SVG 颜色改用 `var(--color-*)` |

> 结论：这不是"两套设计"，而是同一套 token 在首页（`--d-*`）和内页（`--color-*` / `--ds-*`）上的两次映射。

## 主题参数同步（避免"首页换了、内页没换"）

`proxy.ts` 会处理任意页面上的 `?theme=xxx`：写入一年期 cookie 并重定向到去掉参数的地址。
因此 `/apps?theme=glass`、`/?theme=paper` 都会让**整站**切到对应主题，而不再是只有首页生效。

## 页面样式没更新？先按这个顺序排查

1. **硬刷新**：`Ctrl + Shift + R`（macOS：`Cmd + Shift + R`），或打开无痕窗口访问；
2. **确认主题**：`/api/theme` 返回的 `theme` 是否是你选的那套；不是就回设置页重选一次；
3. **开发服务器缓存**：`next dev` 偶发 CSS 未热更新，重启 `npm run dev`；
4. **彻底清缓存**：停服后删掉 `.next` 目录再启动（`npm run dev:clean`）；
5. **多实例**：确认只跑了一个 `next dev`（端口 4310），旧进程会继续返回旧样式。
## 纸面主题的内页统一（默认主题）

纸面工作台是默认主题，首页桌面只是一部分；内页现在复用了同一套"纸面语言"，靠 9 个语义类挂钩：

| 位置 | 类名 | 纸面做法 |
|---|---|---|
| 顶栏 | `.topbar` / `.topbar-nav a.on` | 与桌面主页同一套：桌面 / 工具 / AI / 待办 / 热点 + 更多；选中项纸面下划线（其它主题为浅底胶囊） |
| 页头 | `.page-head` / `.page-head-icon` | 去掉整块奶油色横带，改纸面 + 虚线；标题宋体；图标改纸片 + 陶土色 |
| 卡片 | `.tool-card` | 6px 圆角、暖色阴影、顶部一道胶带 |
| 图标 | `.tool-tile` | 高饱和色块改为纸片底 + 陶土色线性图标 |
| 筛选 | `.filter-chip[data-active]` | 选中用陶土色下划线 |
| 页脚 | `.site-footer` | 透明 + 虚线分隔 |

这些类只影响 `html[data-theme="paper"]`，其余四套主题的观感不变。想看内页效果：

```bash
CDP_THEME=paper node scripts/cdp-shot.mjs /apps /settings /apps/json-reader /article/why-blockset
```
## 内页背景与主页壁纸一致

内页 `body` 不再是独立的纹理，而是复用各主题主页壁纸的配方：

| 主题 | 主页壁纸 | 内页背景 |
|---|---|---|
| 纸面（默认） | 纯色 `#efe9dc` | 纯色 `#efe9dc`（已去掉 5px 圆点纹理） |
| 清爽 | 渐变 + 22px 点阵 | 同款渐变 + 22px 点阵 |
| 毛玻璃 | 深色渐变 + 44px 细网格 | 同款渐变 + 44px 细网格 |
| 平铺 | 纯色 + 32px 网格 | 同款纯色 + 32px 网格 |
| 极简 | 纯色 `#fbfbfa` | 纯色 `#fbfbfa` |

像素级复核（主页 vs 内页同一点）：纸面 `(239,233,220)`、清爽 `(238,242,251)`、极简 `(251,251,250)` 完全一致；毛玻璃/平铺的 1 单位差异来自渐变/网格采样点，视觉一致。
## 胶带统一

纸面主题的胶带只有一套配方：`72×17px`、`rotate(-1.5deg)`、`rgba(214,198,168,.55)` + `1px rgba(180,160,125,.5)` 描边，居中贴在卡片上沿（一半在外、一半压在卡上）。

之前首页四处胶带看起来不一样，是因为 `.win` 设置了 `overflow: hidden`，把露在卡片外的上半截裁掉了；而右侧「今日热点」是 `.wgt`，不裁切。现在纸面主题里放开了 `.win` 的裁切（聊天/待办各自内部滚动），内页 `.tool-card` / `.surface` 也用同一套尺寸和角度。
## 顶栏排版统一

主页 `.bar` 与内页 `.topbar` 的排版参数完全一致：字号 `12.5px`、行高 `1.6`、字族 `PingFang SC → Microsoft YaHei → system-ui`、导航项 `padding: 6px 11px`、选中态 `padding-bottom: 3px` + `1px` 下划线。

之前切换「桌面/工具」时 tab 会有细微大小变化，原因有两个：

1. 内页 `body` 的 `--font-sans` 第一顺位是 `Segoe UI`，而桌面用的是 `PingFang SC / Microsoft YaHei` —— 同一段文字在两种字体下字宽不同；
2. 内页导航项写了 `line-height: 1.2`、选中态 `padding-bottom: 5px`，桌面是继承行高 `1.6` + `3px`，顶栏高度因此差约 1–2px。

现在 CDP 实测两边：顶栏高度 `63px`、字族 `PingFang SC`、导航项 `47×32`，完全一致。
## 热点页：报纸 / 剪报版面

热点页原来是一张张"应用组件卡"，和纸面主页的气质不搭。现在改成一张"阅读版面"（顶部四栏数据条已按要求移除，相关数字保留在页头标签和"全部来源"下方状态行）：

| 区块 | 之前 | 现在 |
|---|---|---|
| 来源侧栏 | 每项一个圆角按钮，选中变黑底 | **目录式索引**：宋体序号 01–08、虚线分隔、选中用陶土色左线 + 淡底 |
| 栏目卡 | 圆角卡片 + 彩色图标块 + 排名方块 | **剪报**：宋体栏名 + 陶土色小方块、细虚线分隔、排名改宋体数字（前 3 名陶土色） |
| 版面页眉 | 普通标题行 | 双线分隔的"版面头"，标题宋体 |
| 跳转/刷新 | 实心按钮 | 「查看全部」改虚线下划线链接，刷新按钮保留 |

样式全部用 token（`--color-cream`、`--ds-border`、`--font-display`、`--color-coral`），所以清爽/毛玻璃/极简/平铺会各自适配；纸面额外给来源卡加了一道胶带。移动端：概览变 2×2，来源变横向滑动的标签，栏目单列。