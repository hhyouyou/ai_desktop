/**
 * 原生热榜适配器：用于未被本地聚合服务覆盖、或聚合服务适配器已失效的来源。
 *
 * 现状（2026-10 实测）：
 * - weibo：m.weibo.cn 对无 Cookie 请求返回 432；weibo.com/ajax/side/hotSearch 可直连
 * - baidu：top.baidu.com/board 的 HTML 结构变了，聚合服务解析成空列表；其 JSON 接口可直连
 * - github：github.com/trending 在本机被墙；改用 api.github.com 搜索接口
 *
 * 任何失败都抛错，由 lib/hot-fetch.ts 统一回退缓存 / 示例数据。
 */
import type { HotItem, HotSourceKey } from "@/lib/hot";

const TIMEOUT_MS = 8000;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

type Json = Record<string, unknown>;

function asRecord(value: unknown): Json | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Json)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberish(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatHot(value: number): string | undefined {
  if (!value) return undefined;
  return value >= 10_000 ? `${(value / 10_000).toFixed(1)} 万` : String(value);
}

async function getJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "user-agent": UA,
        accept: "application/json, text/plain, */*",
        "accept-language": "zh-CN,zh;q=0.9",
        ...headers,
      },
    });
    if (!response.ok) throw new Error(`上游返回 HTTP ${response.status}`);
    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

/* --------------------------------- 微博 --------------------------------- */

async function fetchWeibo(): Promise<HotItem[]> {
  const payload = asRecord(
    await getJson("https://weibo.com/ajax/side/hotSearch", { referer: "https://weibo.com/" }),
  );
  const data = asRecord(payload?.data);
  const list = asArray(data?.realtime);
  const items: HotItem[] = [];
  for (const entry of list) {
    const record = asRecord(entry);
    const title = text(record?.word) || text(record?.note);
    if (!record || !title) continue;
    const hot = formatHot(numberish(record.num) || numberish(record.raw_hot));
    items.push({
      rank: items.length + 1,
      title,
      url: `https://s.weibo.com/weibo?q=${encodeURIComponent(`#${title}#`)}`,
      ...(hot ? { hot } : {}),
      ...(text(record.label_name) ? { tag: text(record.label_name) } : {}),
    });
    if (items.length >= 30) break;
  }
  if (items.length === 0) throw new Error("微博返回空列表");
  return items;
}

/* --------------------------------- 百度 --------------------------------- */

async function fetchBaidu(): Promise<HotItem[]> {
  const payload = asRecord(
    await getJson("https://top.baidu.com/api/board?platform=wise&tab=realtime", {
      referer: "https://top.baidu.com/board?tab=realtime",
    }),
  );
  const data = asRecord(payload?.data);
  const cards = asArray(data?.cards);

  // 结构：data.cards[].content[].content[]（多一层嵌套，且部分榜单会多套）
  const collect = (node: unknown, out: HotItem[]): void => {
    if (out.length >= 30) return;
    const record = asRecord(node);
    if (!record) return;
    const nested = asArray(record.content);
    if (nested.length > 0) {
      for (const child of nested) collect(child, out);
      return;
    }
    const title = text(record.word) || text(record.query);
    if (!title) return;
    const tag = text(record.newHotName) || text(record.labelTagName);
    out.push({
      rank: out.length + 1,
      title,
      url: text(record.url) || `https://www.baidu.com/s?wd=${encodeURIComponent(title)}`,
      ...(tag ? { tag } : {}),
    });
  };

  const items: HotItem[] = [];
  for (const card of cards) collect(card, items);

  if (items.length === 0) throw new Error("百度返回空列表");
  return items;
}

/* ------------------------------- GitHub -------------------------------- */

async function fetchGithub(): Promise<HotItem[]> {
  const since = new Date(Date.now() - 21 * 86_400_000).toISOString().slice(0, 10);
  const query = encodeURIComponent(`created:>${since} stars:>200`);
  const payload = asRecord(
    await getJson(
      `https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc&per_page=20`,
      { accept: "application/vnd.github+json" },
    ),
  );
  const items: HotItem[] = [];
  for (const entry of asArray(payload?.items)) {
    const record = asRecord(entry);
    const name = text(record?.full_name);
    if (!record || !name) continue;
    const desc = text(record.description);
    items.push({
      rank: items.length + 1,
      title: desc ? `${name} — ${desc}`.slice(0, 90) : name,
      url: text(record.html_url),
      hot: `★ ${numberish(record.stargazers_count).toLocaleString("en-US")}`,
    });
  }
  if (items.length === 0) throw new Error("GitHub 搜索没有返回仓库");
  return items;
}

const NATIVE: Partial<Record<HotSourceKey, () => Promise<HotItem[]>>> = {
  weibo: fetchWeibo,
  baidu: fetchBaidu,
  github: fetchGithub,
};

export function hasNativeAdapter(source: HotSourceKey): boolean {
  return Boolean(NATIVE[source]);
}

/** 返回 null 表示该来源没有原生适配器，应交给本地聚合服务 */
export async function fetchNativeSource(source: HotSourceKey): Promise<HotItem[] | null> {
  const adapter = NATIVE[source];
  if (!adapter) return null;
  return adapter();
}
