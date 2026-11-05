"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { ACCENT_TILE, type Accent } from "@/lib/accent";
import type { IconKey } from "@/lib/site";
import {
  WRITING_MODES,
  WRITING_TONES,
  getWritingMode,
  getWritingTone,
  type WritingModeKey,
  type WritingToneKey,
} from "@/lib/ai/prompts";
import { aiHeaders, DEFAULT_AI_SETTINGS, loadAiSettings } from "@/lib/ai/settings";
import { streamAiText } from "@/lib/ai/stream";
import type { AiSettings } from "@/lib/ai/types";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";
import { DemoBadge, DemoNotice } from "./demo-badge";
import { RichText } from "./rich-text";

const MODE_ICON: Record<WritingModeKey, IconKey> = {
  xiaohongshu: "heart",
  wechat: "book",
  email: "text",
  headline: "hash",
};

const MODE_EXAMPLE: Record<WritingModeKey, { topic: string; points: string }> = {
  xiaohongshu: {
    topic: "把桌面收拾干净的小习惯",
    points: "先清空桌面、只留当天要用的东西、每周五统一归位",
  },
  wechat: {
    topic: "为什么我放弃了「完美计划」",
    points: "完美计划的问题\n可执行的替代方案\n坚持 30 天之后的变化",
  },
  email: {
    topic: "向合作方同步项目延期一周",
    points: "延期原因：第三方接口联调比预期多花三天\n新的交付时间：下周三\n需要对方确认：验收标准是否调整",
  },
  headline: {
    topic: "一篇讲时间管理误区的文章",
    points: "核心结论是「别做满日程表」\n面向职场新人",
  },
};

type Props = { demo: boolean; model: string };

type TodoState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "done"; message: string }
  | { status: "error"; message: string };

export function WritingClient({ demo, model }: Props) {
  const [mode, setMode] = useState<WritingModeKey>("xiaohongshu");
  const [tone, setTone] = useState<WritingToneKey>("warm");
  const [topic, setTopic] = useState("");
  const [points, setPoints] = useState("");
  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [isDemo, setIsDemo] = useState(demo);
  const [activeModel, setActiveModel] = useState(model);
  const [error, setError] = useState<string | null>(null);
  const [todo, setTodo] = useState<TodoState>({ status: "idle" });
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_AI_SETTINGS);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setSettings(loadAiSettings());
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const modeMeta = getWritingMode(mode);
  const toneMeta = getWritingTone(tone);
  const accent = modeMeta.accent as Accent;

  const generate = useCallback(async (): Promise<void> => {
    const cleanTopic = topic.trim();
    if (!cleanTopic) {
      setError("请先填写主题");
      return;
    }
    if (streaming) return;
    setError(null);
    setTodo({ status: "idle" });
    setOutput("");
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await streamAiText({
        url: "/api/ai/writing",
        body: { mode, topic: cleanTopic, points, tone },
        headers: aiHeaders(settings),
        signal: controller.signal,
        onMeta: (meta) => {
          setIsDemo(meta.demo);
          if (meta.model) setActiveModel(meta.model);
        },
        onChunk: (chunk) => setOutput((prev) => prev + chunk),
      });
      if (result.aborted && !result.content.trim()) setError("已停止生成");
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败，请稍后重试");
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [mode, points, settings, streaming, tone, topic]);

  const stop = useCallback((): void => {
    abortRef.current?.abort();
  }, []);

  const fillExample = useCallback((): void => {
    const example = MODE_EXAMPLE[mode];
    setTopic(example.topic);
    setPoints(example.points);
    setError(null);
  }, [mode]);

  const createTodo = useCallback(async (): Promise<void> => {
    const content = output.trim();
    if (!content || todo.status === "saving") return;
    const firstLine = content.split("\n").find((line) => line.trim().length > 0) ?? "";
    const title = (topic.trim() || firstLine.replace(/^[#>*\-\d.、\s]+/, "")).slice(0, 60);
    setTodo({ status: "saving" });
    try {
      const response = await fetch("/api/todo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, note: content.slice(0, 1200), priority: 2 }),
      });
      let payload: { ok?: boolean; error?: string } | null = null;
      try {
        payload = (await response.json()) as { ok?: boolean; error?: string };
      } catch {
        payload = null;
      }
      if (!response.ok || !payload || payload.ok !== true) {
        throw new Error(payload?.error || `待办接口返回 ${response.status}`);
      }
      setTodo({ status: "done", message: `已创建待办「${title}」` });
    } catch (err) {
      setTodo({
        status: "error",
        message: err instanceof Error ? err.message : "待办接口暂时不可用",
      });
    }
  }, [output, todo.status, topic]);

  return (
    <section className="shell py-5">
      <DemoNotice demo={isDemo} model={activeModel} />

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-[224px_330px_minmax(0,1fr)] xl:items-start">
        {/* -------------------------------- 体裁选择 -------------------------------- */}
        <aside className="md:col-span-2 xl:col-span-1">
          <div className="mb-2 flex items-center justify-between xl:mb-2.5">
            <p className="eyebrow">Writing Mode</p>
            <span className="text-[10.5px] text-ink-soft">4 种体裁</span>
          </div>
          <div className="scroll-thin flex gap-2 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible xl:pb-0">
            {WRITING_MODES.map((item) => {
              const active = item.key === mode;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setMode(item.key);
                    setTodo({ status: "idle" });
                    setError(null);
                  }}
                  aria-pressed={active}
                  className={cn(
                    "flex shrink-0 items-center gap-2.5 rounded-[16px] edge px-3 py-2.5 text-left transition-colors xl:w-full",
                    active
                      ? "border-ink bg-ink text-paper shadow-hard-sm"
                      : "border-ink/20 bg-paper hover:border-ink",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] edge-2",
                      ACCENT_TILE[item.accent],
                    )}
                  >
                    <Icon name={MODE_ICON[item.key]} size={17} />
                  </span>
                  <span className="min-w-0">
                    <span className="block whitespace-nowrap text-[13px] font-extrabold">
                      {item.label}
                    </span>
                    <span
                      className={cn(
                        "block whitespace-nowrap text-[10.5px]",
                        active ? "text-paper/65" : "text-ink-soft",
                      )}
                    >
                      {item.desc}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 hidden rounded-[16px] border-2 border-dashed border-ink/25 bg-cream/60 p-3 xl:block">
            <p className="text-[11.5px] font-extrabold">怎么写更容易出好结果</p>
            <ul className="mt-1.5 space-y-1 text-[11px] leading-snug text-ink-soft">
              <li>· 主题写具体场景，别写抽象概念</li>
              <li>· 要点每行一条，3–5 条最合适</li>
              <li>· 语气决定用词，可以多试两种</li>
            </ul>
          </div>
        </aside>

        {/* ---------------------------------- 输入 ---------------------------------- */}
        <div className="rounded-[24px] edge bg-paper p-4 shadow-hard">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold">写前设定</h2>
            <button type="button" onClick={fillExample} className="btn btn-sm px-2.5 py-1 text-[11px]">
              <Icon name="spark" size={11} />
              用示例
            </button>
          </div>

          <div className="mt-3.5 space-y-3.5">
            <div>
              <label htmlFor="writing-topic" className="label">
                主题
              </label>
              <input
                id="writing-topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                maxLength={200}
                placeholder={modeMeta.placeholder}
                className="field"
              />
              <p className="mt-1 text-right text-[10px] text-ink-soft">{topic.length} / 200</p>
            </div>

            <div>
              <label htmlFor="writing-points" className="label">
                要点 / 参考信息
              </label>
              <textarea
                id="writing-points"
                value={points}
                onChange={(event) => setPoints(event.target.value)}
                maxLength={2000}
                rows={5}
                placeholder={modeMeta.pointsHint}
                className="field resize-y"
              />
              <p className="mt-1 text-right text-[10px] text-ink-soft">{points.length} / 2000</p>
            </div>

            <div>
              <span className="label">语气</span>
              <div className="flex flex-wrap gap-1.5">
                {WRITING_TONES.map((item) => {
                  const active = item.key === tone;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setTone(item.key)}
                      aria-pressed={active}
                      title={item.desc}
                      className={cn(
                        "rounded-full border-2 px-2.5 py-1 text-[11.5px] font-extrabold transition-colors",
                        active
                          ? "border-ink bg-sun text-ink"
                          : "border-ink/25 bg-paper text-ink-soft hover:border-ink",
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {streaming ? (
              <button type="button" onClick={stop} className="btn btn-primary flex-1 bg-ink">
                <Icon name="close" size={15} />
                停止生成
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void generate()}
                disabled={!topic.trim()}
                className="btn btn-primary flex-1"
              >
                <Icon name="spark" size={15} />
                {output ? "重新生成" : "开始生成"}
              </button>
            )}
            {output && !streaming ? (
              <button
                type="button"
                onClick={() => {
                  setOutput("");
                  setTodo({ status: "idle" });
                  setError(null);
                }}
                className="btn btn-sm px-3 py-2"
              >
                清空结果
              </button>
            ) : null}
          </div>
          <p className="mt-2 text-[10.5px] leading-snug text-ink-soft">
            生成结果不会自动保存，需要的话点「变成待办」或复制走。
          </p>
          {error ? (
            <div
              role="alert"
              className="mt-2 rounded-[12px] border-2 border-coral bg-coral/10 px-3 py-2 text-[12px] font-bold leading-snug text-coral"
            >
              {error}
            </div>
          ) : null}
        </div>

        {/* ---------------------------------- 结果 ---------------------------------- */}
        <div className="flex min-h-[460px] flex-col rounded-[24px] edge bg-paper shadow-hard md:col-span-2 xl:col-span-1">
          <div className="flex flex-wrap items-center gap-2 edge-b bg-cream px-4 py-2.5">
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-[9px] edge-2",
                ACCENT_TILE[accent],
              )}
            >
              <Icon name={MODE_ICON[mode]} size={14} />
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-extrabold">{modeMeta.label}</p>
              <p className="text-[10.5px] text-ink-soft">
                {toneMeta.label} · {output ? `${output.length} 字` : "等待生成"}
              </p>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <DemoBadge demo={isDemo} model={activeModel} />
              {output ? <CopyButton text={output} label="复制" className="!px-2.5 !py-1 !text-[11px]" /> : null}
              {output && !streaming ? (
                <button
                  type="button"
                  onClick={() => void generate()}
                  className="btn btn-sm !px-2.5 !py-1 !text-[11px]"
                >
                  <Icon name="spark" size={11} />
                  重新生成
                </button>
              ) : null}
              {output ? (
                <button
                  type="button"
                  onClick={() => void createTodo()}
                  disabled={todo.status === "saving" || streaming}
                  className="btn btn-sm btn-mint !px-2.5 !py-1 !text-[11px]"
                >
                  <Icon name="check" size={11} />
                  {todo.status === "saving" ? "创建中…" : "变成待办"}
                </button>
              ) : null}
            </div>
          </div>

          <div className="scroll-thin max-h-[600px] min-h-[400px] flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            {output ? (
              <RichText text={output} streaming={streaming} />
            ) : streaming ? (
              <div className="space-y-2.5" aria-label="生成中">
                <div className="h-4 w-1/3 animate-pulse rounded bg-cream" />
                <div className="h-3.5 w-full animate-pulse rounded bg-cream" />
                <div className="h-3.5 w-11/12 animate-pulse rounded bg-cream" />
                <div className="h-3.5 w-4/5 animate-pulse rounded bg-cream" />
                <div className="mt-4 h-4 w-1/4 animate-pulse rounded bg-cream" />
                <div className="h-3.5 w-full animate-pulse rounded bg-cream" />
              </div>
            ) : (
              <div className="flex h-full min-h-[320px] flex-col items-center justify-center px-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-[16px] edge bg-paper shadow-hard-sm">
                  <Icon name="pen" size={22} />
                </span>
                <p className="mt-3 text-[14px] font-extrabold">右边是成稿，不是草稿列表</p>
                <p className="mt-1.5 max-w-[300px] text-[12px] leading-relaxed text-ink-soft">
                  在左侧选体裁、填主题，点「用示例」可以先看看完整效果。
                </p>
                <button type="button" onClick={fillExample} className="btn btn-sm mt-4">
                  填入{getWritingMode(mode).label}示例
                </button>
              </div>
            )}
          </div>

          {todo.status !== "idle" ? (
            <div
              className={cn(
                "edge-t px-4 py-2.5 text-[12px] font-bold leading-snug",
                todo.status === "done" ? "bg-mint" : todo.status === "error" ? "bg-coral/15 text-coral" : "bg-cream",
              )}
            >
              {todo.status === "saving" ? "正在创建待办…" : todo.message}
              {todo.status === "done" ? (
                <Link href="/user/todo" className="ml-2 underline decoration-[3px] underline-offset-2">
                  去待办清单看看
                </Link>
              ) : null}
              {todo.status === "error" ? (
                <span className="ml-1 font-normal text-ink-soft">
                  （待办接口由个人管理模块提供，可稍后重试或到「待办清单」手动创建）
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
