/**
 * 重点新闻：用 DeepSeek 网页搜索 + 抓取，把当日主线落到「权威来源的具体新闻」上。
 *
 * 流程：
 *   主线标题（最多 3 条） → /tools/search → 按 authority + 权威域名白名单筛选
 *   → /tools/fetch 取正文 → 模型写成 2–3 句简述 + 2 个要点 → 附带来源/时间/原文链接
 *
 * 约束：
 * - 只用权威来源：authority ≥ 2 或命中白名单域名；找不到就留空，不凑数
 * - 只用抓到的正文/摘要写简述，不允许补充资料外的事实
 * - 搜索/抓取/摘要任何一步失败都只影响「重点新闻」区块，不影响简报主体
 */
import type { AiConfig } from "@/lib/ai/config";
import { fetchPage, webSearch, type WebSearchResult } from "@/lib/ai/tools";
import { truncate } from "@/lib/utils";

export type BriefNews = {
  title: string;
  url: string;
  siteName: string | null;
  publishedAt: string | null;
  authority: number;
  summary: string;
  keyPoints: string[];
  /** 触发这次搜索的主线标题 */
  query: string;
};

export type BriefNewsMeta = {
  enabled: boolean;
  queries: string[];
  selected: number;
  message?: string;
};

/** 权威媒体 / 机构域名：命中即视为权威来源（与 authority 分配合使用） */
const AUTHORITATIVE_DOMAINS = [
  "xinhuanet.com",
  "news.cn",
  "people.com.cn",
  "cctv.com",
  "chinanews.com.cn",
  "cnr.cn",
  "gmw.cn",
  "thepaper.cn",
  "caixin.com",
  "yicai.com",
  "jiemian.com",
  "stcn.com",
  "36kr.com",
  "huxiu.com",
  "geekpark.net",
  "jiqizhixin.com",
  "qbitai.com",
  "infoq.cn",
  "oschina.net",
  "ithome.com",
  "gov.cn",
];

const NEWS_MAX = clamp(Number(process.env.BRIEF_NEWS_MAX ?? 3), 1, 5);

/** 常见站点 → 中文名，展示更友好 */
const SITE_NAMES: Record<string, string> = {
  "jiemian.com": "界面新闻",
  "geekpark.net": "极客公园",
  "36kr.com": "36 氪",
  "huxiu.com": "虎嗅",
  "ithome.com": "IT 之家",
  "infoq.cn": "InfoQ",
  "qbitai.com": "量子位",
  "jiqizhixin.com": "机器之心",
  "thepaper.cn": "澎湃新闻",
  "caixin.com": "财新",
  "yicai.com": "第一财经",
  "stcn.com": "证券时报",
  "xinhuanet.com": "新华网",
  "news.cn": "新华网",
  "people.com.cn": "人民网",
  "cctv.com": "央视网",
  "chinanews.com.cn": "中国新闻网",
  "cnr.cn": "央广网",
  "gmw.cn": "光明网",
  "m.163.com": "网易新闻",
  "163.com": "网易新闻",
  "sina.com.cn": "新浪",
  "qq.com": "腾讯新闻",
  "sohu.com": "搜狐新闻",
};

const SITE_ALIASES: Record<string, string> = {
  Sohu: "搜狐新闻",
  Sina: "新浪",
  NetEase: "网易新闻",
  "Jiemian.com": "界面新闻",
  "The Paper": "澎湃新闻",
  "36Kr": "36 氪",
  "GeekPark": "极客公园",
  "IT之家": "IT 之家",
};

const QUERY_STOPWORDS = new Set([
  "持续发酵", "接连切割", "受关注", "动态密集", "相关部门", "有关", "如何", "为什么", "哪些",
  "什么", "情况", "问题", "影响", "变化", "带来", "是否", "表示", "认为", "已经", "目前",
]);
const SUMMARY_TIMEOUT_MS = 22_000;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function siteNameOf(result: WebSearchResult): string {
  if (result.siteName) {
    const alias = SITE_ALIASES[result.siteName];
    if (alias) return alias;
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(result.siteName)) return result.siteName;
  }
  const host = hostOf(result.url);
  for (const [domain, name] of Object.entries(SITE_NAMES)) {
    if (host.endsWith(domain)) return name;
  }
  return result.siteName ?? host;
}

/** 首页 / 栏目页不是具体新闻，直接排除 */
function isArticleUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, "");
    if (!path || path === "/") return false;
    return path.split("/").filter(Boolean).length >= 1 && path.length >= 6;
  } catch {
    return false;
  }
}

function queryTerms(queries: string[], keywords: string[]): string[] {
  const terms = new Set<string>();
  for (const keyword of keywords) {
    const clean = keyword.trim();
    if (clean.length >= 2) terms.add(clean);
  }
  for (const query of queries) {
    for (const piece of query.match(/[\u4e00-\u9fa5]{2,8}/g) ?? []) {
      if (piece.length >= 3 && !QUERY_STOPWORDS.has(piece)) terms.add(piece);
    }
  }
  return [...terms];
}

/** 相关性命中数：结果标题/摘要里出现了多少个查询词 */
function relevanceHits(result: WebSearchResult, terms: string[]): number {
  const text = `${result.title} ${result.snippet} ${result.summary}`;
  let hits = 0;
  for (const term of terms) {
    if (text.includes(term)) hits += 1;
  }
  return hits;
}

function isWhitelisted(url: string): boolean {
  const host = hostOf(url);
  return Boolean(host) && AUTHORITATIVE_DOMAINS.some((domain) => host.endsWith(domain));
}

function isAuthoritative(result: WebSearchResult): boolean {
  return result.authority >= 2 || isWhitelisted(result.url);
}

function rankValue(result: WebSearchResult): number {
  const host = hostOf(result.url);
  return (
    result.rerankScore +
    Math.max(0, result.authority) * 0.4 +
    (host && AUTHORITATIVE_DOMAINS.some((domain) => host.endsWith(domain)) ? 1.2 : 0)
  );
}

function normalizeTitle(title: string): string {
  return title.replace(/[\s\p{P}\p{S}]/gu, "").slice(0, 60);
}

function twoSentences(text: string): string {
  const cleaned = text
    .replace(/#/g, "#")
    .replace(/[#>*`_]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const sentences = cleaned.split(/(?<=[。！？!?])/).filter((part) => part.trim().length > 8);
  return truncate(sentences.slice(0, 2).join(""), 150);
}

function heuristicBrief(text: string): { summary: string; keyPoints: string[] } {
  const summary = twoSentences(text);
  const points = text
    .replace(/#/g, "#")
    .replace(/[#>*`_]/g, "")
    .split(/(?<=[。！？!?])/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 12 && part.length <= 60)
    .slice(0, 2);
  return { summary: summary || truncate(text.replace(/\s+/g, " "), 140), keyPoints: points };
}

type Draft = { query: string; result: WebSearchResult; text: string };

async function summarizeDrafts(
  config: AiConfig,
  drafts: Draft[],
): Promise<{ summary: string; keyPoints: string[] }[]> {
  const items = drafts.map((draft, index) => ({
    id: index + 1,
    title: draft.result.title,
    site: draft.result.siteName ?? hostOf(draft.result.url),
    date: draft.result.publishedAt,
    text: truncate(draft.text, 2200),
  }));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SUMMARY_TIMEOUT_MS);
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "你是严谨的新闻编辑。根据给定资料，为每条新闻写 2-3 句中文简述（合计 80–140 字），并列出 2 个要点。只能依据资料内容，不得补充资料外的事实、数字或引语；资料不足时宁缺毋滥。只输出 JSON：{\"items\":[{\"id\":1,\"summary\":\"…\",\"keyPoints\":[\"…\",\"…\"]}]}",
          },
          {
            role: "user",
            content: JSON.stringify(items, null, 1),
          },
        ],
      }),
    });

    if (!response.ok) throw new Error(`摘要接口 HTTP ${response.status}`);
    const json = (await response.json()) as { choices?: { message?: { content?: unknown } }[] };
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) throw new Error("摘要为空");

    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("摘要不是 JSON");
    const parsed = JSON.parse(content.slice(start, end + 1)) as { items?: unknown[] };
    const rows = Array.isArray(parsed.items) ? parsed.items : [];

    return drafts.map((draft, index) => {
      const row = rows.find(
        (value) =>
          typeof value === "object" &&
          value !== null &&
          Number((value as Record<string, unknown>).id) === index + 1,
      ) as Record<string, unknown> | undefined;
      const summary = typeof row?.summary === "string" ? row.summary.trim() : "";
      const keyPoints = Array.isArray(row?.keyPoints)
        ? row.keyPoints
            .filter((point): point is string => typeof point === "string")
            .map((point) => point.trim())
            .filter(Boolean)
            .slice(0, 3)
        : [];
      if (!summary) return heuristicBrief(draft.text);
      return { summary: truncate(summary, 180), keyPoints };
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 收集重点新闻。titles 一般是 3 条主线的标题。
 */
/**
 * 收集重点新闻。
 * queries 建议用「值得一读」里具体的新闻标题（比主线长句更容易搜准）；
 * keywords 用于相关性校验，避免把无关的权威文章凑进来。
 */
export async function collectNews(
  input: { queries: string[]; keywords: string[] },
  config: AiConfig,
): Promise<{ news: BriefNews[]; meta: BriefNewsMeta }> {
  const enabled = process.env.BRIEF_NEWS !== "0" && config.apiKey.trim().length > 0;
  const queries = [...new Set(input.queries.map((query) => query.trim()).filter(Boolean))].slice(
    0,
    3,
  );

  if (!enabled) {
    return {
      news: [],
      meta: { enabled: false, queries: [], selected: 0, message: "未启用网页搜索（BRIEF_NEWS=0 或未配置模型）" },
    };
  }
  if (queries.length === 0) {
    return { news: [], meta: { enabled, queries, selected: 0 } };
  }

  const settled = await Promise.allSettled(queries.map((query) => webSearch(config, query, 6)));
  const failures = settled.filter((item) => item.status === "rejected").length;
  if (failures === settled.length) {
    const reason = settled[0]?.status === "rejected" ? String(settled[0].reason) : "未知错误";
    return {
      news: [],
      meta: { enabled, queries, selected: 0, message: `网页搜索不可用：${truncate(reason, 120)}` },
    };
  }

  const terms = queryTerms(queries, input.keywords);

  // 相关性门槛：先按 ≥2 命中选，选不出来再放宽到 ≥1；完全无关的权威文章不要
  function pickBy(minHits: number) {
    const byQuery = new Map<string, { query: string; result: WebSearchResult; hits: number }[]>();
    settled.forEach((entry, index) => {
      if (entry.status !== "fulfilled") return;
      const bucket: { query: string; result: WebSearchResult; hits: number }[] = [];
      for (const result of entry.value) {
        if (!isAuthoritative(result) || !isArticleUrl(result.url)) continue;
        const hits = relevanceHits(result, terms);
        if (hits < minHits) continue;
        bucket.push({ query: queries[index], result, hits });
      }
      bucket.sort((a, b) => rankValue(b.result) + b.hits * 1.2 - (rankValue(a.result) + a.hits * 1.2));
      if (bucket.length > 0) byQuery.set(queries[index], bucket);
    });

    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();
    const picked: { query: string; result: WebSearchResult }[] = [];

    // 每条查询先各取一条，保证三个主线都有覆盖；名额还有剩余再补第二轮
    for (let round = 0; round < 2 && picked.length < NEWS_MAX; round += 1) {
      for (const query of queries) {
        if (picked.length >= NEWS_MAX) break;
        const bucket = byQuery.get(query) ?? [];
        const candidate = bucket[round];
        if (!candidate) continue;
        const path = new URL(candidate.result.url).pathname;
        const urlKey = hostOf(candidate.result.url) + path;
        const titleKey = normalizeTitle(candidate.result.title);
        if (seenUrls.has(urlKey) || seenTitles.has(titleKey)) continue;
        seenUrls.add(urlKey);
        seenTitles.add(titleKey);
        picked.push({ query: candidate.query, result: candidate.result });
      }
    }
    return picked;
  }

  let picked = pickBy(2);
  if (picked.length === 0) picked = pickBy(1);

  if (picked.length === 0) {
    return {
      news: [],
      meta: {
        enabled,
        queries,
        selected: 0,
        message: "没有找到既权威又相关的报道（已按 authority 与关键词相关性过滤）",
      },
    };
  }

  // 抓正文（失败则退回搜索结果自带的长摘要）
  const fetched = await Promise.allSettled(
    picked.map(({ result }) =>
      result.content ? Promise.resolve({ content: result.content }) : fetchPage(config, result.url),
    ),
  );

  const drafts: Draft[] = picked.map(({ query, result }, index) => {
    const page = fetched[index];
    const text =
      page.status === "fulfilled" && page.value.content.trim()
        ? page.value.content
        : result.summary || result.snippet;
    return { query, result, text };
  });

  let summaries: { summary: string; keyPoints: string[] }[];
  try {
    summaries = await summarizeDrafts(config, drafts);
  } catch {
    summaries = drafts.map((draft) => heuristicBrief(draft.text));
  }

  const news: BriefNews[] = drafts.map((draft, index) => ({
    title: draft.result.title,
    url: draft.result.url,
    siteName: siteNameOf(draft.result),
    publishedAt: draft.result.publishedAt,
    authority: draft.result.authority,
    summary: summaries[index].summary,
    keyPoints: summaries[index].keyPoints,
    query: draft.query,
  }));

  return {
    news,
    meta: {
      enabled,
      queries,
      selected: news.length,
      ...(failures > 0 ? { message: `${failures} 条搜索请求失败，已用其余结果` } : {}),
    },
  };
}