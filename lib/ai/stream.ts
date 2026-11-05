/**
 * 流式响应读取（浏览器端）。
 *
 * 服务端返回的是纯文本分块（text/plain + ReadableStream），不是 SSE；
 * 这里用 reader 逐块解码，把增量交给调用方渲染打字机效果。
 * 同时从响应头读取演示模式标记，用于实时更新界面徽标。
 */

export type StreamMeta = { demo: boolean; model: string };

export type StreamResult = { content: string; aborted: boolean };

function isAbortError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  return (error as { name?: string }).name === "AbortError";
}

export async function streamAiText(input: {
  url: string;
  body: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  onChunk: (text: string) => void;
  onMeta?: (meta: StreamMeta) => void;
}): Promise<StreamResult> {
  const { url, body, headers = {}, signal, onChunk, onMeta } = input;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    let message = `生成失败（HTTP ${response.status}）`;
    try {
      const payload = (await response.json()) as { error?: string } | null;
      if (payload && typeof payload.error === "string" && payload.error) message = payload.error;
    } catch {
      // 响应不是 JSON，保留默认中文提示
    }
    throw new Error(message);
  }

  onMeta?.({
    demo: response.headers.get("X-AI-Demo") === "1",
    model: response.headers.get("X-AI-Model") ?? "",
  });

  const reader = response.body?.getReader();
  if (!reader) throw new Error("当前浏览器不支持流式读取，请换用新版浏览器");

  const decoder = new TextDecoder();
  let content = "";

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      if (!text) continue;
      content += text;
      onChunk(text);
    }
    const tail = decoder.decode();
    if (tail) {
      content += tail;
      onChunk(tail);
    }
    return { content, aborted: false };
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) {
      return { content, aborted: true };
    }
    throw error instanceof Error ? error : new Error("流式读取中断");
  } finally {
    reader.releaseLock();
  }
}
