"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import type { ArticleCard, ArticleTagCount } from "@/components/content/article-types";
import { cn } from "@/lib/utils";

type Props = {
  articles: ArticleCard[];
  tags: ArticleTagCount[];
};

function TagFilter({
  tags,
  activeTag,
  total,
  onSelect,
}: {
  tags: ArticleTagCount[];
  activeTag: string | null;
  total: number;
  onSelect: (tag: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-pressed={activeTag === null}
        className={cn("tag transition-colors", activeTag === null ? "tag-ink" : "hover:bg-cream")}
      >
        全部
        <span className="font-[family-name:var(--font-mono)] text-[10px] opacity-70">{total}</span>
      </button>
      {tags.map((item) => {
        const active = activeTag === item.tag;
        return (
          <button
            key={item.tag}
            type="button"
            onClick={() => onSelect(active ? null : item.tag)}
            aria-pressed={active}
            className={cn("tag transition-colors", active ? "tag-coral" : "hover:bg-cream")}
          >
            {item.tag}
            <span className="font-[family-name:var(--font-mono)] text-[10px] opacity-70">
              {item.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ArticleExplorer({ articles, tags }: Props) {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filtered = activeTag ? articles.filter((article) => article.tags.includes(activeTag)) : articles;
  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Filter</p>
          <h2 className="mt-1 text-[18px] font-extrabold">
            {activeTag ? `标签「${activeTag}」` : "全部文章"}
          </h2>
        </div>
        <p className="text-[12px] text-ink-soft">
          共 {filtered.length} 篇
          {activeTag ? (
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className="ml-2 font-extrabold underline decoration-sun decoration-[3px] underline-offset-4"
            >
              清除筛选
            </button>
          ) : null}
        </p>
      </div>

      <div className="mt-4">
        <TagFilter tags={tags} activeTag={activeTag} total={articles.length} onSelect={setActiveTag} />
      </div>

      {featured ? (
        <Link
          href={`/article/${featured.slug}`}
          className="hover-lift group relative mt-6 block overflow-hidden rounded-[30px] edge bg-paper p-6 shadow-hard md:p-8"
        >
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-sun/40 blur-2xl" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="tag tag-coral">{activeTag ? "本标签最近一篇" : "最新"}</span>
              <span className="font-[family-name:var(--font-mono)] text-[11.5px] text-ink-soft">
                {featured.date}
              </span>
              <span className="text-[11.5px] text-ink-soft">· 约 {featured.readingTime} 分钟</span>
            </div>
            <h2 className="mt-4 max-w-[780px] font-[family-name:var(--font-display)] text-[clamp(1.35rem,3vw,2rem)] leading-tight tracking-[-0.02em] group-hover:underline group-hover:decoration-sun group-hover:decoration-[4px] group-hover:underline-offset-8">
              {featured.title}
            </h2>
            <p className="mt-3 max-w-[720px] text-[13.5px] leading-relaxed text-ink-soft">
              {featured.summary}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {featured.tags.map((tag) => (
                <span key={tag} className="tag px-2 py-0.5 text-[10.5px]">
                  {tag}
                </span>
              ))}
              <span className="ml-auto flex items-center gap-1.5 text-[12.5px] font-extrabold">
                阅读全文
                <Icon name="arrow" size={14} className="transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </Link>
      ) : (
        <div className="mt-6 flex flex-col items-center justify-center rounded-[24px] edge border-dashed border-ink/40 bg-cream/50 px-6 py-14 text-center">
          <Icon name="book" size={28} className="text-ink-soft" />
          <p className="mt-3 text-[15px] font-extrabold">这个标签下还没有文章</p>
          <p className="mt-1.5 max-w-[360px] text-[12.5px] leading-relaxed text-ink-soft">
            换个标签，或者点「全部」看看已有的几篇。
          </p>
        </div>
      )}

      {rest.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((article) => (
            <Link
              key={article.slug}
              href={`/article/${article.slug}`}
              className="hover-lift group flex flex-col rounded-[22px] edge bg-paper p-5 shadow-hard-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-[family-name:var(--font-mono)] text-[11px] text-ink-soft">
                  {article.date}
                </span>
                <span className="tag px-2 py-0.5 text-[9.5px]">{article.readingTime} 分钟</span>
              </div>
              <h3 className="mt-2.5 text-[16px] font-extrabold leading-snug group-hover:underline group-hover:decoration-sun group-hover:decoration-[3px] group-hover:underline-offset-4">
                {article.title}
              </h3>
              <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-ink-soft">
                {article.summary}
              </p>
              <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
                {article.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-bold text-ink-soft">
                    {tag}
                  </span>
                ))}
                <span className="ml-auto flex h-7 w-7 items-center justify-center rounded-full edge-2 bg-paper transition-colors group-hover:bg-sun">
                  <Icon name="arrow" size={13} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
