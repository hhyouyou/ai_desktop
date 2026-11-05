import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icons";
import { ACCENT_TILE } from "@/lib/accent";
import { getCategory, type Tool } from "@/lib/site";
import { cn } from "@/lib/utils";

export function ToolCard({
  tool,
  compact = false,
  action,
}: {
  tool: Tool;
  compact?: boolean;
  action?: ReactNode;
}) {
  const category = getCategory(tool.category);

  return (
    <Link
      href={`/apps/${tool.slug}`}
      className={cn(
        "tool-card hover-lift group relative flex flex-col rounded-[22px] edge bg-paper p-4 shadow-hard-sm",
        compact ? "gap-2.5" : "gap-3",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "tool-tile flex h-10 w-10 items-center justify-center rounded-[12px] edge",
            ACCENT_TILE[category.accent as "sun" | "blue" | "coral" | "mint" | "violet" | "sky"],
          )}
        >
          <Icon name={tool.icon} size={19} />
        </span>
        <div className="flex items-center gap-1.5">
          {tool.hot ? <span className="tag tag-coral px-2 py-0.5 text-[10px]">热门</span> : null}
          <span className="tag px-2 py-0.5 text-[10px]">{category.label}</span>
          {action}
        </div>
      </div>

      <div>
        <h3 className="text-[16px] font-extrabold leading-tight">{tool.title}</h3>
        {!compact ? (
          <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-ink-soft">
            {tool.blurb}
          </p>
        ) : null}
      </div>

      <div className="mt-auto flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {tool.tags.slice(0, compact ? 1 : 2).map((tag) => (
            <span key={tag} className="rounded-full bg-cream px-2 py-0.5 text-[10.5px] font-bold text-ink-soft">
              {tag}
            </span>
          ))}
        </div>
        <span className="flex h-7 w-7 items-center justify-center rounded-full edge-2 bg-paper transition-colors group-hover:bg-sun">
          <Icon name="arrow" size={13} />
        </span>
      </div>
    </Link>
  );
}
