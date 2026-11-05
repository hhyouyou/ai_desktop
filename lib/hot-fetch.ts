/**
 * 热点抓取层：与 lib/hot.ts（缓存 / 示例数据 / 来源注册表）分离。
 *
 * - 上游地址来自环境变量 HOT_API_BASE（兼容 DAILY_HOT_API）
 * - 单次抓取超时 8s；任何失败都回退「本地缓存 → 内置示例数据」，绝不抛出到页面
 * - 3 分钟内存软缓存：避免用户连续点刷新反复打上游
 * - 抓取成功后写入 hot_cache（saveBoard），页面与 /api/hot 都读同一份缓存
 */
import {
  getCachedBoard,
  saveBoard,
  sourceMeta,
  type HotBoard,
  type HotItem,
  type HotSourceKey,
} from "@/lib/hot";
import { fetchNativeSource, hasNativeAdapter } from "@/lib/hot-native";

/** 3 分钟内存软缓存 */
export const HOT_REFRESH_TTL_MS = 3 * 60 * 1000;
/** 单次上游抓取超时（毫秒） */
export const HOT_FETCH_TIMEOUT_MS = 8000;

type MemoryEntry = { items: HotItem[]; at: number };

const memory = new Map<HotSourceKey, MemoryEntry>();

export type RefreshOutcome = {
  board: HotBoard;
  /** 是否处于示例数据模式（当前 board 不是实时数据） */
  demo: boolean;
  warning?: string;
  /** 命中 3 分钟内存软缓存，没有真正请求上游 */
  softCached: boolean;
};

export function hotApiBase(): string {
  const raw = process.env.HOT_API_BASE || process.env.DAILY_HOT_API || "";
  return raw.trim().replace(/\/+$/, "");
}

export function hotApiConfigured(): boolean {
  return hotApiBase().length > 0;
}

function upstreamUrl(source: HotSourceKey): string {
  return `${hotApiBase()}/${source}`;
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

/** 从各种嵌套结构里把列表挖出来：数组 / { data: [] } / { data: { list: [] } } */
const LIST_KEYS = ["data", "list", "items", "result", "results", "boards", "rows"];

function extractRawList(payload: unknown, depth = 0): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (depth > 3) return [];
  const record = asRecord(payload);
  if (!record) return [];
  for (const key of LIST_KEYS) {
    if (!(key in record)) continue;
    const nested = extractRawList(record[key], depth + 1);
    if (nested.length > 0) return nested;
  }
  return [];
}

function pickText(record: JsonRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function pickHot(record: JsonRecord): string | undefined {
  const keys = ["hot", "hot_value", "hotValue", "heat", "hot_num", "hotNum", "num", "score", "count", "views"];
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) {
      return value >= 10_000 ? `${(value / 10_000).toFixed(1)} 万` : String(value);
    }
  }
  return undefined;
}

function pickUrl(record: JsonRecord): string {
  const keys = ["url", "mobileUrl", "mobile_url", "mobil_url", "link", "href"];
  for (const key of keys) {
    const value = pickText(record, [key]);
    if (value && /^https?:\/\//i.test(value)) return value;
  }
  return "";
}

/**
 * 把上游任意结构规范化为 HotItem[]：
 * 支持的字段名覆盖常见热榜接口（title/name/word、url/mobil_url、hot/hot_value、tag/label）。
 */
export function normalizeHotItems(raw: unknown[]): HotItem[] {
  const items: HotItem[] = [];
  for (const entry of raw) {
    if (typeof entry === "string") {
      const title = entry.trim();
      if (!title) continue;
      items.push({ rank: items.length + 1, title, url: "" });
      continue;
    }
    const record = asRecord(entry);
    if (!record) continue;
    const title = pickText(record, ["title", "name", "word", "hot_word", "hotWord", "keyword", "text", "query"]);
    if (!title) continue;
    const item: HotItem = {
      rank: items.length + 1,
      title,
      url: pickUrl(record),
    };
    const hot = pickHot(record);
    if (hot) item.hot = hot;
    const tag = pickText(record, ["tag", "label", "trend", "flag"]);
    if (tag) item.tag = tag;
    items.push(item);
    if (items.length >= 30) break;
  }
  return items.map((item, index) => ({ ...item, rank: index + 1 }));
}

async function fetchUpstreamJson(source: HotSourceKey): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HOT_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(upstreamUrl(source), {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        accept: "application/json",
        "user-agent": "BlockSetBot/0.1 (+http://localhost:4310)",
      },
    });
    if (!response.ok) throw new Error(`上游返回 HTTP ${response.status}`);
    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 刷新单个来源。策略：
 * 1. 3 分钟内抓过 → 直接用内存软缓存
 * 2. 原生适配器（weibo / baidu / github）优先；失败则尝试本地聚合服务
 * 3. 其余来源走本地聚合服务（HOT_API_BASE）
 * 4. 都失败 / 未配置 → 回退 hot_cache，仍没有再回退内置示例数据
 */
export async function refreshSource(source: HotSourceKey): Promise<RefreshOutcome> {
  const meta = sourceMeta(source);
  const memo = memory.get(source);
  if (memo && Date.now() - memo.at < HOT_REFRESH_TTL_MS) {
    return {
      board: { source, label: meta.label, items: memo.items, fetchedAt: memo.at, live: true },
      demo: false,
      softCached: true,
    };
  }

  const fallback = getCachedBoard(source);
  const fallbackHint = fallback.live ? "已回退到本地缓存" : "已回退到内置示例数据";
  const native = hasNativeAdapter(source);
  const aggregatorReady = hotApiConfigured();

  if (!native && !aggregatorReady) {
    return {
      board: fallback,
      demo: !fallback.live,
      warning: `未配置热榜数据源，来源「${meta.label}」展示示例数据`,
      softCached: false,
    };
  }

  const problems: string[] = [];
  let items: HotItem[] = [];

  if (native) {
    try {
      items = (await fetchNativeSource(source)) ?? [];
    } catch (error) {
      problems.push(`直连抓取失败（${error instanceof Error ? error.message : "未知错误"}）`);
    }
  }

  if (items.length === 0 && aggregatorReady) {
    try {
      const payload = await fetchUpstreamJson(source);
      items = normalizeHotItems(extractRawList(payload));
      if (items.length === 0) problems.push("本地聚合服务返回空列表");
    } catch (error) {
      problems.push(
        `本地聚合服务失败（${error instanceof Error ? error.message : "未知错误"}）`,
      );
    }
  }

  if (items.length === 0) {
    return {
      board: fallback,
      demo: !fallback.live,
      warning: `抓取「${meta.label}」失败：${problems.join("；") || "无可用数据源"}，${fallbackHint}`,
      softCached: false,
    };
  }

  saveBoard(source, items);
  const fetchedAt = Date.now();
  memory.set(source, { items, at: fetchedAt });
  return {
    board: { source, label: meta.label, items, fetchedAt, live: true },
    demo: false,
    softCached: false,
  };
}

export async function refreshSources(sources: HotSourceKey[]): Promise<RefreshOutcome[]> {
  return Promise.all(sources.map((source) => refreshSource(source)));
}
