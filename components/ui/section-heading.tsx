import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  desc,
  href,
  linkLabel = "查看全部",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  desc?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h2 className="display-lg">{title}</h2>
        {desc ? <p className="mt-2 max-w-[560px] text-[14.5px] text-ink-soft">{desc}</p> : null}
      </div>
      {href ? (
        <Link href={href} className="btn btn-sm">
          {linkLabel}
          <Icon name="arrow" size={14} />
        </Link>
      ) : null}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  desc,
  icon,
  actions,
}: {
  eyebrow?: string;
  title: string;
  desc?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="page-head edge-b bg-cream">
      <div className="shell flex flex-wrap items-start justify-between gap-6 py-10 md:py-12">
        <div className="flex items-start gap-4">
          {icon ? (
            <span className="page-head-icon flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] edge bg-sun shadow-hard-sm">
              {icon}
            </span>
          ) : null}
          <div>
            {eyebrow ? <p className="eyebrow mb-1.5">{eyebrow}</p> : null}
            <h1 className="display-lg">{title}</h1>
            {desc ? <p className="mt-2 max-w-[620px] text-[14.5px] text-ink-soft">{desc}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon?: ReactNode;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[24px] edge border-dashed border-ink/40 bg-cream/50 px-6 py-14 text-center">
      {icon ? <div className="mb-3 text-ink-soft">{icon}</div> : null}
      <p className="text-[15px] font-extrabold">{title}</p>
      {desc ? <p className="mt-1.5 max-w-[380px] text-[13px] text-ink-soft">{desc}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Stat({
  value,
  label,
  accent = "sun",
}: {
  value: ReactNode;
  label: string;
  accent?: "sun" | "blue" | "coral" | "mint" | "violet" | "sky";
}) {
  const dot = {
    sun: "bg-sun",
    blue: "bg-blue",
    coral: "bg-coral",
    mint: "bg-mint",
    violet: "bg-violet",
    sky: "bg-sky",
  }[accent];
  return (
    <div className="rounded-[18px] edge bg-paper px-4 py-3.5 shadow-hard-sm">
      <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink-soft">
        <span className={cn("h-1.5 w-1.5 rounded-full", dot)} aria-hidden="true" />
        {label}
      </p>
      <p className="mt-1.5 font-[family-name:var(--font-display)] text-[26px] leading-none">{value}</p>
    </div>
  );
}
