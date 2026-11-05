/**
 * DeepSeek 官方「网页搜索 / 网页抓取」接口客户端。
 *
 * - 搜索：POST {baseUrl}/tools/search   （按 query 返回结构化结果，带 authority 权威度）
 * - 抓取：POST {baseUrl}/tools/fetch    （返回页面标题 + Markdown 正文）
 *
 * 与对话共用同一个 API Key / Base URL；按次计费（见 docs/BRIEF.md）。
 * 接口不可用（403/404/超时）时抛出异常，由调用方决定是否降级，不影响简报主体生成。
 */
import type { AiConfig } from "@/lib/ai/config";

export type WebSearchResult = {
  title: string;
  url: string;
  snippet: string;
  summary: string;
  content: string;
  siteName: string | null;
  publishedAt: string | null;
  /** 0–4，≥3 为极权威；-1 未知 */
  authority: number;
  rerankScore: number;
};

const SEARCH_TIMEOUT_MS = 12_000;
const FETCH_TIMEOUT_MS = 15_000;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

async function postJson(url: string, config: AiConfig, body: unknown, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
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
      throw new Error(`HTTP ${response.status}${detail ? `（${detail.slice(0, 120)}）` : ""}`);
    }
    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

/** 网页搜索；query 超过 128 字符会被截断（接口限制） */
export async function webSearch(
  config: AiConfig,
  query: string,
  count = 6,
): Promise<WebSearchResult[]> {
  const payload = (await postJson(
    `${config.baseUrl}/tools/search`,
    config,
    { query: query.slice(0, 128), count, need_content: false },
    SEARCH_TIMEOUT_MS,
  )) as { results?: unknown[] };

  const results = Array.isArray(payload?.results) ? payload.results : [];
  return results.flatMap((value): WebSearchResult[] => {
    if (typeof value !== "object" || value === null) return [];
    const record = value as Record<string, unknown>;
    const url = asString(record.url);
    const title = asString(record.title);
    if (!url || !title) return [];
    const authorityRaw = typeof record.authority === "number" ? record.authority : -1;
    const scoreRaw = typeof record.rerank_score === "number" ? record.rerank_score : 0;
    return [
      {
        title,
        url,
        snippet: asString(record.snippet),
        summary: asString(record.summary),
        content: asString(record.content),
        siteName: typeof record.site_name === "string" ? record.site_name : null,
        publishedAt: typeof record.date === "string" ? record.date : null,
        authority: authorityRaw,
        rerankScore: scoreRaw,
      },
    ];
  });
}

/** 抓取网页正文（Markdown） */
export async function fetchPage(
  config: AiConfig,
  url: string,
): Promise<{ title: string; content: string }> {
  const payload = (await postJson(
    `${config.baseUrl}/tools/fetch`,
    config,
    { url },
    FETCH_TIMEOUT_MS,
  )) as { title?: unknown; content?: unknown };
  return {
    title: asString(payload?.title),
    content: asString(payload?.content),
  };
}
