"use client";

import Link from "next/link";
import { useState } from "react";
import { DEFAULT_THEME, THEMES, themeById, type ThemeId } from "@/lib/theme";

/**
 * 设置页「外观」：与首页右下角切换器共用 /api/theme 和同一份注册表。
 * 主题全站生效；「恢复默认」会清掉 cookie，回落到 DEFAULT_THEME（纸面工作台）。
 */
export function AppearancePanel({ initialTheme }: { initialTheme: ThemeId }) {
  const [theme, setTheme] = useState<ThemeId>(initialTheme);
  const [saved, setSaved] = useState<"saved" | "reset" | null>(null);
  const [pending, setPending] = useState<ThemeId | "reset" | null>(null);

  function flash(kind: "saved" | "reset") {
    setSaved(kind);
    setTimeout(() => setSaved(null), 1800);
  }

  async function choose(next: ThemeId) {
    if (pending) return;
    setPending(next);
    try {
      const response = await fetch("/api/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: next }),
      });
      if (!response.ok) throw new Error("保存失败");
      setTheme(next);
      try {
        localStorage.setItem("blockset.theme", next);
      } catch {
        /* ignore */
      }
      flash("saved");
    } catch {
      /* 保留原选择，不打断页面 */
    } finally {
      setPending(null);
    }
  }

  async function resetToDefault() {
    if (pending) return;
    setPending("reset");
    try {
      const response = await fetch("/api/theme", { method: "DELETE" });
      if (!response.ok) throw new Error("重置失败");
      setTheme(DEFAULT_THEME);
      try {
        localStorage.setItem("blockset.theme", DEFAULT_THEME);
      } catch {
        /* ignore */
      }
      flash("reset");
    } catch {
      /* ignore */
    } finally {
      setPending(null);
    }
  }

  const current = themeById(theme);

  return (
    <section className="surface p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">APPEARANCE</p>
          <h2 className="mt-1 text-[19px] font-extrabold">桌面外观</h2>
          <p className="mt-1 max-w-[560px] text-[13px] leading-relaxed text-ink-soft">
            选一套桌面主题，保存后全站生效：首页桌面、工具页、AI 页、待办、热点、博客都会跟着换肤。
            当前：<strong className="text-ink">{current.name}</strong>
            {theme === DEFAULT_THEME ? "（默认）" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void resetToDefault()}
            disabled={pending !== null}
            className="btn btn-sm"
          >
            恢复默认
          </button>
          <Link href="/" className="btn btn-sm btn-primary">
            去桌面看看
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {THEMES.map((item) => {
          const active = item.id === theme;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => void choose(item.id)}
              aria-pressed={active}
              disabled={pending !== null && pending !== item.id}
              className={`relative rounded-[18px] edge p-4 text-left transition-colors ${
                active ? "border-ink bg-cream" : "border-ink/20 bg-paper hover:border-ink/50"
              } ${pending === item.id ? "opacity-70" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="flex gap-1.5">
                  {item.swatches.map((color) => (
                    <span
                      key={color}
                      className="h-4 w-4 rounded-[5px] border border-ink/15"
                      style={{ background: color }}
                    />
                  ))}
                </span>
                <span className="flex gap-1.5">
                  {item.id === DEFAULT_THEME ? (
                    <span className="tag px-2 py-0.5 text-[10px]">默认</span>
                  ) : null}
                  {active ? <span className="tag tag-sun px-2 py-0.5 text-[10px]">当前</span> : null}
                  {!active && item.kind === "layout" ? (
                    <span className="tag px-2 py-0.5 text-[10px]">布局</span>
                  ) : null}
                </span>
              </div>
              <p className="mt-3 text-[14px] font-extrabold">{item.name}</p>
              <p className="mt-0.5 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] text-ink-soft">
                {item.en}
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">{item.desc}</p>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-[11.5px] text-ink-soft" aria-live="polite">
        {saved === "reset"
          ? "已恢复默认：纸面工作台。"
          : saved === "saved"
            ? "已保存，全站立即生效。"
            : "选择后自动保存；如果之前存过其他主题，点「恢复默认」即可回到纸面工作台。"}
      </p>
    </section>
  );
}
