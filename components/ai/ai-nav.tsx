"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import type { IconKey } from "@/lib/site";
import { cn } from "@/lib/utils";

const TABS: { href: string; label: string; icon: IconKey }[] = [
  { href: "/ai/app/chat", label: "对话", icon: "spark" },
  { href: "/ai/app/writing", label: "写作", icon: "pen" },
  { href: "/ai/app/settings", label: "模型设置", icon: "settings" },
  { href: "/drawing/create", label: "创建图片", icon: "brush" },
  { href: "/drawing/gallery", label: "灵感画廊", icon: "image" },
  { href: "/drawing/creations", label: "我的创作", icon: "heart" },
];

/** AI / 画图模块的二级导航，横向可滚动，避免小屏横向溢出整个页面 */
export function AiNav() {
  const pathname = usePathname();

  return (
    <div className="edge-b bg-paper">
      <div className="shell">
        <nav
          className="scroll-thin flex items-center gap-1.5 overflow-x-auto py-2.5"
          aria-label="AI 与画图模块导航"
        >
          {TABS.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3.5 py-2 text-[12.5px] font-extrabold transition-colors",
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-transparent text-ink-soft hover:border-ink/20 hover:bg-cream hover:text-ink",
                )}
              >
                <Icon name={tab.icon} size={14} />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
