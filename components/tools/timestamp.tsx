"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TIME_ZONES,
  detectTimeZone,
  formatDateTime,
  formatOffset,
  humanizeDelta,
  parseDateTimeLocal,
  toDateTimeLocalValue,
  weekday,
  zonedTimeToMs,
} from "@/lib/tools/date";
import { cn } from "@/lib/utils";
import { CopyButton, Field, Notice, Panel, Segmented } from "./ui";

type Unit = "auto" | "s" | "ms";

type BatchLine = { input: string; ok: boolean; output: string };

function parseTimestamp(raw: string, unit: Unit): { ms: number; kind: "s" | "ms" } | null {
  const text = raw.trim();
  if (!/^-?\d+$/.test(text)) return null;
  const value = Number(text);
  if (!Number.isFinite(value)) return null;
  const kind: "s" | "ms" = unit === "auto" ? (Math.abs(value) >= 1e11 ? "ms" : "s") : unit;
  return { ms: kind === "s" ? value * 1000 : value, kind };
}

function describeTimestamp(ms: number, timeZone: string): string {
  return `${formatDateTime(ms, timeZone)} ${formatOffset(ms, timeZone)} · ${weekday(ms, timeZone)}`;
}

export default function TimestampTool() {
  const [now, setNow] = useState<number | null>(null);
  const [timeZone, setTimeZone] = useState("Asia/Shanghai");
  const [tsInput, setTsInput] = useState("");
  const [unit, setUnit] = useState<Unit>("auto");
  const [dateInput, setDateInput] = useState("");
  const [batchInput, setBatchInput] = useState("");
  const [batchResult, setBatchResult] = useState<BatchLine[] | null>(null);

  const localZone = useMemo(() => detectTimeZone(), []);
  const zoneOptions = useMemo(() => {
    const rest = TIME_ZONES.filter((zone) => zone.value !== localZone);
    return [{ value: localZone, label: `本地时区（${localZone}）` }, ...rest];
  }, [localZone]);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setDateInput(toDateTimeLocalValue(Date.now(), timeZone));
  }, [timeZone]);

  const nowMs = now ?? 0;

  const parsed = useMemo(() => parseTimestamp(tsInput, unit), [tsInput, unit]);
  const reverse = useMemo(() => {
    const parts = parseDateTimeLocal(dateInput);
    if (!parts) return null;
    const ms = zonedTimeToMs(parts, timeZone);
    if (!Number.isFinite(ms)) return null;
    return { ms, seconds: Math.floor(ms / 1000) };
  }, [dateInput, timeZone]);

  const convertLine = (line: string): BatchLine => {
    const asNumber = parseTimestamp(line, "auto");
    if (asNumber) {
      return { input: line, ok: true, output: `${formatDateTime(asNumber.ms, timeZone)} ${formatOffset(asNumber.ms, timeZone)} · ${Math.floor(asNumber.ms / 1000)} 秒` };
    }
    const parts = parseDateTimeLocal(line);
    if (parts) {
      const ms = zonedTimeToMs(parts, timeZone);
      return { input: line, ok: true, output: `${formatDateTime(ms, timeZone)} ${formatOffset(ms, timeZone)} · ${Math.floor(ms / 1000)} 秒 · ${ms} 毫秒` };
    }
    return { input: line, ok: false, output: "无法识别：请输入时间戳或 YYYY-MM-DD HH:mm(:ss)" };
  };

  const runBatch = () => {
    const lines = batchInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    setBatchResult(lines.map(convertLine));
  };

  const batchCopyText = (batchResult ?? [])
    .filter((line) => line.ok)
    .map((line) => line.output)
    .join("\n");

  return (
    <div className="space-y-4">
      <Panel title="当前时间戳" desc="每秒刷新，点复制按钮获取秒级或毫秒级时间戳。">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="tag tag-sun">实时</span>
            <select
              value={timeZone}
              onChange={(event) => setTimeZone(event.target.value)}
              className="field field-sm max-w-[260px] bg-paper"
              aria-label="显示时区"
            >
              {zoneOptions.map((zone) => (
                <option key={zone.value} value={zone.value}>
                  {zone.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[12px] text-ink-soft" aria-live="polite">
            {now ? `${describeTimestamp(nowMs, timeZone)} · ${humanizeDelta(nowMs)}` : "正在读取当前时间…"}
          </p>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-[16px] edge-2 bg-cream px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-ink-soft">秒级（10 位）</span>
              <CopyButton text={now ? String(Math.floor(nowMs / 1000)) : ""} label="复制" className="btn-sm" />
            </div>
            <p className="mt-1 break-all font-[family-name:var(--font-mono)] text-[20px] font-extrabold">
              {now ? Math.floor(nowMs / 1000) : "—"}
            </p>
          </div>
          <div className="rounded-[16px] edge-2 bg-cream px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-ink-soft">毫秒级（13 位）</span>
              <CopyButton text={now ? String(nowMs) : ""} label="复制" className="btn-sm" />
            </div>
            <p className="mt-1 break-all font-[family-name:var(--font-mono)] text-[20px] font-extrabold">
              {now ? nowMs : "—"}
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="时间戳 → 日期" desc="自动识别 10 位（秒）与 13 位（毫秒），也可以手动指定。">
          <Field label="时间戳" htmlFor="ts-input" hint="支持负数（1970 年之前）。">
            <input
              id="ts-input"
              className="field font-[family-name:var(--font-mono)]"
              inputMode="numeric"
              placeholder="例如 1760937600"
              value={tsInput}
              onChange={(event) => setTsInput(event.target.value)}
            />
          </Field>

          <Segmented<Unit>
            className="mt-3"
            label="单位"
            value={unit}
            onChange={setUnit}
            options={[
              { value: "auto", label: "自动识别" },
              { value: "s", label: "秒" },
              { value: "ms", label: "毫秒" },
            ]}
          />

          {tsInput.trim() !== "" && !parsed ? (
            <Notice tone="error" className="mt-3">
              请输入整数时间戳，不要包含字母或小数点。
            </Notice>
          ) : null}

          {parsed ? (
            <div className="mt-3 space-y-2">
              <div className="rounded-[16px] edge-2 bg-cream/70 px-3 py-2.5">
                <p className="text-[11px] font-bold text-ink-soft">
                  {timeZone} · {formatOffset(parsed.ms, timeZone)}
                </p>
                <p className="mt-1 break-all font-[family-name:var(--font-mono)] text-[16px] font-extrabold">
                  {formatDateTime(parsed.ms, timeZone)} {weekday(parsed.ms, timeZone)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <CopyButton
                  text={formatDateTime(parsed.ms, timeZone)}
                  label="复制日期"
                  ariaLabel="复制转换后的日期"
                />
                <CopyButton text={new Date(parsed.ms).toISOString()} label="复制 ISO" ariaLabel="复制 ISO 时间" />
                <span className="text-[11px] text-ink-soft">识别为{parsed.kind === "s" ? "秒" : "毫秒"}</span>
              </div>
              <p className="text-[11.5px] text-ink-soft">
                UTC：{formatDateTime(parsed.ms, "UTC")} · {humanizeDelta(parsed.ms)}
              </p>
            </div>
          ) : null}
        </Panel>

        <Panel title="日期 → 时间戳" desc={`按 ${timeZone} 的墙上时间换算成 Unix 时间戳。`}>
          <Field label="日期时间" htmlFor="ts-date">
            <input
              id="ts-date"
              type="datetime-local"
              step={1}
              className="field"
              value={dateInput}
              onChange={(event) => setDateInput(event.target.value)}
            />
          </Field>

          <button
            type="button"
            className="btn btn-sm mt-2"
            onClick={() => setDateInput(toDateTimeLocalValue(Date.now(), timeZone))}
          >
            使用现在
          </button>

          {!reverse && dateInput !== "" ? (
            <Notice tone="error" className="mt-3">
              日期格式无法识别，请用日期选择器重新选择。
            </Notice>
          ) : null}

          {reverse ? (
            <div className="mt-3 space-y-2">
              <div className="rounded-[16px] edge-2 bg-cream/70 px-3 py-2.5">
                <p className="text-[11px] font-bold text-ink-soft">Unix 秒级</p>
                <p className="mt-1 break-all font-[family-name:var(--font-mono)] text-[18px] font-extrabold">
                  {reverse.seconds}
                </p>
              </div>
              <div className="rounded-[16px] edge-2 bg-cream/70 px-3 py-2.5">
                <p className="text-[11px] font-bold text-ink-soft">Unix 毫秒级</p>
                <p className="mt-1 break-all font-[family-name:var(--font-mono)] text-[18px] font-extrabold">
                  {reverse.ms}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <CopyButton text={String(reverse.seconds)} label="复制秒" ariaLabel="复制秒级时间戳" />
                <CopyButton text={String(reverse.ms)} label="复制毫秒" ariaLabel="复制毫秒级时间戳" />
              </div>
            </div>
          ) : null}
        </Panel>
      </div>

      <Panel
        title="批量转换"
        desc="每行一个时间戳或日期，时区沿用上方选择。适合整理日志。"
        actions={
          batchCopyText ? <CopyButton text={batchCopyText} label="复制全部结果" ariaLabel="复制批量转换结果" /> : null
        }
      >
        <label className="label" htmlFor="ts-batch">
          批量输入
        </label>
        <textarea
          id="ts-batch"
          className="field min-h-[130px] font-[family-name:var(--font-mono)] text-[12.5px]"
          placeholder={"1760937600\n1761000000000\n2026-10-19 18:22:10"}
          value={batchInput}
          onChange={(event) => setBatchInput(event.target.value)}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-sm btn-blue" onClick={runBatch} disabled={batchInput.trim() === ""}>
            转换
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => {
              setBatchInput("");
              setBatchResult(null);
            }}
          >
            清空
          </button>
          <span className="text-[11px] text-ink-soft">空行会自动忽略</span>
        </div>

        {batchResult ? (
          batchResult.length === 0 ? (
            <p className="mt-3 text-[12.5px] text-ink-soft">没有可转换的内容。</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {batchResult.map((line, index) => (
                <li
                  key={`${index}-${line.input}`}
                  className={cn(
                    "rounded-[12px] border-2 px-2.5 py-1.5 text-[11.5px] leading-relaxed",
                    line.ok ? "border-ink/15 bg-cream/60" : "border-coral/50 bg-coral/10",
                  )}
                >
                  <span className="font-[family-name:var(--font-mono)] text-ink-soft">{line.input}</span>
                  <span className="mx-1.5">→</span>
                  <span className="font-[family-name:var(--font-mono)] font-bold">{line.output}</span>
                </li>
              ))}
            </ul>
          )
        ) : (
          <div className="mt-3 rounded-[16px] edge border-dashed border-ink/30 bg-cream/40 px-4 py-8 text-center text-[12.5px] text-ink-soft">
            还没有转换结果，粘贴多行内容后点「转换」。
          </div>
        )}
      </Panel>
    </div>
  );
}
