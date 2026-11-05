"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_THEME, isThemeId, normalizeTheme, THEMES, type ThemeId } from "@/lib/theme";

const STORAGE_KEY = "blockset.theme";

function applyTheme(theme: ThemeId) {
  const root = document.querySelector<HTMLElement>(".desk-root");
  if (root) root.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* 隐私模式下忽略 */
  }
}

async function persistTheme(theme: ThemeId) {
  try {
    await fetch("/api/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    });
  } catch {
    /* 网络失败时至少本地已生效 */
  }
}

/**
 * 桌面主题切换器。
 * - 首屏主题由服务端按 cookie 渲染，不闪烁
 * - 切换时立即改 data-theme（本地生效），再写 cookie 供下次服务端渲染
 * - 支持 ?theme=xxx 深链，方便分享 / 截图
 */
export function ThemePicker({ initialTheme }: { initialTheme: ThemeId }) {
  const [theme, setTheme] = useState<ThemeId>(initialTheme);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // 深链优先：?theme=xxx
    const fromQuery = new URLSearchParams(window.location.search).get("theme");
    if (fromQuery && isThemeId(fromQuery)) {
      const next = normalizeTheme(fromQuery);
      applyTheme(next);
      setTheme(next);
      void persistTheme(next);
      return;
    }
    // 本地缓存兜底（cookie 被清掉时仍能记住）
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local && isThemeId(local) && local !== initialTheme) {
        applyTheme(local);
        setTheme(local);
        void persistTheme(local);
      }
    } catch {
      /* ignore */
    }
  }, [initialTheme]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const choose = useCallback((next: ThemeId) => {
    applyTheme(next);
    setTheme(next);
    void persistTheme(next);
    setSaved(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 1600);
  }, []);

  return (
    <div className="theme-fab" ref={wrapRef}>
      {open ? (
        <div className="theme-panel" role="dialog" aria-label="选择桌面主题">
          <h3>选择桌面主题</h3>
          {THEMES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`theme-opt${item.id === theme ? " on" : ""}`}
              onClick={() => choose(item.id)}
              aria-pressed={item.id === theme}
              data-theme-id={item.id}
            >
              <span className="swatch" aria-hidden="true">
                {item.swatches.map((color) => (
                  <i key={color} style={{ background: color }} />
                ))}
              </span>
              <span>
                <b>{item.name}</b>
                <small>{item.desc}</small>
              </span>
              <span className={`badge${item.id === theme ? " on-badge" : ""}`}>
                {item.id === theme ? "当前" : item.id === DEFAULT_THEME ? "默认" : item.kind === "layout" ? "布局" : ""}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        className="theme-btn"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="切换桌面主题"
      >
        <span aria-hidden="true">◎</span>
        {saved ? "已切换" : "主题"}
      </button>
    </div>
  );
}
