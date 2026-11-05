/**
 * AI 服务端基础设施（仅服务端使用）：
 * - 把 OpenAI 兼容接口的 SSE 流转成纯文本分块；
 * - 把任意文本块序列包装成 ReadableStream 响应（客户端用 reader 逐块渲染）；
 * - 图片生成、一次性补全与上游错误的中文化。
 */

import type { AiConfig } from "./config";
import type { ChatMessage } from "./types";

export class AiUpstreamError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "AiUpstreamError";
    this.status = status;
  }
}

/* ------------------------------- 上游请求工具 ------------------------------ */

function chatCompletionsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

function imagesUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/images/generations`;
}

function authHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

async function upstreamErrorMessage(
  response: Response,
  kind: "chat" | "image" = "chat",
): Promise<string> {
  let detail = "";
  try {
    const text = await response.text();
    if (text) {
      try {
        const payload = JSON.parse(text) as {
          error?: { message?: string } | string;
          message?: string;
        };
        if (typeof payload.error === "string") detail = payload.error;
        else if (payload.error?.message) detail = payload.error.message;
        else if (payload.message) detail = payload.message;
      } catch {
        detail = text;
      }
    }
  } catch {
    detail = "";
  }
  const suffix = detail ? `：${detail.slice(0, 160)}` : "";
  if (response.status === 401) return `API Key 无效或已过期（401），请检查密钥${suffix}`;
  if (response.status === 403) return `没有访问该模型的权限（403）${suffix}`;
  if (response.status === 404) {
    return kind === "image"
      ? `画图接口不存在（404）：当前 Base URL 对应的服务不提供 /images/generations。请把 BLOCKSET_AI_IMAGE_BASE 指向一个支持画图的服务（如 OpenAI 官方或兼容聚合服务），并在设置页填写对应的画图模型${suffix}`
      : `接口地址不存在（404），请检查 Base URL 是否带 /v1${suffix}`;
  }
  if (response.status === 429) return `请求过于频繁或额度不足（429），稍后再试${suffix}`;
  if (response.status >= 500) return `模型服务暂时不可用（${response.status}），稍后再试${suffix}`;
  return `模型服务返回错误（${response.status}）${suffix}`;
}

/** fetch 的网络层异常统一转成中文错误；AbortError 原样抛出交由上层处理超时 */
async function safeFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new AiUpstreamError("无法连接到模型服务，请检查接口地址、网络或代理设置");
  }
}

/* -------------------------------- 流式对话 ------------------------------- */

export type CompletionInput = {
  config: AiConfig;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  signal: AbortSignal;
};

/** 调用上游流式接口，逐段产出文本增量 */
export async function* streamChatCompletion(input: CompletionInput): AsyncGenerator<string> {
  const { config, messages, temperature = 0.7, maxTokens, signal } = input;
  const response = await safeFetch(chatCompletionsUrl(config.baseUrl), {
    method: "POST",
    headers: authHeaders(config.apiKey),
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: true,
      temperature,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
    }),
    signal,
  });

  if (!response.ok) {
    throw new AiUpstreamError(await upstreamErrorMessage(response), response.status);
  }
  if (!response.body) throw new AiUpstreamError("模型服务没有返回可读的数据流");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data) as {
            choices?: { delta?: { content?: string | null }; message?: { content?: string } }[];
          };
          const delta = parsed.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta) yield delta;
        } catch {
          // 忽略心跳 / 非 JSON 分片
        }
      }
    }
    buffer += decoder.decode();
    const tail = buffer.trim();
    if (tail.startsWith("data:")) {
      const data = tail.slice(5).trim();
      if (data && data !== "[DONE]") {
        try {
          const parsed = JSON.parse(data) as {
            choices?: { delta?: { content?: string | null } }[];
          };
          const delta = parsed.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta) yield delta;
        } catch {
          // 忽略
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** 一次性补全（设置页测试连接、非流式场景） */
export async function completeChatOnce(input: CompletionInput): Promise<string> {
  const { config, messages, temperature = 0.2, maxTokens = 24, signal } = input;
  const response = await safeFetch(chatCompletionsUrl(config.baseUrl), {
    method: "POST",
    headers: authHeaders(config.apiKey),
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    }),
    signal,
  });
  if (!response.ok) {
    throw new AiUpstreamError(await upstreamErrorMessage(response), response.status);
  }
  const payload = (await response.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  return payload.choices?.[0]?.message?.content?.trim() ?? "";
}

/* --------------------------------- 图片生成 -------------------------------- */

export type ImageResult = { image: string; mime: string; model: string };

/** 调用 OpenAI 兼容的 /images/generations，兼容 b64_json 与 url 两种返回 */
export async function generateImageOnce(input: {
  config: AiConfig;
  prompt: string;
  apiSize: string;
  signal: AbortSignal;
}): Promise<ImageResult> {
  const { config, prompt, apiSize, signal } = input;
  const baseBody: Record<string, unknown> = {
    model: config.imageModel,
    prompt,
    size: apiSize,
    n: 1,
  };

  const send = (body: Record<string, unknown>) =>
    safeFetch(imagesUrl(config.imageBaseUrl), {
      method: "POST",
      headers: authHeaders(config.apiKey),
      body: JSON.stringify(body),
      signal,
    });

  let response = await send({ ...baseBody, response_format: "b64_json" });
  // 部分兼容实现不认 response_format，退回不带该参数的请求
  if (!response.ok && response.status === 400) {
    response = await send(baseBody);
  }
  if (!response.ok) {
    throw new AiUpstreamError(await upstreamErrorMessage(response, "image"), response.status);
  }

  const payload = (await response.json()) as {
    data?: { b64_json?: string; url?: string }[];
  };
  const first = payload.data?.[0];
  if (first?.b64_json) {
    return {
      image: `data:image/png;base64,${first.b64_json}`,
      mime: "image/png",
      model: config.imageModel,
    };
  }
  if (first?.url) {
    return { image: first.url, mime: "image/png", model: config.imageModel };
  }
  throw new AiUpstreamError("图片接口没有返回图片数据，请检查画图模型是否支持 /images/generations");
}

/* ------------------------------ 流式响应包装 ------------------------------ */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** 演示模式：把一段文本切成 2–4 字的块，块间 20–40ms */
export async function* demoTyping(text: string): AsyncGenerator<string> {
  const chars = Array.from(text);
  let index = 0;
  while (index < chars.length) {
    const size = 2 + Math.floor(Math.random() * 3);
    yield chars.slice(index, index + size).join("");
    index += size;
    await sleep(20 + Math.floor(Math.random() * 20));
  }
}

export type TextStreamOptions = {
  chunks: AsyncIterable<string>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** 每次成功输出一块之后回调（用于落库） */
  onDone?: (content: string, aborted: boolean) => void | Promise<void>;
};

/** 把文本块序列包装成 text/plain 的 ReadableStream 响应 */
export function createTextStreamResponse(options: TextStreamOptions): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let content = "";
      let aborted = false;
      let closed = false;

      const enqueue = (text: string) => {
        if (closed || !text) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          closed = true;
        }
      };

      try {
        for await (const chunk of options.chunks) {
          if (options.signal?.aborted) {
            aborted = true;
            break;
          }
          if (!chunk) continue;
          content += chunk;
          enqueue(chunk);
          if (closed) {
            aborted = true;
            break;
          }
        }
      } catch (error) {
        aborted = true;
        if (!options.signal?.aborted) {
          const message =
            error instanceof AiUpstreamError
              ? error.message
              : "生成过程中断，请稍后重试";
          enqueue(`\n\n[生成中断] ${message}`);
        }
      }

      try {
        await options.onDone?.(content, aborted);
      } catch {
        // 落库失败不应影响已经返回给用户的内容
      }

      if (!closed) {
        try {
          controller.close();
        } catch {
          // 客户端已断开
        }
      }
    },
    cancel() {
      // 客户端主动停止：上游 fetch 会由 AbortSignal 取消
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-store, no-transform",
      "X-Accel-Buffering": "no",
      ...options.headers,
    },
  });
}
