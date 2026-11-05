"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { ACCENT_TILE } from "@/lib/accent";
import {
  clearThreadMessages,
  createThread,
  deleteThread,
  fetchThread,
  fetchThreads,
  renameThread,
} from "@/lib/ai/client-api";
import { CHAT_PRESETS } from "@/lib/ai/prompts";
import { aiHeaders, DEFAULT_AI_SETTINGS, loadAiSettings } from "@/lib/ai/settings";
import { streamAiText } from "@/lib/ai/stream";
import type { AiSettings, MessageItem, ThreadSummary } from "@/lib/ai/types";
import { cn, relativeTime, uid } from "@/lib/utils";
import { CopyButton } from "./copy-button";
import { DemoBadge, DemoNotice } from "./demo-badge";
import { RichText } from "./rich-text";

type ViewMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  stopped?: boolean;
};

type Props = {
  initialThreads: ThreadSummary[];
  initialActiveId: string | null;
  initialMessages: MessageItem[];
  demo: boolean;
  model: string;
};

function toView(messages: MessageItem[]): ViewMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role === "user" ? "user" : "assistant",
    content: message.content,
    createdAt: message.createdAt,
  }));
}

export function ChatClient({ initialThreads, initialActiveId, initialMessages, demo, model }: Props) {
  const [threads, setThreads] = useState<ThreadSummary[]>(initialThreads);
  const [activeId, setActiveId] = useState<string | null>(initialActiveId);
  const [messages, setMessages] = useState<ViewMessage[]>(() => toView(initialMessages));
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [isDemo, setIsDemo] = useState(demo);
  const [activeModel, setActiveModel] = useState(model);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_AI_SETTINGS);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stickRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setSettings(loadAiSettings());
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeId) ?? null,
    [threads, activeId],
  );

  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  useEffect(() => {
    if (!stickRef.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const refreshThreads = useCallback(async (): Promise<void> => {
    try {
      const data = await fetchThreads();
      setThreads(data.threads);
    } catch {
      // 列表刷新失败不影响当前会话
    }
  }, []);

  const autoGrow = useCallback((): void => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 148)}px`;
  }, []);

  const loadMessages = useCallback(async (threadId: string): Promise<void> => {
    setLoadingThread(true);
    setError(null);
    try {
      const data = await fetchThread(threadId);
      setMessages(toView(data.messages));
      setThreads((prev) => prev.map((thread) => (thread.id === threadId ? data.thread : thread)));
      stickRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "会话加载失败");
      setMessages([]);
    } finally {
      setLoadingThread(false);
    }
  }, []);

  const runStream = useCallback(
    async (
      threadId: string,
      history: { role: "user" | "assistant"; content: string }[],
      regenerate: boolean,
    ): Promise<void> => {
      const assistantId = uid("local");
      setStreaming(true);
      setError(null);
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", createdAt: Date.now() },
      ]);
      stickRef.current = true;
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const result = await streamAiText({
          url: "/api/ai/chat",
          body: { messages: history, threadId, regenerate, mode: "chat" },
          headers: aiHeaders(settings),
          signal: controller.signal,
          onMeta: (meta) => {
            setIsDemo(meta.demo);
            if (meta.model) setActiveModel(meta.model);
          },
          onChunk: (chunk) => {
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantId
                  ? { ...message, content: message.content + chunk }
                  : message,
              ),
            );
          },
        });

        if (result.aborted) {
          if (!result.content.trim()) {
            setMessages((prev) => prev.filter((message) => message.id !== assistantId));
          } else {
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantId ? { ...message, stopped: true } : message,
              ),
            );
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "生成失败，请稍后重试");
        setMessages((prev) =>
          prev.filter((message) => !(message.id === assistantId && !message.content.trim())),
        );
      } finally {
        setStreaming(false);
        abortRef.current = null;
        void refreshThreads();
      }
    },
    [refreshThreads, settings],
  );

  const send = useCallback(
    async (raw: string): Promise<void> => {
      const text = raw.trim();
      if (!text || streaming || loadingThread) return;
      if (text.length > 4000) {
        setError("单条消息最多 4000 字，请分开发送");
        return;
      }

      let threadId = activeId;
      if (!threadId) {
        try {
          const data = await createThread();
          threadId = data.thread.id;
          setThreads((prev) => [data.thread, ...prev]);
          setActiveId(threadId);
        } catch (err) {
          setError(err instanceof Error ? err.message : "新建会话失败");
          return;
        }
      }

      const userMessage: ViewMessage = {
        id: uid("local"),
        role: "user",
        content: text,
        createdAt: Date.now(),
      };
      const history = [...messages, userMessage].map((message) => ({
        role: message.role,
        content: message.content,
      }));

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      requestAnimationFrame(autoGrow);
      await runStream(threadId, history, false);
    },
    [activeId, autoGrow, loadingThread, messages, runStream, streaming],
  );

  const stop = useCallback((): void => {
    abortRef.current?.abort();
  }, []);

  const regenerate = useCallback(async (): Promise<void> => {
    if (streaming || loadingThread || !activeId) return;
    const lastAssistantIndex = messages.map((message) => message.role).lastIndexOf("assistant");
    if (lastAssistantIndex < 0) return;
    const history = messages.slice(0, lastAssistantIndex).map((message) => ({
      role: message.role,
      content: message.content,
    }));
    if (!history.some((message) => message.role === "user")) return;
    setMessages((prev) => prev.slice(0, lastAssistantIndex));
    await runStream(activeId, history, true);
  }, [activeId, loadingThread, messages, runStream, streaming]);

  const selectThread = useCallback(
    async (threadId: string): Promise<void> => {
      setDrawerOpen(false);
      setConfirmDeleteId(null);
      setRenamingId(null);
      setClearConfirm(false);
      if (threadId === activeId) return;
      // 切换会话时中断正在生成的回复，避免内容写到新会话的界面上
      if (streaming) abortRef.current?.abort();
      setActiveId(threadId);
      stickRef.current = true;
      await loadMessages(threadId);
    },
    [activeId, loadMessages, streaming],
  );

  const newChat = useCallback(async (): Promise<void> => {
    if (streaming) {
      stop();
    }
    setDrawerOpen(false);
    setConfirmDeleteId(null);
    setRenamingId(null);
    setClearConfirm(false);
    setError(null);
    if (activeThread && messages.length === 0) {
      setInput("");
      return;
    }
    try {
      const data = await createThread();
      setThreads((prev) => [data.thread, ...prev]);
      setActiveId(data.thread.id);
      setMessages([]);
      setInput("");
      requestAnimationFrame(autoGrow);
    } catch (err) {
      setError(err instanceof Error ? err.message : "新建会话失败");
    }
  }, [activeThread, autoGrow, messages.length, stop, streaming]);

  const commitRename = useCallback(
    async (threadId: string): Promise<void> => {
      const title = renameDraft.trim();
      setRenamingId(null);
      if (!title) return;
      try {
        const data = await renameThread(threadId, title);
        setThreads((prev) =>
          prev.map((thread) => (thread.id === threadId ? data.thread : thread)),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "重命名失败");
      }
    },
    [renameDraft],
  );

  const removeThread = useCallback(
    async (threadId: string): Promise<void> => {
      try {
        await deleteThread(threadId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "删除会话失败");
        return;
      }
      const nextThreads = threads.filter((thread) => thread.id !== threadId);
      setThreads(nextThreads);
      setConfirmDeleteId(null);
      if (threadId === activeId) {
        const fallback = nextThreads[0];
        setActiveId(fallback?.id ?? null);
        if (fallback) await loadMessages(fallback.id);
        else setMessages([]);
      }
    },
    [activeId, loadMessages, threads],
  );

  const clearMessages = useCallback(async (): Promise<void> => {
    setClearConfirm(false);
    if (!activeId) return;
    try {
      await clearThreadMessages(activeId);
      setMessages([]);
      void refreshThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "清空失败");
    }
  }, [activeId, refreshThreads]);

  function usePreset(text: string): void {
    setInput(text);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      autoGrow();
      el.setSelectionRange(text.length, text.length);
    });
  }

  function handleScroll(): void {
    stickRef.current = isNearBottom();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(input);
    }
  }

  /* ------------------------------- 会话列表 ------------------------------- */

  function renderThreadList(): React.ReactNode {
    if (threads.length === 0) {
      return (
        <div className="px-3 py-8 text-center">
          <p className="text-[13px] font-extrabold">还没有会话</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
            发第一条消息时会自动建一个会话。
          </p>
        </div>
      );
    }
    return threads.map((thread) => {
      const active = thread.id === activeId;
      const renaming = renamingId === thread.id;
      const confirming = confirmDeleteId === thread.id;
      return (
        <div
          key={thread.id}
          className={cn(
            "group relative rounded-[14px] border-2 transition-colors",
            active ? "border-ink bg-sun shadow-[2px_2px_0_0_#14110F]" : "border-transparent hover:bg-cream",
          )}
        >
          {renaming ? (
            <div className="p-2">
              <input
                value={renameDraft}
                onChange={(event) => setRenameDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void commitRename(thread.id);
                  if (event.key === "Escape") setRenamingId(null);
                }}
                onBlur={() => void commitRename(thread.id)}
                maxLength={40}
                autoFocus
                aria-label="会话标题"
                className="field field-sm"
              />
            </div>
          ) : confirming ? (
            <div className="flex items-center justify-between gap-2 p-2.5">
              <span className="text-[11.5px] font-extrabold">删除这个会话？</span>
              <span className="flex gap-1">
                <button
                  type="button"
                  onClick={() => void removeThread(thread.id)}
                  className="btn btn-sm bg-coral text-white px-2 py-1 text-[11px]"
                >
                  删除
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="btn btn-sm px-2 py-1 text-[11px]"
                >
                  取消
                </button>
              </span>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void selectThread(thread.id)}
                className="block w-full px-3 py-2.5 text-left"
              >
                <span className="block truncate text-[13px] font-extrabold">{thread.title}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-ink-soft">
                  <span>{relativeTime(thread.updatedAt)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{thread.messageCount} 条</span>
                </span>
              </button>
              <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                <button
                  type="button"
                  onClick={() => {
                    setRenamingId(thread.id);
                    setRenameDraft(thread.title);
                  }}
                  aria-label={`重命名会话「${thread.title}」`}
                  className="flex h-6 w-6 items-center justify-center rounded-full edge-2 bg-paper hover:bg-mint"
                >
                  <Icon name="pen" size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(thread.id)}
                  aria-label={`删除会话「${thread.title}」`}
                  className="flex h-6 w-6 items-center justify-center rounded-full edge-2 bg-paper hover:bg-coral hover:text-white"
                >
                  <Icon name="trash" size={11} />
                </button>
              </div>
            </>
          )}
        </div>
      );
    });
  }

  const showStop = streaming;
  const canRegenerate =
    !streaming && !loadingThread && messages.some((message) => message.role === "assistant");

  return (
    <section className="shell py-4 sm:py-5">
      <div className="grid gap-4 lg:grid-cols-[264px_minmax(0,1fr)] xl:gap-5">
        {/* ------------------------------ 桌面端会话列表 ------------------------------ */}
        <aside className="hidden h-[calc(100dvh-300px)] min-h-[520px] flex-col overflow-hidden rounded-[24px] edge bg-paper shadow-hard lg:flex">
          <div className="flex items-center justify-between gap-2 edge-b bg-cream px-3 py-2.5">
            <div>
              <p className="text-[13px] font-extrabold">会话</p>
              <p className="text-[10.5px] text-ink-soft">{threads.length} 个 · 按更新时间排序</p>
            </div>
            <button
              type="button"
              onClick={() => void newChat()}
              className="btn btn-sm btn-primary px-2.5 py-1.5"
              aria-label="新建会话"
            >
              <Icon name="plus" size={13} />
              新对话
            </button>
          </div>
          <div className="scroll-thin flex-1 space-y-1 overflow-y-auto p-2">{renderThreadList()}</div>
          <div className="border-t-2 border-dashed border-ink/15 px-3 py-2 text-[10.5px] leading-snug text-ink-soft">
            会话按访客隔离保存，换设备会看到不同的列表。
          </div>
        </aside>

        {/* -------------------------------- 对话主面板 -------------------------------- */}
        <div className="flex h-[calc(100dvh-150px)] min-h-[520px] flex-col overflow-hidden rounded-[24px] edge bg-paper shadow-hard lg:h-[calc(100dvh-300px)]">
          <div className="flex items-center gap-2 edge-b bg-cream px-3 py-2.5 sm:px-4">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] edge-2 bg-paper lg:hidden"
              aria-label="打开会话列表"
            >
              <Icon name="menu" size={16} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-extrabold">
                {activeThread?.title ?? "新对话"}
              </p>
              <p className="truncate text-[10.5px] text-ink-soft">
                {messages.length} 条消息 · 保留最近 40 条作为上下文
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <DemoBadge demo={isDemo} model={activeModel} />
              {messages.length > 0 ? (
                clearConfirm ? (
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void clearMessages()}
                      className="btn btn-sm bg-coral px-2 py-1 text-[11px] text-white"
                    >
                      确认清空
                    </button>
                    <button
                      type="button"
                      onClick={() => setClearConfirm(false)}
                      className="btn btn-sm px-2 py-1 text-[11px]"
                    >
                      取消
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setClearConfirm(true)}
                    className="btn btn-sm px-2.5 py-1.5 text-[11.5px]"
                    title="清空当前会话的消息，保留会话"
                  >
                    <Icon name="trash" size={12} />
                    清空
                  </button>
                )
              ) : null}
            </div>
          </div>

          {isDemo ? (
            <div className="px-3 pt-3 sm:px-4">
              <DemoNotice demo={isDemo} model={activeModel} />
            </div>
          ) : null}

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="scroll-thin flex-1 space-y-5 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5"
          >
            {loadingThread ? (
              <div className="space-y-3" aria-label="加载中">
                <div className="h-16 w-3/4 animate-pulse rounded-[18px] edge-sub bg-cream" />
                <div className="ml-auto h-12 w-1/2 animate-pulse rounded-[18px] edge-sub bg-cream" />
                <div className="h-24 w-4/5 animate-pulse rounded-[18px] edge-sub bg-cream" />
              </div>
            ) : messages.length === 0 ? (
              <div className="mx-auto max-w-[620px] py-2">
                <div className="text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] edge bg-sun shadow-hard-sm">
                    <Icon name="spark" size={26} />
                  </span>
                  <h2 className="mt-4 text-[22px] font-extrabold">今天想先解决哪件事？</h2>
                  <p className="mx-auto mt-2 max-w-[430px] text-[13px] leading-relaxed text-ink-soft">
                    {isDemo
                      ? "现在是演示模式：回复由站内模板生成，能完整体验流式输出、会话保存和重生成。"
                      : `已连接 ${activeModel}，发送第一条消息开始对话。`}
                  </p>
                </div>
                <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                  {CHAT_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => usePreset(preset.text)}
                      className="hover-lift flex items-start gap-3 rounded-[18px] edge bg-paper px-3.5 py-3 text-left"
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] edge-2",
                          ACCENT_TILE[preset.accent],
                        )}
                      >
                        <Icon name={preset.icon} size={17} />
                      </span>
                      <span>
                        <span className="block text-[13.5px] font-extrabold">{preset.label}</span>
                        <span className="mt-0.5 block text-[11.5px] text-ink-soft">
                          {preset.desc}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-center text-[11px] text-ink-soft">
                  点卡片会把提示词填进输入框，再补上你的内容即可发送。
                </p>
              </div>
            ) : (
              messages.map((message, index) => {
                const isUser = message.role === "user";
                const isLast = index === messages.length - 1;
                const isStreamingThis = streaming && isLast && !isUser;
                return (
                  <div
                    key={message.id}
                    className={cn("flex gap-2.5 sm:gap-3", isUser ? "justify-end" : "justify-start")}
                  >
                    {!isUser ? (
                      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[2.5px] border-ink bg-sun">
                        <Icon name="spark" size={15} />
                      </span>
                    ) : null}
                    <div className={cn("min-w-0 max-w-[86%] sm:max-w-[78%]", isUser && "items-end")}>
                      <div
                        className={cn(
                          "rounded-[20px] edge px-4 py-3",
                          isUser ? "bg-ink text-paper shadow-[3px_3px_0_0_#FFC93C]" : "bg-cream/70",
                        )}
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed">
                            {message.content}
                          </p>
                        ) : message.content ? (
                          <RichText text={message.content} streaming={isStreamingThis} />
                        ) : (
                          <p className="flex items-center gap-1.5 text-[13px] text-ink-soft">
                            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-coral" />
                            正在生成
                            <span className="stream-cursor" />
                          </p>
                        )}
                      </div>
                      <div
                        className={cn(
                          "mt-1.5 flex flex-wrap items-center gap-1.5 px-1",
                          isUser ? "justify-end" : "justify-start",
                        )}
                      >
                        <span className="text-[10.5px] text-ink-soft">
                          {relativeTime(message.createdAt)}
                        </span>
                        {message.stopped ? (
                          <span className="tag px-1.5 py-0.5 text-[9.5px]">已停止</span>
                        ) : null}
                        {!isUser && message.content ? (
                          <CopyButton
                            text={message.content}
                            className="!px-2 !py-1 !text-[10.5px]"
                          />
                        ) : null}
                        {isStreamingThis ? (
                          <button
                            type="button"
                            onClick={stop}
                            className="btn btn-sm !px-2 !py-1 !text-[10.5px] bg-ink text-paper"
                          >
                            <Icon name="close" size={11} />
                            停止
                          </button>
                        ) : null}
                        {!isUser && isLast && canRegenerate && message.content ? (
                          <button
                            type="button"
                            onClick={() => void regenerate()}
                            className="btn btn-sm !px-2 !py-1 !text-[10.5px]"
                          >
                            <Icon name="spark" size={11} />
                            重新生成
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {isUser ? (
                      <span className="mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border-[2.5px] border-ink bg-coral text-[12px] font-extrabold text-white sm:flex">
                        你
                      </span>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          <div className="edge-t bg-paper px-3 pb-2.5 pt-2.5 sm:px-4">
            {error ? (
              <div
                role="alert"
                className="mb-2 flex items-start justify-between gap-2 rounded-[12px] border-2 border-coral bg-coral/10 px-3 py-2 text-[12px] font-bold text-coral"
              >
                <span className="leading-snug">{error}</span>
                <button type="button" onClick={() => setError(null)} aria-label="关闭错误提示">
                  <Icon name="close" size={13} />
                </button>
              </div>
            ) : null}
            <div className="flex items-end gap-2 rounded-[20px] edge bg-white px-3 py-2 transition-shadow focus-within:ring-[3px] focus-within:ring-sun">
              <textarea
                ref={inputRef}
                value={input}
                rows={1}
                onChange={(event) => {
                  setInput(event.target.value);
                  autoGrow();
                }}
                onKeyDown={handleKeyDown}
                placeholder={streaming ? "正在生成，可点「停止」中断…" : "输入问题，或粘贴一段要处理的文字…"}
                aria-label="消息输入框"
                className="max-h-[148px] min-h-[26px] flex-1 resize-none bg-transparent text-[14px] leading-relaxed text-ink outline-none placeholder:text-ink-soft"
              />
              {showStop ? (
                <button
                  type="button"
                  onClick={stop}
                  className="btn btn-sm shrink-0 bg-ink px-3 py-1.5 text-paper"
                >
                  <Icon name="close" size={13} />
                  停止
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void send(input)}
                  disabled={!input.trim() || loadingThread}
                  className="btn btn-sm btn-primary shrink-0 px-3.5 py-1.5"
                >
                  <Icon name="arrow" size={13} />
                  发送
                </button>
              )}
            </div>
            <div className="mt-1.5 flex items-center justify-between px-1 text-[10.5px] text-ink-soft">
              <span>Enter 发送 · Shift + Enter 换行</span>
              <span>
                {input.length > 3000 ? `${input.length} / 4000` : "内容仅保存到本站数据库"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------ 移动端会话抽屉 ------------------------------ */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="关闭会话列表"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-ink/55"
          />
          <div className="absolute left-0 top-0 flex h-full w-[86%] max-w-[320px] flex-col edge-r bg-paper shadow-[10px_0_0_0_#14110F]">
            <div className="flex items-center justify-between edge-b bg-cream px-4 py-3">
              <div>
                <p className="text-[14px] font-extrabold">会话</p>
                <p className="text-[10.5px] text-ink-soft">{threads.length} 个</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void newChat()}
                  className="btn btn-sm btn-primary px-2.5 py-1.5"
                >
                  <Icon name="plus" size={13} />
                  新对话
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full edge-2 bg-paper"
                  aria-label="关闭"
                >
                  <Icon name="close" size={15} />
                </button>
              </div>
            </div>
            <div className="scroll-thin flex-1 space-y-1 overflow-y-auto p-2.5">{renderThreadList()}</div>
            <div className="border-t-2 border-dashed border-ink/15 px-3 py-2.5 text-[10.5px] leading-snug text-ink-soft">
              会话按访客隔离保存。想导出内容时，可以逐条复制。
            </div>
          </div>
        </div>
      ) : null}

      <p className="mt-3 text-center text-[11px] text-ink-soft">
        需要调整接口地址或模型？
        <Link href="/ai/app/settings" className="ml-1 font-extrabold underline decoration-sun decoration-[3px] underline-offset-2">
          打开模型设置
        </Link>
      </p>
    </section>
  );
}
