/**
 * POST /api/ai/chat
 * - mode: 'chat'（默认）→ 纯文本流式返回；有 threadId 时把用户消息与回复落库
 * - mode: 'ping' → 非流式，仅测试连接（不落库）
 *
 * 没有 API Key 时走演示模式：内置模板 + 分块流式输出，响应头 X-AI-Demo: 1。
 */

import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { resolveAiConfig } from "@/lib/ai/config";
import { demoChatReply, demoPingText } from "@/lib/ai/demo";
import { CHAT_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import {
  AiUpstreamError,
  completeChatOnce,
  createTextStreamResponse,
  demoTyping,
  streamChatCompletion,
} from "@/lib/ai/server";
import {
  appendMessage,
  autoTitleThread,
  deleteLastAssistantMessage,
  ownsThread,
} from "@/lib/ai/store";
import type { ChatMessage } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

const MAX_MESSAGES = 40;
const MAX_CONTENT = 8000;
const IDLE_TIMEOUT_MS = 45_000;
const PING_TIMEOUT_MS = 15_000;

function fail(error: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error }, { status });
}

function parseMessages(input: unknown): ChatMessage[] | null {
  if (!Array.isArray(input)) return null;
  const messages: ChatMessage[] = [];
  for (const item of input.slice(-MAX_MESSAGES)) {
    if (typeof item !== "object" || item === null) return null;
    const record = item as { role?: unknown; content?: unknown };
    if (record.role !== "user" && record.role !== "assistant" && record.role !== "system") {
      return null;
    }
    if (typeof record.content !== "string") return null;
    const content = record.content.slice(0, MAX_CONTENT);
    if (!content.trim()) continue;
    messages.push({ role: record.role, content });
  }
  return messages;
}

export async function POST(req: NextRequest): Promise<Response> {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return fail("请求体不是合法的 JSON");
  }
  if (typeof payload !== "object" || payload === null) return fail("请求体格式不正确");

  const body = payload as {
    messages?: unknown;
    mode?: unknown;
    threadId?: unknown;
    regenerate?: unknown;
  };
  const messages = parseMessages(body.messages);
  if (messages === null) return fail("消息格式不正确：role 只能是 user / assistant / system");
  if (messages.length === 0) return fail("请至少提供一条消息");
  if (messages.reduce((total, message) => total + message.content.length, 0) > 48_000) {
    return fail("对话内容过长，请清理历史消息后再试");
  }

  const config = resolveAiConfig(req.headers);
  const viewer = await getViewer();

  /* ------------------------------- 测试连接 ------------------------------- */
  if (body.mode === "ping") {
    if (config.demo) {
      return NextResponse.json({
        ok: true,
        demo: true,
        model: config.model,
        latencyMs: 0,
        message: demoPingText(),
      });
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    const startedAt = Date.now();
    try {
      const reply = await completeChatOnce({
        config,
        messages: [{ role: "user", content: "这是一次连接测试，请只回复 OK 两个字母。" }],
        maxTokens: 16,
        signal: controller.signal,
      });
      return NextResponse.json({
        ok: true,
        demo: false,
        model: config.model,
        latencyMs: Date.now() - startedAt,
        message: `连接成功，模型返回：${reply || "（空回复）"}`,
      });
    } catch (error) {
      const message =
        error instanceof AiUpstreamError
          ? error.message
          : controller.signal.aborted
            ? "连接超时（15 秒），请检查接口地址是否可达"
            : "连接失败，请检查接口地址、密钥与网络";
      return NextResponse.json({ ok: false, error: message }, { status: 502 });
    } finally {
      clearTimeout(timer);
    }
  }

  /* -------------------------------- 对话流 -------------------------------- */
  const rawThreadId = typeof body.threadId === "string" ? body.threadId.slice(0, 64) : null;
  const threadId = rawThreadId && ownsThread(viewer.id, rawThreadId) ? rawThreadId : null;
  const regenerate = body.regenerate === true;

  if (threadId) {
    if (regenerate) {
      // 重新生成：用户消息已经落库，只删掉上一条助手回复
      deleteLastAssistantMessage(threadId);
    } else {
      const lastUser = [...messages].reverse().find((message) => message.role === "user");
      if (lastUser) {
        appendMessage(threadId, "user", lastUser.content);
        autoTitleThread(viewer.id, threadId, lastUser.content);
      }
    }
  }

  const persist = (content: string): void => {
    if (!threadId) return;
    const text = content.trim();
    if (!text) return;
    appendMessage(threadId, "assistant", text);
  };

  if (config.demo) {
    const { reply } = demoChatReply(messages);
    return createTextStreamResponse({
      chunks: demoTyping(reply),
      headers: { "X-AI-Demo": "1", "X-AI-Model": config.model },
      signal: req.signal,
      onDone: (content) => persist(content),
    });
  }

  const controller = new AbortController();
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const bumpIdleTimer = (): void => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => controller.abort(), IDLE_TIMEOUT_MS);
  };
  bumpIdleTimer();
  if (req.signal.aborted) controller.abort();
  else req.signal.addEventListener("abort", () => controller.abort(), { once: true });

  const conversation: ChatMessage[] = [
    { role: "system", content: CHAT_SYSTEM_PROMPT },
    ...messages,
  ];
  const upstreamMessages = conversation.slice(-(MAX_MESSAGES + 1));

  const source = (async function* (): AsyncGenerator<string> {
    try {
      for await (const delta of streamChatCompletion({
        config,
        messages: upstreamMessages,
        signal: controller.signal,
      })) {
        bumpIdleTimer();
        yield delta;
      }
    } catch (error) {
      if (controller.signal.aborted && !req.signal.aborted) {
        throw new AiUpstreamError("生成超时（45 秒内没有新内容），已停止", 504);
      }
      throw error;
    } finally {
      if (idleTimer) clearTimeout(idleTimer);
    }
  })();

  return createTextStreamResponse({
    chunks: source,
    headers: { "X-AI-Demo": "0", "X-AI-Model": config.model },
    signal: req.signal,
    onDone: (content) => persist(content),
  });
}
