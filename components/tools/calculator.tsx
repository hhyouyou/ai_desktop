"use client";

import { useCallback, useEffect, useState } from "react";
import { evaluateExpression, plainCalcNumber, type EvalResult } from "@/lib/tools/expression";
import { cn } from "@/lib/utils";
import { CopyButton, Notice, Panel } from "./ui";

const HISTORY_KEY = "blockset.calculator.history.v1";

type HistoryItem = { expr: string; display: string };

type KeyDef = {
  label: string;
  aria: string;
  insert?: string;
  action?: "clear" | "back" | "equals";
  span?: boolean;
  tone?: "coral" | "sun" | "cream";
};

const KEYPAD: KeyDef[] = [
  { label: "C", aria: "清空", action: "clear", tone: "coral" },
  { label: "⌫", aria: "删除上一个字符", action: "back", tone: "cream" },
  { label: "(", aria: "左括号", insert: "(" },
  { label: ")", aria: "右括号", insert: ")" },
  { label: "7", aria: "数字 7", insert: "7" },
  { label: "8", aria: "数字 8", insert: "8" },
  { label: "9", aria: "数字 9", insert: "9" },
  { label: "÷", aria: "除", insert: "/", tone: "cream" },
  { label: "4", aria: "数字 4", insert: "4" },
  { label: "5", aria: "数字 5", insert: "5" },
  { label: "6", aria: "数字 6", insert: "6" },
  { label: "×", aria: "乘", insert: "*", tone: "cream" },
  { label: "1", aria: "数字 1", insert: "1" },
  { label: "2", aria: "数字 2", insert: "2" },
  { label: "3", aria: "数字 3", insert: "3" },
  { label: "−", aria: "减", insert: "-", tone: "cream" },
  { label: "0", aria: "数字 0", insert: "0" },
  { label: ".", aria: "小数点", insert: "." },
  { label: "%", aria: "百分号", insert: "%", tone: "cream" },
  { label: "＋", aria: "加", insert: "+", tone: "cream" },
  { label: "^", aria: "幂运算", insert: "^", tone: "cream" },
  { label: "=", aria: "计算结果", action: "equals", span: true, tone: "sun" },
];

const HISTORY_SEED: HistoryItem[] = [];

function isHistoryItem(value: unknown): value is HistoryItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as { expr?: unknown; display?: unknown };
  return typeof item.expr === "string" && typeof item.display === "string";
}

function loadHistory(): HistoryItem[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryItem).slice(0, 30);
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]): void {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {
    // 隐私模式下 localStorage 可能不可用，忽略即可
  }
}

export default function CalculatorTool() {
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState<EvalResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(HISTORY_SEED);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setHistory(loadHistory());
    setLoaded(true);
  }, []);

  const updateHistory = useCallback((next: HistoryItem[]) => {
    setHistory(next);
    saveHistory(next);
  }, []);

  const calculate = useCallback(() => {
    const next = evaluateExpression(expression);
    setResult(next);
    if (next.ok) {
      const item: HistoryItem = { expr: expression.trim(), display: next.display };
      setHistory((prev) => {
        const list = [item, ...prev.filter((entry) => entry.expr !== item.expr)].slice(0, 20);
        saveHistory(list);
        return list;
      });
    }
  }, [expression]);

  const onKey = useCallback(
    (token: string) => {
      setExpression((prev) => `${prev}${token}`);
    },
    [],
  );

  const handleKey = (key: KeyDef) => {
    if (key.insert) {
      onKey(key.insert);
      return;
    }
    if (key.action === "clear") {
      setExpression("");
      setResult(null);
      return;
    }
    if (key.action === "back") {
      setExpression((prev) => prev.slice(0, -1));
      return;
    }
    if (key.action === "equals") calculate();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
      <Panel title="输入算式" desc="支持 + - * / ( ) ^ %，按 Enter 计算。">
        <div className="rounded-[18px] edge bg-cream px-4 py-3">
          <label className="sr-only" htmlFor="calc-expression">
            算式
          </label>
          <input
            id="calc-expression"
            value={expression}
            onChange={(event) => setExpression(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                calculate();
              }
            }}
            placeholder="例如 (18 + 24) * 3"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-transparent font-[family-name:var(--font-mono)] text-[20px] font-bold leading-tight outline-none placeholder:text-ink/30 sm:text-[24px]"
          />
          <div className="mt-2 flex items-end justify-between gap-3">
            <span className="text-[11px] text-ink-soft">Enter 计算 · 结果保留 12 位有效数字</span>
            <span
              className="max-w-[62%] break-all text-right font-[family-name:var(--font-display)] text-[24px] leading-none text-ink sm:text-[30px]"
              aria-live="polite"
            >
              {result?.ok ? result.display : result ? "—" : "0"}
            </span>
          </div>
        </div>

        {result && !result.ok ? (
          <Notice tone="error" className="mt-3">
            {result.error}
          </Notice>
        ) : null}

        {result?.ok ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CopyButton text={plainCalcNumber(result.value)} label="复制结果" />
            <span className="text-[11.5px] text-ink-soft">= {result.display}</span>
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-4 gap-2">
          {KEYPAD.map((key) => (
            <button
              key={`${key.label}-${key.aria}`}
              type="button"
              onClick={() => handleKey(key)}
              aria-label={key.aria}
              className={cn(
                "flex h-11 items-center justify-center rounded-[14px] edge-2 text-[16px] font-extrabold shadow-[2px_2px_0_0_#14110F] transition-transform active:translate-x-[1px] active:translate-y-[1px] active:shadow-none sm:h-12",
                key.tone === "coral" && "bg-coral text-white",
                key.tone === "sun" && "bg-sun text-ink",
                key.tone === "cream" && "bg-cream text-ink",
                !key.tone && "bg-paper text-ink",
                key.span && "col-span-3",
              )}
            >
              {key.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[11.5px] text-ink-soft">试试：</span>
          {["(18+24)*3", "2^10", "1200*(1+8%)", "88/7"].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                setExpression(sample);
                setResult(null);
              }}
              className="rounded-full edge-2 bg-cream px-2.5 py-1 font-[family-name:var(--font-mono)] text-[11.5px] font-bold hover:bg-sun"
            >
              {sample}
            </button>
          ))}
        </div>
      </Panel>

      <Panel
        title="历史记录"
        desc="保存在本机浏览器，最多 20 条。"
        actions={
          history.length > 0 ? (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => updateHistory([])}
              aria-label="清空历史记录"
            >
              清空
            </button>
          ) : null
        }
      >
        {!loaded ? (
          <p className="text-[12.5px] text-ink-soft">正在读取本地记录…</p>
        ) : history.length === 0 ? (
          <div className="rounded-[18px] edge border-dashed border-ink/30 bg-cream/40 px-4 py-10 text-center">
            <p className="text-[13.5px] font-extrabold">还没有计算记录</p>
            <p className="mt-1.5 text-[12px] text-ink-soft">算出第一个结果后，这里会留下算式。</p>
          </div>
        ) : (
          <ul className="max-h-[430px] space-y-2 overflow-y-auto pr-1 scroll-thin">
            {history.map((item) => (
              <li
                key={`${item.expr}-${item.display}`}
                className="flex items-center gap-2 rounded-[14px] edge-sub bg-cream/60 px-2.5 py-2"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    setExpression(item.expr);
                    setResult(null);
                  }}
                  aria-label={`复用算式 ${item.expr}`}
                >
                  <span className="block truncate font-[family-name:var(--font-mono)] text-[11.5px] text-ink-soft">
                    {item.expr}
                  </span>
                  <span className="block truncate font-[family-name:var(--font-mono)] text-[14px] font-extrabold">
                    = {item.display}
                  </span>
                </button>
                <CopyButton text={item.display} label="复制" className="shrink-0" />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
