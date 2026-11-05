"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { ToolCard } from "@/components/tool-card";
import { EmptyState } from "@/components/ui/section-heading";
import { ACCENT_TILE, ACCENT_TAG, type Accent } from "@/lib/accent";
import { TOOL_CATEGORIES, type Tool, type ToolCategoryKey } from "@/lib/site";
import { cn } from "@/lib/utils";

type FilterKey = "all" | "fav" | ToolCategoryKey;

type FavoriteResponse = {
  ok: boolean;
  data?: { favorited: boolean } | string[];
  error?: string;
};

const CATEGORY_ICON: Record<ToolCategoryKey, "calc" | "code" | "image" | "text"> = {
  freq: "calc",
  dev: "code",
  image: "image",
  text: "text",
};

function ToolCardWithFavorite({
  tool,
  favorited,
  pending,
  onToggle,
}: {
  tool: Tool;
  favorited: boolean;
  pending: boolean;
  onToggle: (slug: string) => void;
}) {
  return (
    <ToolCard
      tool={tool}
      action={
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggle(tool.slug);
          }}
          disabled={pending}
          aria-pressed={favorited}
          aria-label={favorited ? `取消收藏 ${tool.title}` : `收藏 ${tool.title}`}
          title={favorited ? "取消收藏" : "收藏"}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full edge-2 transition-colors disabled:opacity-60",
            favorited ? "bg-coral text-white" : "bg-paper text-ink hover:bg-sun",
          )}
        >
          <Icon name="heart" size={12} />
        </button>
      }
    />
  );
}

export function ToolsBrowser({
  tools,
  initialFavorites,
}: {
  tools: Tool[];
  initialFavorites: string[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set(initialFavorites));
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const map = new Map<ToolCategoryKey, number>();
    for (const category of TOOL_CATEGORIES) {
      map.set(
        category.key,
        tools.filter((tool) => tool.category === category.key).length,
      );
    }
    return map;
  }, [tools]);

  const normalizedQuery = query.trim().toLowerCase();

  const visible = useMemo(() => {
    return tools.filter((tool) => {
      if (filter === "fav" && !favorites.has(tool.slug)) return false;
      if (filter !== "all" && filter !== "fav" && tool.category !== filter) return false;
      if (!normalizedQuery) return true;
      const haystack = [tool.title, tool.blurb, tool.slug, ...tool.tags].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [favorites, filter, normalizedQuery, tools]);

  const grouped = filter === "all" && !normalizedQuery;

  const favoriteTools = useMemo(() => {
    const order = new Map(initialFavorites.map((slug, index) => [slug, index] as const));
    return tools
      .filter((tool) => favorites.has(tool.slug))
      .sort(
        (a, b) =>
          (order.get(a.slug) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.slug) ?? Number.MAX_SAFE_INTEGER),
      );
  }, [favorites, initialFavorites, tools]);

  const toggleFavorite = async (slug: string) => {
    if (pendingSlug) return;
    setPendingSlug(slug);
    setError(null);
    try {
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const payload = (await response.json()) as FavoriteResponse;
      const data = payload.data;
      if (!response.ok || !payload.ok || Array.isArray(data) || !data) {
        throw new Error(payload.error ?? "收藏操作失败，请稍后重试");
      }
      setFavorites((prev) => {
        const next = new Set(prev);
        if (data.favorited) next.add(slug);
        else next.delete(slug);
        return next;
      });
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "收藏操作失败，请稍后重试");
    } finally {
      setPendingSlug(null);
    }
  };

  const renderGrid = (items: Tool[]) => (
    <div className="grid gap-4 pt-1 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((tool) => (
        <ToolCardWithFavorite
          key={tool.slug}
          tool={tool}
          favorited={favorites.has(tool.slug)}
          pending={pendingSlug === tool.slug}
          onToggle={(slug) => {
            void toggleFavorite(slug);
          }}
        />
      ))}
    </div>
  );

  const filterChips: { key: FilterKey; label: string }[] = [
    { key: "all", label: `全部 ${tools.length}` },
    ...TOOL_CATEGORIES.map((category) => ({
      key: category.key as FilterKey,
      label: `${category.label} ${counts.get(category.key) ?? 0}`,
    })),
    { key: "fav", label: `我的收藏 ${favorites.size}` },
  ];

  return (
    <div>
      <div className="rounded-[26px] edge bg-cream p-4 shadow-hard-sm sm:p-5">
        <div className="relative">
          <label className="sr-only" htmlFor="tool-search">
            搜索工具
          </label>
          <Icon
            name="search"
            size={17}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft"
          />
          <input
            id="tool-search"
            className="field pl-11 pr-11"
            type="search"
            placeholder="搜索工具名称、用途或标签，例如「压缩」「二维码」"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="清空搜索"
              className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full edge-2 bg-paper hover:bg-sun"
            >
              <Icon name="close" size={12} />
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {filterChips.map((chip) => {
            const active = filter === chip.key;
            const category = TOOL_CATEGORIES.find((item) => item.key === chip.key);
            return (
              <button
                key={chip.key}
                type="button"
                aria-pressed={active}
                data-active={active || undefined}
                onClick={() => setFilter(chip.key)}
                className={cn(
                  "filter-chip flex items-center gap-1.5 rounded-full edge-2 px-3 py-1.5 text-[12.5px] font-extrabold transition-colors",
                  active ? "bg-ink text-paper" : "bg-paper text-ink hover:bg-sun/40",
                )}
              >
                {chip.key === "fav" ? (
                  <Icon name="heart" size={12} />
                ) : category ? (
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-[5px] border border-ink",
                      ACCENT_TAG[category.accent as Accent],
                    )}
                  >
                    <Icon name={CATEGORY_ICON[category.key]} size={9} />
                  </span>
                ) : (
                  <Icon name="grid" size={12} />
                )}
                {chip.label}
              </button>
            );
          })}
          {query || filter !== "all" ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
              className="rounded-full px-2.5 py-1.5 text-[12px] font-bold text-ink-soft underline decoration-2 underline-offset-2 hover:text-ink"
            >
              清空筛选
            </button>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="mt-3 rounded-[12px] border-2 border-coral/60 bg-coral/10 px-3 py-2 text-[12px] font-bold">
            {error}
          </p>
        ) : null}
      </div>

      {filter === "all" && !normalizedQuery && favoriteTools.length > 0 ? (
        <section id="cat-fav" className="mt-6 scroll-mt-24">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[12px] edge bg-coral text-white">
                <Icon name="heart" size={18} />
              </span>
              <div>
                <h2 className="text-[19px] font-extrabold leading-tight">我的收藏</h2>
                <p className="mt-0.5 text-[12px] text-ink-soft">按收藏时间排列，点卡片右上角的心形按钮可以取消。</p>
              </div>
            </div>
            <span className="tag tag-coral text-[10.5px]">{favoriteTools.length} 款</span>
          </div>
          {renderGrid(favoriteTools)}
        </section>
      ) : null}

      <div className="mt-8">
        {visible.length === 0 ? (
          <EmptyState
            icon={<Icon name="search" size={26} />}
            title={filter === "fav" && !normalizedQuery ? "还没有收藏工具" : "没有找到匹配的工具"}
            desc={
              filter === "fav" && !normalizedQuery
                ? "点工具卡片右上角的心形按钮，把常用工具收进来。"
                : "换个关键词，或切回全部分类再看看。"
            }
            action={
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                浏览全部工具
              </button>
            }
          />
        ) : grouped ? (
          <div className="space-y-9">
            {TOOL_CATEGORIES.map((category) => {
              const items = visible.filter((tool) => tool.category === category.key);
              if (items.length === 0) return null;
              const accent = category.accent as Accent;
              return (
                <section key={category.key} id={`cat-${category.key}`} className="scroll-mt-24">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "tool-tile flex h-10 w-10 items-center justify-center rounded-[12px] edge",
                          ACCENT_TILE[accent],
                        )}
                      >
                        <Icon name={CATEGORY_ICON[category.key]} size={18} />
                      </span>
                      <div>
                        <h2 className="text-[19px] font-extrabold leading-tight">{category.label}</h2>
                        <p className="mt-0.5 text-[12px] text-ink-soft">{category.desc}</p>
                      </div>
                    </div>
                    <span className="tag text-[10.5px]">{items.length} 款</span>
                  </div>
                  {renderGrid(items)}
                </section>
              );
            })}
          </div>
        ) : (
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[19px] font-extrabold">
                {filter === "fav"
                  ? "我的收藏"
                  : normalizedQuery
                    ? `搜索结果（${visible.length}）`
                    : TOOL_CATEGORIES.find((category) => category.key === filter)?.label}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
                className="btn btn-sm btn-ghost"
              >
                返回全部分类
              </button>
            </div>
            {renderGrid(visible)}
          </section>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[18px] edge-sub bg-cream/60 px-4 py-3 text-[12px] text-ink-soft">
        <span className="flex items-center gap-1.5 font-bold text-ink">
          <Icon name="lock" size={13} />
          全部在浏览器本地运行
        </span>
        <span>文件不上传服务器</span>
        <span>无需注册即可使用</span>
        <span>移动端同样可用</span>
        <Link href="/about" className="ml-auto font-bold text-ink underline decoration-sun decoration-[3px] underline-offset-4">
          关于块集
        </Link>
      </div>
    </div>
  );
}
