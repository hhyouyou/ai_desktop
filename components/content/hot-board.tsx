"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import type { HotApiResponse } from "@/components/content/hot-api-types";
import type { HotBoard, HotItem, HotSource, HotSourceKey } from "@/lib/hot";
import { cn, formatDate } from "@/lib/utils";

type Props = {
  sources: HotSource[];
  initialBoards: HotBoard[];
  configured: boolean;
  today: string;
};

type TabKey = "all" | HotSourceKey;

const ALL = "all" as const;

function RankBadge({ rank }: { rank: number }) {
  return (
    <span className={cn("hot-rank", rank <= 3 && "top")} aria-hidden="true">
      {rank}
    </span>
  );
}

function HotRow({ item }: { item: HotItem }) {
  const body = (
    <>
      <RankBadge rank={item.rank} />
      <span className="hot-row-body">
        <span className="hot-row-title">
          {item.title}
          {item.tag ? <span className="hot-row-tag">{item.tag}</span> : null}
        </span>
        {item.hot ? <span className="hot-row-heat">{item.hot}</span> : null}
      </span>
      {item.url ? <Icon name="arrow" size={13} className="hot-row-arrow" /> : null}
    </>
  );

  if (!item.url) {
    return <div className="hot-row">{body}</div>;
  }

  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className="hot-row">
      {body}
    </a>
  );
}

function AggregateBoard({
  source,
  board,
  onOpen,
}: {
  source: HotSource;
  board?: HotBoard;
  onOpen: () => void;
}) {
  const items = board?.items.slice(0, 5) ?? [];

  return (
    <section className="hot-board">
      <header className="hot-board-head">
        <span className="hot-board-name">{source.label}</span>
        <span className={cn("hot-board-meta", board?.live && "is-live")}>
          <i aria-hidden="true" />
          {board?.live ? "实时" : "示例"} · {board?.items.length ?? 0} 条
        </span>
      </header>

      {items.length > 0 ? (
        <ol className="hot-board-list">
          {items.map((item) => (
            <li key={`${item.rank}-${item.title}`} className="hot-row">
              <RankBadge rank={item.rank} />
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hot-row-title"
                >
                  {item.title}
                </a>
              ) : (
                <span className="hot-row-title">{item.title}</span>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="hot-board-empty">这个来源暂时没有数据，点「刷新」重试。</p>
      )}

      <button type="button" onClick={onOpen} className="hot-more">
        查看全部 {board?.items.length ?? 0} 条
        <Icon name="arrow" size={12} />
      </button>
    </section>
  );
}

export function HotBoardPanel({ sources, initialBoards, configured, today }: Props) {
  const [boards, setBoards] = useState<HotBoard[]>(initialBoards);
  const [active, setActive] = useState<TabKey>(ALL);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [lastRefresh, setLastRefresh] = useState<number | null>(null);

  const boardMap = useMemo(
    () => new Map(boards.map((board) => [board.source, board])),
    [boards],
  );
  const liveBoards = boards.filter((board) => board.live).length;
  const demoMode = liveBoards === 0;
  const activeBoard = active === ALL ? null : boardMap.get(active) ?? null;

  const latestFetchedAt = boards.reduce((max, board) => Math.max(max, board.fetchedAt), 0);
  const statusText = lastRefresh
    ? `刚刚刷新 · ${formatDate(lastRefresh, true)}`
    : latestFetchedAt > 0
      ? `缓存时间 ${formatDate(latestFetchedAt, true)}`
      : "尚未抓取，当前是示例数据";

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    setError(null);
    try {
      const params = new URLSearchParams({ refresh: "1" });
      if (active !== ALL) params.set("source", active);
      const response = await fetch(`/api/hot?${params.toString()}`, { cache: "no-store" });
      const json = (await response.json()) as HotApiResponse;
      if (!response.ok || !json.ok) {
        throw new Error(json.ok ? "刷新失败，请稍后重试" : json.error);
      }
      setBoards(json.data.boards);
      setWarnings(json.data.warnings);
      setLastRefresh(Date.now());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "刷新失败，请稍后重试");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="hot-desk">
      {!configured ? (
        <div className="hot-notice">
          <div className="hot-notice-head">
            <span className="tag tag-sun">示例数据</span>
            <b>还没有接入实时数据源，下面是内置示例榜单（{today}）</b>
          </div>
          <p>
            接入方式：设置环境变量 <code>HOT_API_BASE</code> 指向一个热榜 JSON 接口（例如自建的
            daily-hot-api），重启 dev server 后点「刷新」即可。接口约定：地址为{" "}
            <code>HOT_API_BASE</code> + <code>/weibo</code> 等来源名，返回 JSON 数组或{" "}
            <code>{"{ data: [...] }"}</code>；条目至少包含 <code>title</code>，可选{" "}
            <code>url</code> / <code>hot</code> / <code>tag</code>。抓取结果写入本地 hot_cache，
            失败时自动回退缓存或示例数据。
          </p>
        </div>
      ) : demoMode ? (
        <div className="hot-notice">
          <span className="tag tag-blue">实时数据未就绪</span>
          已配置 HOT_API_BASE，但本地缓存里还没有实时榜单。点「刷新」尝试抓取；如果上游不可达，会继续展示示例数据并给出提示。
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div className="hot-notice warn">
          <div className="flex items-start justify-between gap-3">
            <p className="hot-notice-title">部分来源没有取到实时数据</p>
            <button
              type="button"
              onClick={() => setWarnings([])}
              className="shrink-0 text-[11px] font-bold text-ink-soft underline"
            >
              知道了
            </button>
          </div>
          <ul>
            {warnings.slice(0, 4).map((warning) => (
              <li key={warning}>· {warning}</li>
            ))}
            {warnings.length > 4 ? <li>· 还有 {warnings.length - 4} 条提示</li> : null}
          </ul>
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="hot-notice warn">
          <div className="flex flex-wrap items-center gap-3">
            <Icon name="close" size={16} className="text-coral" />
            <p className="flex-1">{error}</p>
            <button type="button" onClick={refresh} className="btn btn-sm">
              重试
            </button>
          </div>
        </div>
      ) : null}

      <div className="hot-grid">
        <div className="lg:sticky lg:top-[92px] lg:self-start">
          <section className="hot-sources" aria-label="热点来源">
            <div className="hot-sources-head">
              <p className="eyebrow">Sources</p>
              <span>{sources.length} 个来源</span>
            </div>

            <div className="hot-source-list" role="group" aria-label="选择热点来源">
              <button
                type="button"
                onClick={() => setActive(ALL)}
                aria-pressed={active === ALL}
                className={cn("hot-source", active === ALL && "on")}
              >
                <span className="hot-source-rank" aria-hidden="true">
                  <Icon name="grid" size={13} />
                </span>
                <span className="hot-source-body">
                  <span className="hot-source-name">全部来源</span>
                  <span className="hot-source-meta">每个来源前 5 条</span>
                </span>
              </button>

              {sources.map((source, index) => {
                const board = boardMap.get(source.key);
                const isActive = active === source.key;
                return (
                  <button
                    key={source.key}
                    type="button"
                    onClick={() => setActive(source.key)}
                    aria-pressed={isActive}
                    className={cn("hot-source", isActive && "on")}
                  >
                    <span className="hot-source-rank" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="hot-source-body">
                      <span className="hot-source-name">
                        {source.label}
                        <i
                          className={cn("hot-source-dot", board?.live && "is-live")}
                          aria-hidden="true"
                        />
                      </span>
                      <span className="hot-source-meta">
                        {source.hint} · {board?.items.length ?? 0} 条
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="min-w-0">
          <div className="hot-main-head">
            <div>
              <h2 className="hot-main-title">{activeBoard ? activeBoard.label : "全部来源"}</h2>
              <p className="hot-main-status">{statusText}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {activeBoard && !activeBoard.live ? (
                <span className="tag tag-sun">示例数据</span>
              ) : null}
              {activeBoard?.live ? <span className="tag tag-mint">实时</span> : null}
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={refresh}
                disabled={refreshing}
                aria-busy={refreshing}
              >
                <Icon
                  name={refreshing ? "clock" : "spark"}
                  size={14}
                  className={refreshing ? "animate-spin" : undefined}
                />
                {refreshing ? "抓取中…" : "刷新"}
              </button>
            </div>
          </div>

          {refreshing ? (
            <div className="hot-refreshing">
              <span className="h-2 w-2 animate-pulse rounded-full bg-coral" />
              正在请求上游（超时 8 秒），失败会自动回退到缓存或示例数据…
            </div>
          ) : null}

          {active === ALL ? (
            <div className="hot-board-grid">
              {sources.map((source) => (
                <AggregateBoard
                  key={source.key}
                  source={source}
                  board={boardMap.get(source.key)}
                  onOpen={() => setActive(source.key)}
                />
              ))}
            </div>
          ) : activeBoard && activeBoard.items.length > 0 ? (
            <ol className="hot-list">
              {activeBoard.items.map((item) => (
                <li key={`${item.rank}-${item.title}`}>
                  <HotRow item={item} />
                </li>
              ))}
            </ol>
          ) : (
            <div className="hot-empty">
              <Icon name="flame" size={26} />
              <p className="hot-empty-title">这个来源暂时没有内容</p>
              <p className="hot-empty-desc">
                可能是上游返回空列表，或者还没有抓到数据。点「刷新」重试一次。
              </p>
              <button type="button" className="btn btn-sm mt-1" onClick={refresh} disabled={refreshing}>
                刷新看看
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
