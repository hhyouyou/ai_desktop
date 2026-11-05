import { db } from "@/lib/db";

export type HotSourceKey =
  | "weibo"
  | "zhihu"
  | "baidu"
  | "douyin"
  | "bilibili"
  | "github"
  | "juejin"
  | "36kr";

export type HotSource = {
  key: HotSourceKey;
  label: string;
  accent: "coral" | "sun" | "blue" | "mint" | "violet" | "sky";
  hint: string;
};

export type HotItem = {
  rank: number;
  title: string;
  url: string;
  hot?: string;
  tag?: string;
};

export type HotBoard = {
  source: HotSourceKey;
  label: string;
  items: HotItem[];
  fetchedAt: number;
  live: boolean;
};

export const HOT_SOURCES: HotSource[] = [
  { key: "weibo", label: "微博热搜", accent: "coral", hint: "社会与娱乐" },
  { key: "zhihu", label: "知乎热榜", accent: "blue", hint: "讨论与观点" },
  { key: "baidu", label: "百度热搜", accent: "sun", hint: "全网关注" },
  { key: "douyin", label: "抖音热点", accent: "violet", hint: "短视频风向" },
  { key: "bilibili", label: "B 站热门", accent: "sky", hint: "二次元与知识" },
  { key: "github", label: "GitHub Trending", accent: "mint", hint: "开源趋势" },
  { key: "juejin", label: "掘金热榜", accent: "sun", hint: "开发者社区" },
  { key: "36kr", label: "36 氪热榜", accent: "coral", hint: "商业与创业" },
];

/**
 * 内置示例数据：在没有配置 HOT_API_BASE、且本地缓存为空时使用。
 * 页面上会明确标注「示例数据」，避免把演示内容当成实时热榜。
 */
const SEED: Record<HotSourceKey, HotItem[]> = {
  weibo: [
    { rank: 1, title: "年轻人开始流行把周末过成「半天」", url: "", hot: "128.4万", tag: "沸" },
    { rank: 2, title: "多地宣布地铁延长运营时间", url: "", hot: "96.1万" },
    { rank: 3, title: "这届打工人开始研究通勤经济学", url: "", hot: "74.2万", tag: "新" },
    { rank: 4, title: "秋天的第一杯奶茶又涨价了", url: "", hot: "61.8万" },
    { rank: 5, title: "专家建议不要用短视频下饭", url: "", hot: "52.3万" },
    { rank: 6, title: "为什么越来越多人开始写周报给自己看", url: "", hot: "44.9万" },
  ],
  zhihu: [
    { rank: 1, title: "如何评价「把工具做成积木」这种产品思路？", url: "", hot: "1.2万 回答" },
    { rank: 2, title: "一个人维护一个全栈网站是什么体验？", url: "", hot: "8,930 回答" },
    { rank: 3, title: "为什么浏览器能做越来越多的事？", url: "", hot: "6,412 回答" },
    { rank: 4, title: "独立开发者如何找到第一批用户？", url: "", hot: "5,207 回答" },
  ],
  baidu: [
    { rank: 1, title: "在线工具箱为什么又火了一遍", url: "", hot: "热搜 4,382,119" },
    { rank: 2, title: "图片压缩的三种常见误区", url: "", hot: "热搜 3,204,551" },
    { rank: 3, title: "个人网站备案流程更新", url: "", hot: "热搜 2,881,004" },
    { rank: 4, title: "浏览器本地计算的安全边界", url: "", hot: "热搜 2,100,332" },
  ],
  douyin: [
    { rank: 1, title: "把每天重复的事做成一个小工具", url: "", hot: "2,104.3万" },
    { rank: 2, title: "浏览器里就能完成的十件事", url: "", hot: "1,822.7万" },
    { rank: 3, title: "一分钟看懂 JSON 格式化", url: "", hot: "1,309.5万" },
    { rank: 4, title: "AI 写周报的正确打开方式", url: "", hot: "987.2万" },
  ],
  bilibili: [
    { rank: 1, title: "手搓一个极简工具箱网站", url: "", hot: "128.4万 播放" },
    { rank: 2, title: "前端工程师的效率工具清单", url: "", hot: "96.7万 播放" },
    { rank: 3, title: "从 0 到 1 做一个 AI 对话页面", url: "", hot: "74.5万 播放" },
    { rank: 4, title: "为什么我不用框架写小工具", url: "", hot: "52.1万 播放" },
  ],
  github: [
    { rank: 1, title: "daily-hot-api — 多平台热榜聚合服务", url: "https://github.com/HelTi/daily-hot-api", hot: "★ 97" },
    { rank: 2, title: "cobalt — 视频保存工具", url: "https://github.com/imputnet/cobalt", hot: "★ 34k" },
    { rank: 3, title: "next.js — React 全栈框架", url: "https://github.com/vercel/next.js", hot: "★ 132k" },
    { rank: 4, title: "better-sqlite3 — 同步 SQLite 绑定", url: "https://github.com/WiseLibs/better-sqlite3", hot: "★ 6.4k" },
  ],
  juejin: [
    { rank: 1, title: "一个周末把短链服务推到 10 万 QPS，真能靠加 Redis 解决吗", url: "", hot: "热度 8,420" },
    { rank: 2, title: "React 19 的 use() 到底该怎么用：三种真实场景拆解", url: "", hot: "热度 7,113" },
    { rank: 3, title: "我用 SQLite 替掉了生产环境的 Redis，半年后的复盘", url: "", hot: "热度 5,902" },
    { rank: 4, title: "前端性能优化清单：从 3.2s 到 0.9s 的十四步", url: "", hot: "热度 4,377" },
  ],
  "36kr": [
    { rank: 1, title: "效率工具赛道正在被 AI 重做一遍", url: "", hot: "热度 8,420" },
    { rank: 2, title: "小团队如何用 AI 压缩产品周期", url: "", hot: "热度 7,113" },
    { rank: 3, title: "浏览器能力的边界还在外扩", url: "", hot: "热度 5,902" },
  ],
};

export function seedBoard(source: HotSource): HotBoard {
  return {
    source: source.key,
    label: source.label,
    items: SEED[source.key] ?? [],
    fetchedAt: 0,
    live: false,
  };
}

/** 优先读缓存（由 /api/hot 刷新），没缓存时退回示例数据。 */
export function getCachedBoard(source: HotSourceKey): HotBoard {
  const meta = HOT_SOURCES.find((s) => s.key === source)!;
  const row = db
    .prepare("SELECT payload, fetched_at FROM hot_cache WHERE source = ?")
    .get(source) as { payload: string; fetched_at: number } | undefined;
  if (!row) return seedBoard(meta);
  try {
    const items = JSON.parse(row.payload) as HotItem[];
    if (!Array.isArray(items) || items.length === 0) return seedBoard(meta);
    return {
      source,
      label: meta.label,
      items,
      fetchedAt: row.fetched_at,
      live: true,
    };
  } catch {
    return seedBoard(meta);
  }
}

export function getCachedBoards(): HotBoard[] {
  return HOT_SOURCES.map((s) => getCachedBoard(s.key));
}

export function saveBoard(source: HotSourceKey, items: HotItem[]): void {
  db.prepare(
    `INSERT INTO hot_cache (source, payload, fetched_at) VALUES (?, ?, ?)
     ON CONFLICT(source) DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at`,
  ).run(source, JSON.stringify(items), Date.now());
}

export function isHotSourceKey(value: string): value is HotSourceKey {
  return HOT_SOURCES.some((s) => s.key === value);
}

export function sourceMeta(key: HotSourceKey): HotSource {
  return HOT_SOURCES.find((s) => s.key === key)!;
}
