"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { NAV_GROUPS, SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

type Props = { viewerName: string; anonymous: boolean };

/** 和桌面主页顶栏一致的主导航 */
const TABS = [
  { label: "桌面", href: "/" },
  { label: "工具", href: "/apps" },
  { label: "AI", href: "/ai/app/chat" },
  { label: "待办", href: "/user/todo" },
  { label: "热点", href: "/daily-hot" },
];

const MORE_LINKS = [
  { label: "AI 写作", href: "/ai/app/writing" },
  { label: "画图", href: "/drawing/create" },
  { label: "AI 简报", href: "/daily-brief" },
  { label: "技术博客", href: "/article" },
  { label: "网址导航", href: "/menus" },
  { label: "已安排", href: "/scheduled-tasks" },
  { label: "公告", href: "/announcements" },
  { label: "关于", href: "/about" },
  { label: "设置", href: "/settings" },
];

function isTabActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** 顶栏时钟：SSR 先占位，挂载后再走，避免水合不一致 */
function TopClock() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => {
      setTime(
        new Date().toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      );
    };
    tick();
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="topbar-clock" aria-label="当前时间">
      {time ?? "--:--"}
    </span>
  );
}

export function SiteHeader({ viewerName, anonymous }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const moreActive = MORE_LINKS.some((link) => isTabActive(pathname, link.href));
  const avatarText = anonymous ? "访" : viewerName.trim().charAt(0) || "我";
  const avatarHref = anonymous ? "/auth/login" : "/settings";
  const avatarTitle = anonymous ? "登录 / 注册" : `${viewerName} · 设置`;

  return (
    <header className="topbar">
      <Link href="/" className="topbar-left" aria-label={`${SITE.fullName} 首页`}>
        <span className="topbar-logo" aria-hidden="true" />
        <span className="topbar-wordmark">{SITE.name}</span>
        <span className="topbar-en">{SITE.nameEn}</span>
      </Link>

      <nav className="topbar-nav" aria-label="主导航">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(isTabActive(pathname, tab.href) && "on")}
            aria-current={isTabActive(pathname, tab.href) ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
        <div className="topbar-more">
          <button type="button" className={cn(moreActive && "on")} aria-haspopup="true">
            更多
          </button>
          <div className="topbar-menu" role="menu">
            {MORE_LINKS.map((link) => (
              <Link key={link.href} href={link.href} role="menuitem">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <div className="topbar-right">
        <Link href="/apps" className="topbar-search">
          <Icon name="search" size={13} />
          找工具
        </Link>
        <TopClock />
        <Link href={avatarHref} className="topbar-avatar" title={avatarTitle} aria-label={avatarTitle}>
          {avatarText}
        </Link>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="topbar-burger"
          aria-label={open ? "关闭菜单" : "打开菜单"}
          aria-expanded={open}
        >
          <Icon name={open ? "close" : "menu"} size={20} />
        </button>
      </div>

      {open && (
        <div className="topbar-drawer">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2">
              {TABS.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "flex items-center justify-between rounded-[10px] edge-2 bg-paper px-3 py-2.5 text-[13.5px] font-bold",
                    isTabActive(pathname, tab.href) && "bg-cream",
                  )}
                >
                  {tab.label}
                  <Icon name="arrow" size={13} />
                </Link>
              ))}
            </div>

            {NAV_GROUPS.map((group) => (
              <section key={group.label}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="eyebrow">{group.label}</span>
                  <Link href={group.href} className="text-[12px] font-bold underline">
                    进入
                  </Link>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 rounded-[10px] edge-2 bg-paper px-3 py-2.5"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-[8px] edge-sub bg-cream">
                        <Icon name={item.icon} size={15} />
                      </span>
                      <span>
                        <span className="block text-[13.5px] font-extrabold">{item.label}</span>
                        <span className="block text-[11.5px] text-ink-soft">{item.desc}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
