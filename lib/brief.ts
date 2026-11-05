/**
 * AI 简报：读取 / 生成 / 持久化。
 *
 * 设计原则：
 * - 没有可用的 AI Key 时走模板规则（明确标注 demo），不调用网络，页面照样完整
 * - 有 Key 时调用 OpenAI 兼容 chat/completions；调用失败自动降级为模板并返回 warning
 * - 简报统一落 briefs 表（date 唯一），重复生成覆盖同一天
 * - 输入是 8 个来源缓存榜单的前 5 条，不另外抓取
 */
import { db } from "@/lib/db";
import { hasServerKey, resolveAiConfig, type AiConfig } from "@/lib/ai/config";
import { collectNews, type BriefNews, type BriefNewsMeta } from "@/lib/news";
import { localDateKey, truncate, uid } from "@/lib/utils";
import type { HotBoard, HotItem, HotSourceKey } from "@/lib/hot";

export type BriefMainline = {
  title: string;
  detail: string;
  sources: string[];
};

export type BriefMustRead = {
  title: string;
  source: string;
  reason: string;
  url?: string;
};

export type BriefPayload = {
  date: string;
  /** true = 模板规则生成的演示简报，没有调用模型 */
  demo: boolean;
  model: string | null;
  keywords: string[];
  mainlines: BriefMainline[];
  mustRead: BriefMustRead[];
  summary: string;
  stats: {
    sources: number;
    items: number;
    liveSources: number;
  };
  /** 输入榜单的数据状态 */
  dataMode: "live" | "mixed" | "sample";
  generatedAt: number;
  warning?: string;
  /** 重点新闻：网页搜索 + 抓取 + 模型简述 */
  news?: BriefNews[];
  newsMeta?: BriefNewsMeta;
};

export type BriefRecord = {
  date: string;
  payload: BriefPayload;
  createdAt: number;
};

type BriefRow = {
  payload: string;
  created_at: number;
};

const AI_TIMEOUT_MS = 25_000;

/** 与站内其他 AI 能力共用同一份配置：BLOCKSET_AI_* 优先，其次 OPENAI_* */
export function hasAiKey(): boolean {
  return hasServerKey();
}

function parsePayload(raw: string): BriefPayload | null {
  try {
    const parsed = JSON.parse(raw) as BriefPayload;
    if (!parsed || typeof parsed !== "object" || !parsed.date) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** 读某一天的简报 */
export function getBrief(date: string): BriefRecord | null {
  const row = db.prepare("SELECT payload, created_at FROM briefs WHERE date = ?").get(date) as
    | BriefRow
    | undefined;
  if (!row) return null;
  const payload = parsePayload(row.payload);
  if (!payload) return null;
  return { date, payload, createdAt: row.created_at };
}

/** 自动生成的最小间隔：避免频繁刷新页面时反复调用模型 */
export const BRIEF_MIN_INTERVAL_MS = 30 * 60 * 1000;

/**
 * 判断当天简报是否还"新鲜"，决定自动生成时是否跳过：
 * - 没有简报 → 需要生成
 * - 距上次生成不足 30 分钟 → 跳过（防止刷页面重复烧 token）
 * - 热榜缓存比简报更新 → 需要重新生成
 */
export function isBriefFresh(
  record: BriefRecord | null,
  latestDataAt = 0,
  now = Date.now(),
): boolean {
  if (!record) return false;
  // 上次是"AI 失败降级模板"的话，5 分钟后就允许自动重试，不用等满 30 分钟
  const minInterval = record.payload.warning ? 5 * 60 * 1000 : BRIEF_MIN_INTERVAL_MS;
  if (now - record.createdAt < minInterval) return true;
  return latestDataAt <= record.payload.generatedAt;
}

/** 历史简报，按日期倒序 */
export function listBriefs(limit = 24): BriefRecord[] {
  const rows = db
    .prepare("SELECT date, payload, created_at FROM briefs ORDER BY date DESC LIMIT ?")
    .all(limit) as { date: string; payload: string; created_at: number }[];
  const records: BriefRecord[] = [];
  for (const row of rows) {
    const payload = parsePayload(row.payload);
    if (!payload) continue;
    records.push({ date: row.date, payload, createdAt: row.created_at });
  }
  return records;
}

/** 写入简报（date 唯一，重复生成覆盖） */
export function saveBrief(payload: BriefPayload): BriefRecord {
  const createdAt = Date.now();
  db.prepare(
    `INSERT INTO briefs (id, date, payload, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET payload = excluded.payload, created_at = excluded.created_at`,
  ).run(uid("brief"), payload.date, JSON.stringify(payload), createdAt);
  return { date: payload.date, payload, createdAt };
}

/* -------------------------------------------------------------------------- */
/*                              模板规则生成                                    */
/* -------------------------------------------------------------------------- */

type Cluster = {
  label: string;
  sources: HotSourceKey[];
};

const CLUSTERS: Cluster[] = [
  { label: "公共热议", sources: ["weibo", "baidu", "douyin"] },
  { label: "技术与开源", sources: ["github", "juejin"] },
  { label: "观点与商业", sources: ["zhihu", "36kr"] },
  { label: "内容与创作", sources: ["bilibili"] },
];

const KEYWORD_HINTS = [
  "AI",
  "大模型",
  "开源",
  "浏览器",
  "前端",
  "后端",
  "工具",
  "效率",
  "图片",
  "压缩",
  "设计",
  "产品",
  "职场",
  "通勤",
  "短视频",
  "数据",
  "安全",
  "性能",
  "代码",
  "热点",
  "热榜",
  "待办",
  "独立开发",
  "工作",
  "生活",
  "用户",
  "内容",
];

const NGRAM_STOPWORDS = new Set([
  "一个",
  "我们",
  "可以",
  "什么",
  "为什么",
  "这个",
  "那个",
  "如何",
  "怎么",
  "哪些",
  "没有",
  "已经",
  "开始",
  "越来越",
  "一种",
  "这些",
  "那些",
  "就是",
  "不是",
  "现在",
  "今年",
  "今天",
  "热搜",
  "热榜",
  "播放",
  "回复",
  "热度",
  "工具",
  "用户",
]);

const READ_REASONS: Record<HotSourceKey, string> = {
  github: "开源趋势，一眼看出这周大家在做什么",
  juejin: "掘金一线技术文章，适合快速扫技术风向",
  zhihu: "观点集中，适合看不同立场的交锋",
  "36kr": "商业视角的综述，快速了解行业动向",
  bilibili: "视频形态，适合通勤或吃饭时看",
  weibo: "公共情绪的入口，适合快速扫标题",
  baidu: "全网关注点，覆盖面最广",
  douyin: "短视频风向，能看出内容流行趋势",
};

const READ_ORDER: HotSourceKey[] = [
  "github",
  "juejin",
  "zhihu",
  "36kr",
  "bilibili",
  "weibo",
  "baidu",
  "douyin",
];

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

function cjkNgrams(titles: string[]): string[] {
  const counts = new Map<string, number>();
  for (const title of titles) {
    const segments = title.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    for (const segment of segments) {
      for (let size = 4; size >= 2; size -= 1) {
        for (let i = 0; i + size <= segment.length; i += 1) {
          const gram = segment.slice(i, i + size);
          if (NGRAM_STOPWORDS.has(gram)) continue;
          counts.set(gram, (counts.get(gram) || 0) + 1);
        }
      }
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .map(([gram]) => gram);
}

function extractKeywords(titles: string[]): string[] {
  const joined = titles.join(" ").toLowerCase();
  const hits: { word: string; count: number }[] = [];
  for (const word of KEYWORD_HINTS) {
    const count = countOccurrences(joined, word.toLowerCase());
    if (count > 0) hits.push({ word, count });
  }
  hits.sort((a, b) => b.count - a.count);
  const words = hits.map((hit) => hit.word);

  if (words.length < 6) {
    for (const candidate of cjkNgrams(titles)) {
      if (words.length >= 6) break;
      if (words.some((word) => word.includes(candidate) || candidate.includes(word))) continue;
      words.push(candidate);
    }
  }
  return words.slice(0, 6);
}

function buildTemplateBrief(boards: HotBoard[], date: string): BriefPayload {
  const usable = boards.filter((board) => board.items.length > 0);
  const boardMap = new Map(usable.map((board) => [board.source, board]));
  const totalItems = usable.reduce((sum, board) => sum + board.items.length, 0);
  const liveSources = usable.filter((board) => board.live).length;
  const dataMode: BriefPayload["dataMode"] =
    liveSources === 0 ? "sample" : liveSources === usable.length ? "live" : "mixed";

  if (totalItems === 0) {
    return {
      date,
      demo: true,
      model: null,
      keywords: ["暂无数据"],
      mainlines: [
        {
          title: "还没有可用的热榜数据",
          detail: "上游未配置或抓取失败，先到每日热点页点一次刷新，再回来生成简报。",
          sources: [],
        },
      ],
      mustRead: [],
      summary: "今天还没有可用的热榜数据，先到每日热点页刷新一次，再回来生成简报。",
      stats: { sources: 0, items: 0, liveSources: 0 },
      dataMode: "sample",
      generatedAt: Date.now(),
    };
  }

  /* ------------------------------ 3 条主线 ------------------------------ */
  const clusters = CLUSTERS.map((cluster) => {
    const labels: string[] = [];
    const entries: { label: string; item: HotItem }[] = [];
    for (const key of cluster.sources) {
      const board = boardMap.get(key);
      if (!board || board.items.length === 0) continue;
      labels.push(board.label);
      for (const item of board.items) entries.push({ label: board.label, item });
    }
    return { label: cluster.label, labels, entries };
  })
    .filter((cluster) => cluster.entries.length > 0)
    .sort((a, b) => b.entries.length - a.entries.length)
    .slice(0, 3);

  const mainlines: BriefMainline[] = clusters.map((cluster) => {
    const top = cluster.entries[0];
    const preview = cluster.entries
      .slice(0, 3)
      .map((entry) => `「${truncate(entry.item.title.replace(/[「」]/g, ""), 22)}」`)
      .join("、");
    return {
      title: `${cluster.label}：${truncate(top.item.title, 30)}`,
      detail: `涉及 ${cluster.labels.join("、")}。靠前的几条是${preview}。`,
      sources: cluster.labels,
    };
  });

  if (mainlines.length === 0) {
    const first = usable[0];
    mainlines.push({
      title: `${first.label}：${truncate(first.items[0].title, 30)}`,
      detail: "今天只有一个来源有可用数据。",
      sources: [first.label],
    });
  }

  /* ------------------------------ 今日关键词 ----------------------------- */
  const titles = usable.flatMap((board) => board.items.map((item) => item.title));
  const keywords = extractKeywords(titles);

  /* ------------------------------ 值得一读 ------------------------------ */
  const usedTitles = new Set<string>();
  const mustRead: BriefMustRead[] = [];
  for (const key of READ_ORDER) {
    if (mustRead.length >= 3) break;
    const board = boardMap.get(key);
    const item = board?.items[0];
    if (!board || !item || usedTitles.has(item.title)) continue;
    usedTitles.add(item.title);
    mustRead.push({
      title: item.title,
      source: board.label,
      reason: READ_REASONS[key],
      ...(item.url ? { url: item.url } : {}),
    });
  }
  if (mustRead.length < 3) {
    for (const board of usable) {
      for (const item of board.items) {
        if (mustRead.length >= 3) break;
        if (usedTitles.has(item.title)) continue;
        usedTitles.add(item.title);
        mustRead.push({
          title: item.title,
          source: board.label,
          reason: "今日热度靠前，适合快速扫一眼",
          ...(item.url ? { url: item.url } : {}),
        });
      }
      if (mustRead.length >= 3) break;
    }
  }

  /* ------------------------------ 一句话总结 ----------------------------- */
  const keywordText = keywords.slice(0, 2).join("、") || "热榜内容";
  const lead = mainlines[0];
  const second = mainlines[1];
  const summary = `今天 ${usable.length} 个来源共 ${totalItems} 条内容，${keywordText} 是出现频率最高的关键词。${
    lead ? `${truncate(lead.title, 28)}排在最前；` : ""
  }${second ? `${truncate(second.title, 26)}紧随其后。` : ""}花五分钟扫一遍标题，再挑两条值得一读，今天的重点基本不会漏。`;

  return {
    date,
    demo: true,
    model: null,
    keywords,
    mainlines,
    mustRead,
    summary,
    stats: { sources: usable.length, items: totalItems, liveSources },
    dataMode,
    generatedAt: Date.now(),
  };
}

/* -------------------------------------------------------------------------- */
/*                              模型生成（可选）                                */
/* -------------------------------------------------------------------------- */

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

type AiSections = Pick<BriefPayload, "keywords" | "mainlines" | "mustRead" | "summary">;

/** 从模型输出里尽量稳地抠出一个 JSON 对象：去代码块、找平衡括号、修尾逗号 */
function extractJsonObject(content: string): unknown | null {
  const cleaned = content.replace(/```(?:json)?/gi, "").trim();
  const candidates: string[] = [cleaned];

  const start = cleaned.indexOf("{");
  if (start !== -1) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < cleaned.length; i += 1) {
      const ch = cleaned[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') {
        inString = true;
      } else if (ch === "{") {
        depth += 1;
      } else if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          candidates.push(cleaned.slice(start, i + 1));
          break;
        }
      }
    }
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      /* 继续尝试下一种 */
    }
  }
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate.replace(/,\s*([}\]])/g, "$1")) as unknown;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function parseAiContent(content: string): AiSections | null {
  const parsed = extractJsonObject(content);
  if (!parsed) return null;
  const record = asRecord(parsed);
  if (!record) return null;

  const keywords = (Array.isArray(record.keywords) ? record.keywords : [])
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 8);

  const mainlines = (Array.isArray(record.mainlines) ? record.mainlines : [])
    .flatMap((value): BriefMainline[] => {
      const item = asRecord(value);
      if (!item) return [];
      const title = typeof item.title === "string" ? item.title.trim() : "";
      if (!title) return [];
      const detail = typeof item.detail === "string" ? item.detail.trim() : "";
      const sources = (Array.isArray(item.sources) ? item.sources : [])
        .filter((source): source is string => typeof source === "string")
        .map((source) => source.trim())
        .filter(Boolean);
      return [{ title, detail, sources }];
    })
    .slice(0, 3);

  const mustRead = (Array.isArray(record.mustRead) ? record.mustRead : [])
    .flatMap((value): BriefMustRead[] => {
      const item = asRecord(value);
      if (!item) return [];
      const title = typeof item.title === "string" ? item.title.trim() : "";
      if (!title) return [];
      const source = typeof item.source === "string" ? item.source.trim() : "热榜";
      const reason = typeof item.reason === "string" ? item.reason.trim() : "值得一看";
      const url =
        typeof item.url === "string" && /^https?:\/\//i.test(item.url) ? item.url : undefined;
      return [{ title, source, reason, ...(url ? { url } : {}) }];
    })
    .slice(0, 3);

  const summary = typeof record.summary === "string" ? record.summary.trim() : "";

  if (keywords.length === 0 || mainlines.length === 0 || !summary) return null;
  return { keywords, mainlines, mustRead, summary };
}

type ChatOptions = { jsonMode: boolean; temperature: number };

async function requestSections(
  boards: HotBoard[],
  config: { apiKey: string; baseUrl: string; model: string },
  options: ChatOptions,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const input = boards
      .filter((board) => board.items.length > 0)
      .map((board) => ({
        source: board.label,
        live: board.live,
        top: board.items.slice(0, 5).map((item) => ({
          rank: item.rank,
          title: item.title,
          ...(item.hot ? { hot: item.hot } : {}),
          ...(item.url ? { url: item.url } : {}),
        })),
      }));

    const body: Record<string, unknown> = {
      model: config.model,
      temperature: options.temperature,
      messages: [
        {
          role: "system",
          content:
            "你是中文内容编辑，负责把多平台热榜整理成简洁的每日简报。只输出一个 JSON 对象，不要 markdown 代码块、不要解释。字段：keywords（5-8 个中文关键词字符串数组）、mainlines（恰好 3 个对象，每个含 title / detail / sources 字符串数组）、mustRead（恰好 3 个对象，每个含 title / source / reason；url 只能从输入里原样复制，输入没有 url 就不要写 url）、summary（一句话中文总结，80 字以内）。只能使用用户给出的榜单内容，不要编造新闻。",
        },
        {
          role: "user",
          content: `今天是 ${localDateKey()}。以下是各来源热榜的前 5 条：\n${JSON.stringify(input, null, 2)}`,
        },
      ],
    };
    if (options.jsonMode) body.response_format = { type: "json_object" };

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`接口返回 HTTP ${response.status}${detail ? `（${truncate(detail, 100)}）` : ""}`);
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: unknown } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) throw new Error("模型返回内容为空");
    return content;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 调用模型：先用 JSON 模式（response_format），失败或解析不了再用普通模式重试一次。
 * 有些兼容接口不支持 response_format，会在第一轮直接报 400，第二轮兜住。
 */
async function callModel(
  boards: HotBoard[],
  config: { apiKey: string; baseUrl: string; model: string },
): Promise<AiSections> {
  const attempts: ChatOptions[] = [
    { jsonMode: true, temperature: 0.4 },
    { jsonMode: false, temperature: 0.2 },
  ];
  let lastError: Error | null = null;

  for (const attempt of attempts) {
    try {
      const content = await requestSections(boards, config, attempt);
      const sections = parseAiContent(content);
      if (sections) return sections;
      lastError = new Error("模型返回的不是可解析的 JSON");
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error("模型调用失败");
}
/**
 * 生成简报：有 Key 走模型，无 Key 或调用失败走模板。
 * 返回值里的 warning 用于在界面上如实提示降级原因。
 */
export async function generateBrief(
  boards: HotBoard[],
  override?: AiConfig,
): Promise<{ payload: BriefPayload; warning?: string }> {
  const date = localDateKey();
  const template = buildTemplateBrief(boards, date);

  // 请求头里的本地模型配置优先（设置页存 localStorage → X-AI-* 头），其次环境变量
  const config = override ?? resolveAiConfig(new Headers());
  if (!config.apiKey.trim()) {
    return { payload: template };
  }

  try {
    const sections = await callModel(boards, config);
    // 规则：模型给的链接必须是输入里真实存在的，否则去掉（防止编造 URL）
    const allowedUrls = new Set(
      boards.flatMap((board) =>
        board.items.map((item) => item.url).filter((url): url is string => Boolean(url)),
      ),
    );
    const mustRead = sections.mustRead
      .slice(0, 3)
      .map((entry) => {
        if (!entry.url || allowedUrls.has(entry.url)) return entry;
        const { url: _dropped, ...rest } = entry;
        return rest;
      });

    const mainlines = sections.mainlines.length > 0 ? sections.mainlines : template.mainlines;

    // 重点新闻：搜索主线相关的权威报道 → 抓正文 → 模型简述
    let news: BriefNews[] | undefined;
    let newsMeta: BriefNewsMeta | undefined;
    try {
      const collected = await collectNews(
        {
          queries: [...mustRead.map((entry) => entry.title), ...mainlines.map((line) => line.title)],
          keywords: sections.keywords.length > 0 ? sections.keywords : template.keywords,
        },
        config,
      );
      news = collected.news;
      newsMeta = collected.meta;
    } catch (error) {
      newsMeta = {
        enabled: true,
        queries: [],
        selected: 0,
        message: `重点新闻抓取失败：${error instanceof Error ? truncate(error.message, 120) : "未知错误"}`,
      };
    }

    return {
      payload: {
        ...template,
        keywords: sections.keywords.length > 0 ? sections.keywords : template.keywords,
        mainlines,
        mustRead: mustRead.length > 0 ? mustRead : template.mustRead,
        summary: sections.summary || template.summary,
        demo: false,
        model: config.model,
        generatedAt: Date.now(),
        ...(news && news.length > 0 ? { news } : {}),
        newsMeta,
      },
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "未知错误";
    const warning = `AI 调用失败：${reason}，已改用模板规则生成`;
    return { payload: { ...template, warning }, warning };
  }
}
