"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { GALLERY_CATEGORIES, type GalleryCategoryKey, type GalleryItem } from "@/lib/ai/gallery";
import { getDrawingSize, getDrawingStyle } from "@/lib/ai/svg";
import { cn } from "@/lib/utils";

export type GalleryCard = GalleryItem & { preview: string };

export function GalleryClient({ items }: { items: GalleryCard[] }) {
  const [category, setCategory] = useState<GalleryCategoryKey>("all");

  const filtered = useMemo(
    () => (category === "all" ? items : items.filter((item) => item.category === category)),
    [category, items],
  );

  const counts = useMemo(() => {
    const map = new Map<GalleryCategoryKey, number>();
    map.set("all", items.length);
    for (const item of items) {
      map.set(item.category, (map.get(item.category) ?? 0) + 1);
    }
    return map;
  }, [items]);

  return (
    <section className="shell py-6">
      <div className="scroll-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {GALLERY_CATEGORIES.map((item) => {
          const active = item.key === category;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setCategory(item.key)}
              aria-pressed={active}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full edge px-3.5 py-1.5 text-[12.5px] font-extrabold transition-colors",
                active
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/25 bg-paper text-ink-soft hover:border-ink hover:text-ink",
              )}
            >
              {item.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[9.5px]",
                  active ? "bg-paper/20 text-paper" : "bg-cream text-ink-soft",
                )}
              >
                {counts.get(item.key) ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => {
          const styleMeta = getDrawingStyle(item.style);
          const sizeMeta = getDrawingSize(item.size);
          const link = `/drawing/create?prompt=${encodeURIComponent(item.prompt)}&style=${item.style}&size=${item.size}`;
          return (
            <article
              key={item.id}
              className="hover-lift group flex flex-col overflow-hidden rounded-[24px] edge bg-paper shadow-hard"
            >
              <div className="relative overflow-hidden edge-b bg-cream">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.preview}
                  alt={`${item.title}的几何预览图`}
                  loading="lazy"
                  className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <span className="absolute left-2.5 top-2.5 tag tag-sun px-2 py-0.5 text-[9.5px]">
                  {styleMeta.label}
                </span>
                <span className="absolute right-2.5 top-2.5 tag px-2 py-0.5 text-[9.5px]">
                  {sizeMeta.label}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-3.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-extrabold">{item.title}</h3>
                  <span className="tag tag-violet px-1.5 py-0.5 text-[9px]">{item.note}</span>
                </div>
                <p className="mt-1.5 line-clamp-3 text-[11.5px] leading-relaxed text-ink-soft">
                  {item.prompt}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Link href={link} className="btn btn-sm btn-primary flex-1">
                    <Icon name="brush" size={12} />
                    用它生成
                  </Link>
                  <Link
                    href={`/drawing/create?prompt=${encodeURIComponent(item.prompt)}&style=${item.style}`}
                    className="btn btn-sm px-2.5"
                    title="只带入提示词"
                  >
                    只带提示词
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[20px] edge bg-cream px-4 py-3">
        <p className="text-[12px] leading-relaxed text-ink-soft">
          画廊里的缩略图由站内程序化几何引擎生成，所以点开后的演示结果和这里的风格是一致的。
        </p>
        <Link href="/drawing/creations" className="btn btn-sm shrink-0">
          <Icon name="heart" size={12} />
          看我的创作
        </Link>
      </div>
    </section>
  );
}
