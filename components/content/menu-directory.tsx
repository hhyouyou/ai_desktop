"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import type { MenuGroup } from "@/components/content/menu-data";
import { ACCENT_TILE } from "@/lib/accent";
import { cn } from "@/lib/utils";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function MenuDirectory({ groups, total }: { groups: MenuGroup[]; total: number }) {
  const [query, setQuery] = useState("");
  const keyword = query.trim().toLowerCase();

  const filtered = groups
    .map((group) => ({
      group,
      sites: keyword
        ? group.sites.filter((site) =>
            `${site.name} ${site.desc} ${site.url}`.toLowerCase().includes(keyword),
          )
        : group.sites,
    }))
    .filter((entry) => entry.sites.length > 0);

  const matchCount = filtered.reduce((sum, entry) => sum + entry.sites.length, 0);

  return (
    <div>
      <div className="surface-tight flex items-center gap-3 p-2.5">
        <Icon name="search" size={18} className="ml-1 shrink-0 text-ink-soft" />
        <label htmlFor="menu-search" className="sr-only">
          搜索站点
        </label>
        <input
          id="menu-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索站点名称、描述或域名，例如 MDN、配色、RSS"
          className="w-full bg-transparent text-[14px] font-bold text-ink outline-none placeholder:font-normal placeholder:text-ink-soft/60"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="btn btn-sm btn-ghost shrink-0 px-2"
            aria-label="清空搜索"
          >
            <Icon name="close" size={15} />
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-ink-soft">
        <span>
          {keyword ? (
            <>
              匹配到 <span className="font-extrabold text-ink">{matchCount}</span> 个站点
            </>
          ) : (
            <>
              共 <span className="font-extrabold text-ink">{total}</span> 个站点，{groups.length} 个分组
            </>
          )}
        </span>
        <span className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.12em]">
          LOCAL BOOKMARKS
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-5 flex flex-col items-center justify-center rounded-[24px] edge border-dashed border-ink/40 bg-cream/50 px-6 py-14 text-center">
          <Icon name="search" size={28} className="text-ink-soft" />
          <p className="mt-3 text-[15px] font-extrabold">没有匹配「{query.trim()}」的站点</p>
          <p className="mt-1.5 max-w-[360px] text-[12.5px] leading-relaxed text-ink-soft">
            试试更短的关键词，比如「文档」「图片」「配色」，或者直接清空搜索。
          </p>
          <button type="button" className="btn btn-sm mt-5" onClick={() => setQuery("")}>
            清空搜索
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {filtered.map(({ group, sites }) => (
            <section key={group.key}>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-[13px] edge",
                    ACCENT_TILE[group.accent],
                  )}
                >
                  <Icon name={group.icon} size={19} />
                </span>
                <div>
                  <h2 className="text-[17px] font-extrabold leading-tight">{group.label}</h2>
                  <p className="mt-0.5 text-[12px] text-ink-soft">{group.blurb}</p>
                </div>
                <span className="tag ml-auto px-2.5 py-1 text-[10.5px]">{sites.length}</span>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sites.map((site) => (
                  <a
                    key={site.url}
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover-lift group flex h-full flex-col rounded-[18px] edge bg-paper p-4 shadow-hard-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[14.5px] font-extrabold">{site.name}</span>
                      <Icon
                        name="arrow"
                        size={14}
                        className="mt-0.5 shrink-0 -rotate-45 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </div>
                    <p className="mt-1.5 line-clamp-2 flex-1 text-[12px] leading-relaxed text-ink-soft">
                      {site.desc}
                    </p>
                    <span className="mt-2.5 font-[family-name:var(--font-mono)] text-[10.5px] text-ink-soft/80">
                      {hostOf(site.url)}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
