/**
 * POST /api/ai/writing
 * body { mode, topic, points, tone } → 纯文本流式返回。
 * 没有 API Key 时按 4 种体裁走内置演示模板。
 */

import { NextResponse, type NextRequest } from "next/server";
import { resolveAiConfig } from "@/lib/ai/config";
import { demoWritingReply } from "@/lib/ai/demo";
import {
  isWritingMode,
  isWritingTone,
  writingSystemPrompt,
  writingUserPrompt,
} from "@/lib/ai/prompts";
import {
  AiUpstreamError,
  createTextStreamResponse,
  demoTyping,
  streamChatCompletion,
} from "@/lib/ai/server";

export const dynamic = "force-dynamic";

const IDLE_TIMEOUT_MS = 45_000;

function fail(error: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error }, { status });
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
    mode?: unknown;
    topic?: unknown;
    points?: unknown;
    tone?: unknown;
  };

  const mode = typeof body.mode === "string" && isWritingMode(body.mode) ? body.mode : null;
  if (!mode) return fail("请选择写作体裁");
  const tone = typeof body.tone === "string" && isWritingTone(body.tone) ? body.tone : "professional";
  const topic = (typeof body.topic === "string" ? body.topic : "").replace(/\s+/g, " ").trim();
  if (!topic) return fail("请填写主题");
  if (topic.length > 200) return fail("主题太长，请控制在 200 字以内");
  const points = (typeof body.points === "string" ? body.points : "").trim();
  if (points.length > 2000) return fail("要点太长，请控制在 2000 字以内");

  const config = resolveAiConfig(req.headers);

  if (config.demo) {
    const reply = demoWritingReply({ mode, topic, points, tone });
    return createTextStreamResponse({
      chunks: demoTyping(reply),
      headers: { "X-AI-Demo": "1", "X-AI-Model": config.model },
      signal: req.signal,
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

  const source = (async function* (): AsyncGenerator<string> {
    try {
      for await (const delta of streamChatCompletion({
        config,
        temperature: 0.8,
        messages: [
          { role: "system", content: writingSystemPrompt(mode, tone) },
          { role: "user", content: writingUserPrompt({ mode, topic, points, tone }) },
        ],
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
    // 注意：HTTP 响应头只能放 Latin-1 字符，中文体裁名不要放进 header
    headers: { "X-AI-Demo": "0", "X-AI-Model": config.model },
    signal: req.signal,
  });
}
