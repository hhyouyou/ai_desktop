# 块集 BlockSet · 开发约定（团队成员必读）

> 本文件是所有并行开发者的唯一约定来源。先读完，再动手。**不要修改本文件。**

## 1. 项目概览

- 产品：中文在线工具箱 + AI 助手 + 每日热点 + 待办，站点名「块集 BlockSet」
- 定位：原创独立产品，功能方向参考通用工具箱类站点，**视觉、文案、代码全部自研**，不得复制任何第三方站点的 Logo、名称、文案
- 技术栈：Next.js 16.4（App Router / Turbopack）+ React 19 + TypeScript strict + Tailwind CSS v4 + better-sqlite3
- 视觉风格：**明快几何** —— 米白纸底、3px 粗黑描边、硬投影、大圆角、高饱和撞色（珊瑚/柠檬黄/电蓝/薄荷绿/紫/天蓝）
- 语言：界面文案全部中文，语气克制、具体、不吹牛；英文只做 `eyebrow` 小标签（如 `TOOLS`、`DAILY HOT`）

## 2. 运行环境（非常重要）

- **本地 dev server 已经由 Lead 启动**：<http://127.0.0.1:4310>，支持热更新。
- **禁止**执行 `npm install`、`npm run dev`、`npm run build`、`next build`、`next dev`：
  - 本机沙箱禁止 fork 子进程，`next dev/build` 会 `spawn EPERM` 失败；
  - Lead 已经跑了一个共享的 dev server，你另起会抢端口 / 破坏 `.next`。
- 你的验证方式只有两种：
  1. 类型检查：`node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json --incremental false`
  2. 等热更新后请求页面：`Invoke-WebRequest -Uri "http://127.0.0.1:4310/<path>" -UseBasicParsing`
- 不要修改 `package.json` 加依赖。**只用已安装的依赖**：`next react react-dom better-sqlite3 marked qrcode spark-md5`。
- 写入范围：只写你任务里列出的目录/文件。公共文件出问题 → 报告 Lead，不要自己改。

## 3. 设计系统（Tailwind v4 + 全局 class）

色板 token（可直接用于 Tailwind：`bg-coral`、`text-ink-soft`、`border-ink`）：
`paper #FFFCF5` / `cream #F4EFE3` / `ink #14110F` / `ink-soft #58514A` /
`coral #FF5A36` / `sun #FFC93C` / `blue #2F5BFF` / `mint #00C48C` /
`violet #9B6BFF` / `sky #7FD1FF`

全局 class（定义在 `app/globals.css`）：

| 类别 | class |
|---|---|
| 容器 | `shell`（最大宽 1240 + 左右 padding） |
| 卡片 | `surface`（3px 边 + 6px 硬投影）/ `surface-flat` / `surface-tight`（2px 边 + 18px 圆角）/ `surface-cream` |
| 投影 | `shadow-hard` / `shadow-hard-sm` / `shadow-hard-lg` / `shadow-hard-coral` |
| 按钮 | `btn` + `btn-primary`（珊瑚）/ `btn-sun` / `btn-blue` / `btn-mint` / `btn-ink` / `btn-sm` / `btn-lg` / `btn-ghost` |
| 标签 | `tag` + `tag-sun` / `tag-coral` / `tag-mint` / `tag-blue` / `tag-violet` / `tag-ink` |
| 表单 | `field` / `field-sm` / `label` |
| 排版 | `eyebrow`（等宽小号大写）/ `display-xl` / `display-lg` / `prose-blockset`（文章正文） |
| 背景 | `grid-bg` / `dot-bg` / `stripe-bg` |
| 动效 | `hover-lift` / `marquee-track` / `float-slow` / `float-slower` / `spin-slow` / `stream-cursor`（流式光标） |

排版规则：
- 页面标题用 `display-lg`，超大主视觉用 `display-xl`；正文 13–16px，`text-ink-soft` 做次级文字。
- 卡片永远「粗边 + 硬投影 + 大圆角（18/22/26/32）」；圆角按钮用 `btn`（pill）。
- 网格间距用 `gap-3/4/5/6`；区块上下留白 `py-14 md:py-16`；页面顶部内容区用 `PageHeader`。
- 图标统一用 `@/components/icons` 的 `<Icon name="..." size={n} />`（`IconKey` 见 `lib/site.ts`）。**不要引入图标库**。
- 允许在 `*.module.css` 写页面专属样式；**不要改 globals.css**。

## 4. 公共模块（Lead 所有，只读使用）

```ts
import { db } from "@/lib/db";                     // better-sqlite3 单例，表已建好
import { getViewer, signSession, SESSION_COOKIE } from "@/lib/auth"; // 当前访问者
import { SITE, TOOLS, getTool, TOOL_CATEGORIES, toolsInCategory, getCategory, MODULES, NAV_GROUPS } from "@/lib/site";
import { Icon, Logo } from "@/components/icons";
import { PageHeader, SectionHeading, EmptyState, Stat } from "@/components/ui/section-heading";
import { ToolCard } from "@/components/tool-card";
import { ACCENT_TILE, ACCENT_TAG, ACCENT_TEXT } from "@/lib/accent";
import { cn, uid, formatDate, relativeTime, localDateKey, formatBytes, downloadBlob, percent, truncate } from "@/lib/utils";
import { getCachedBoards, getCachedBoard, HOT_SOURCES, saveBoard, sourceMeta } from "@/lib/hot";
import { getArticles, getArticle, getLatestArticles } from "@/lib/articles";
```

`getViewer()` 是 async，返回：

```ts
type Viewer = { id: string; name: string; kind: "anon" | "email"; email: string | null; anonymous: boolean };
```

匿名访客由 IP+UA 派生，自动建用户行。**所有用户数据都要按 `viewer.id` 隔离。**

## 5. 数据库表（已在 lib/db.ts 建好，不要改 schema）

| 表 | 关键列 |
|---|---|
| `users` | id, kind, identity, name, pass_hash, pass_salt, created_at |
| `todos` | id, user_id, title, note, priority(1高/2中/3低), due_date(YYYY-MM-DD), done, created_at, completed_at |
| `favorites` | user_id, tool_slug, created_at（联合主键） |
| `schedules` | id, user_id, title, note, run_at(ms), repeat('none'/'daily'/'weekly'), enabled, last_run_at, created_at |
| `threads` | id, user_id, title, mode, created_at, updated_at |
| `messages` | id, thread_id, role('user'/'assistant'/'system'), content, created_at |
| `drawings` | id, user_id, prompt, model, status, payload(URL 或 SVG), mime, created_at |
| `announcements` | id, title, body, pinned, created_at |
| `briefs` | id, date(唯一), payload(JSON), created_at |
| `hot_cache` | source, payload(JSON), fetched_at |
| `meta` | key, value |

sqlite 写入是真同步的，注意批量操作包事务：`db.transaction(fn)()`。

## 6. 编码约定

- 组件默认 Server Component；用到 `useState/useEffect/onClick/window` 的文件首行 `"use client"`。
- 路由参数在 Next 16 是 Promise：
  ```ts
  export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
  }
  ```
- 路由处理器：`export async function GET(req: NextRequest)`，返回 `NextResponse.json({ ok: true, data })`；
  失败统一 `{ ok: false, error: "中文错误信息" }` + 合适的 status。
- 文件与组件命名：页面 `app/<route>/page.tsx`，业务组件放 `components/<模块>/`，逻辑放 `lib/<模块>.ts`。
- 所有交互必须有：空状态、加载中、错误提示；按钮点击禁用防重复提交。
- 响应式：≤640 单列、768 两列、1024+ 三/四列。不要出现横向滚动条。
- 无障碍：`<button>` 不用 div 模拟；图标按钮加 `aria-label`；表单控件配 `label`。
- 不要 `any`；不要 `@ts-ignore`；不确定的类型自己写 interface。
- 中文文案不堆砌感叹号，不用「赋能/闭环/一站式」这类词。

## 7. 演示模式（AI 模块强制要求）

AI 相关功能必须满足：**没有 API Key 时页面不报错**，接口返回 `{ demo: true, ... }` 和可用的示例内容，
界面显著位置显示「演示模式」徽标，并提示去 `/ai/app/settings` 配置。

环境变量（`.env` 或进程环境，读取用 `process.env.XXX`）：
`OPENAI_API_KEY` / `OPENAI_BASE_URL`（默认 `https://api.deepseek.com/v1`）/ `OPENAI_MODEL`（默认 `deepseek-chat`）/ `OPENAI_IMAGE_MODEL`

## 8. 验证清单（提交前自查）

1. `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json --incremental false` → 0 error
2. 你的每个路由 `Invoke-WebRequest http://127.0.0.1:4310/...` → 200，且 HTML 里能看到标题文字
3. 移动端断点（写代码时用 `sm: md: lg:` 保证）不会溢出
4. 没有改动范围外的文件：`git status` 或对照任务写范围

## 9. 汇报格式（完成后给你的 Lead 发一条消息）

```
任务：<task id> 完成
新增文件：...
验证：tsc 0 error；路由 /a /b = 200
未完成/风险：...
```
