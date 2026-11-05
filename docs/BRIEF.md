# AI 简报

把 8 个平台的热榜整理成一份可读的中文简报：**今日关键词 / 3 条主线 / 值得一读 / 一句话总结**。结果落 SQLite，可按日期回看。

## 它是什么 / 不是什么

- 是：对**已有热榜标题**做二次整理（提示词工程 + 结构化输出）。
- 不是：RAG、联网搜索、或者重新抓一遍新闻。输入就是热榜缓存里每个来源的前 5 条。

## 数据流

```text
每日热点页 / 定时任务
   └─ 抓取 8 个来源（原生适配器 + 本地聚合）→ hot_cache 表
                                                    │
                                   getCachedBoards()│（每源前 5 条，约 40 条标题）
                                                    ▼
                             POST /api/brief → generateBrief()
                                                    │
                    有 Key ──► 模型生成（JSON 模式 + 重试）
                    无 Key ──► 模板规则（标注演示模式）
                                                    │
                                       saveBrief() 写 briefs 表（date 唯一）
                                                    │
                         每天首次打开页面：SSR 读库 + 客户端自动补一期
```

## 每天自动生成（两层保障）

1. **打开页面就自动生成**（无需定时任务）
   - 页面对 `isBriefFresh()` 判断：今天没有简报、或热榜缓存比简报新 → 交给客户端自动调一次 `POST /api/brief?auto=1`；
   - 生成中页面显示"正在汇总 8 个来源…"，完成后自动刷新内容；
   - 30 分钟内不会重复调用模型（防止刷页面烧 token）；如果上次是 **AI 失败降级模板**，5 分钟后允许自动重试。

2. **系统计划任务（可选，保证没人打开时也有简报）**
   - 脚本：`scripts/brief-cron.mjs`，只是请求一次接口，站点需在运行。
   - 手动试跑：`npm run brief:gen`（加 `--force` 强制重排）。
   - Windows 注册每天 08:00：
     ```powershell
     npm run brief:task
     # 或指定时间：powershell -File scripts/install-brief-task.ps1 -Time 09:30
     # 删除任务：  powershell -File scripts/install-brief-task.ps1 -Uninstall
     ```
   - Linux / macOS cron：
     ```cron
     0 8 * * * curl -s -X POST http://127.0.0.1:4310/api/brief?auto=1 >/dev/null
     ```

## 模型调用细节

| 项 | 取值 |
|---|---|
| 接口 | `POST {baseUrl}/chat/completions`（OpenAI 兼容） |
| 配置 | 三级：请求头 `X-AI-*`（设置页存在浏览器的 Key）> `BLOCKSET_AI_*` > `OPENAI_*` |
| 温度 / 超时 | 0.4（JSON 模式）/ 0.2（重试），每次 25 秒 |
| 输出约束 | 只允许 JSON：`keywords` 5–8 个、`mainlines` 恰好 3 条、`mustRead` 恰好 3 条、`summary` ≤80 字；不得编造 |
| JSON 可靠性 | 首选 `response_format: json_object`；失败或解析不了时普通模式重试；解析做「去代码块 + 平衡括号 + 尾逗号修复」 |
| 链接规则 | 输入里带 `url`，提示词要求 mustRead 的 url 只能原样复制；服务端再用**输入 URL 白名单**过滤，模型编造的链接一律丢弃 |
| 降级 | 任何失败 → 模板规则生成，原因写入 `payload.warning` 并在页面展示 |

## 模板规则（无 Key / 降级时）

- **3 条主线**：8 个来源分 4 簇（公共热议 / 技术与开源 / 观点与商业 / 内容与创作），取条目最多的 3 簇，每簇头条做标题、前 3 条做细节；
- **关键词**：27 个领域词表词频统计，不足 6 个用中文 2–4 元 n-gram 补齐；
- **值得一读**：按 `GitHub → 掘金 → 知乎 → 36氪 → B站 → 微博 → 百度 → 抖音` 取头条，配固定理由；
- **总结**：模板字符串拼接。

## 数据模型

`briefs(id, date UNIQUE, payload JSON, created_at)`，`payload` 字段见 `lib/brief.ts` 的 `BriefPayload`：

```ts
{ date, demo, model, keywords[], mainlines[], mustRead[], summary,
  stats:{sources,items,liveSources}, dataMode:"live"|"mixed"|"sample",
  generatedAt, warning? }
```

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/brief?date=YYYY-MM-DD` | 取指定日期简报（不传取最新）+ 最近 24 期历史 |
| `POST` | `/api/brief` | 手动生成，**强制**重新生成并覆盖当天 |
| `POST` | `/api/brief?auto=1` | 自动/定时生成，当天简报新鲜时直接返回（`skipped:true`） |

## 代码位置

```text
lib/brief.ts                      生成（模型/模板）、解析、持久化、新鲜度判断
app/api/brief/route.ts            GET / POST / auto 逻辑
app/(site)/daily-brief/page.tsx   SSR 读取 + 自动生成信号
components/content/brief-studio.tsx  生成按钮、自动生成、历史、提示
scripts/brief-cron.mjs            定时任务脚本
scripts/install-brief-task.ps1    Windows 计划任务注册
```

## 已知局限

- 同一事件在多个榜出现时，可能被不同主线重复提及（没做跨源事件聚类）；
- 主线只列来源名，不挂原文链接（值得一读里有）；
- 每天一期，重排会覆盖当天（历史按日期保留）。

## 重点新闻（DeepSeek 网页搜索 / 抓取）

数据流：

```text
「值得一读」的具体新闻标题（3 条）
   └─ POST {base}/tools/search  → 每条取 6 个结果（带 authority / site_name / date / summary）
        └─ 过滤：authority ≥ 2 或命中权威媒体白名单；排除首页/栏目页；关键词相关性 ≥ 2（不足则放宽到 ≥1）
             └─ 每条查询各取 1 条（保证三个主线都有覆盖）
                  └─ POST {base}/tools/fetch 取正文（失败则用搜索结果长摘要）
                       └─ 模型写 2-3 句简述 + 2 个要点（只依据正文）
                            └─ 写入 payload.news，页面「重点新闻 · 权威来源」展示
```

规则与约束：

| 项 | 规则 |
|---|---|
| 来源权威性 | `authority ≥ 2` 或命中白名单（新华网/人民网/央视网/中新网/澎湃/财新/第一财经/界面/36氪/极客公园/机器之心/量子位/InfoQ/IT之家/政府域名等） |
| 相关性 | 用简报关键词 + 查询词做命中数校验，≥2 才入选；选不出再放宽到 ≥1 |
| 排除 | 首页、栏目页、非文章 URL |
| 覆盖 | 每条查询轮流取 1 条，最多 3 条（`BRIEF_NEWS_MAX` 可调 1–5） |
| 简述 | 模型只能依据抓到的正文写 80–140 字简述 + 2 个要点；抓取失败用摘要，模型失败用正文前两句兜底 |
| 展示 | 站点名、权威度、日期、简述、要点、原文链接；底部注明筛选规则 |
| 失败隔离 | 搜索/抓取/摘要任一步失败只影响「重点新闻」区块，简报主体照常生成，原因写进 `newsMeta.message` |

开关与成本：

```ini
BRIEF_NEWS=1        # 设为 0 关闭重点新闻（不产生搜索/抓取费用）
BRIEF_NEWS_MAX=3    # 每次最多几条（1–5）
```

> 搜索/抓取是**按次计费**的（官方 Search API 约 $0.75 / 千次请求），一次简报最多 3 次搜索 + 3 次抓取 + 1 次摘要调用。官方文档：
> [网页搜索 API](https://api-docs.deepseek.com/zh-cn/api/search)、[网页抓取 API](https://api-docs.deepseek.com/zh-cn/api/fetch)。

相关代码：`lib/ai/tools.ts`（Search/Fetch 客户端）、`lib/news.ts`（筛选 + 抓取 + 简述）、`lib/brief.ts`（接入生成流程）、`components/content/brief-studio.tsx`（展示）。