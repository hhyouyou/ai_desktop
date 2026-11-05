/**
 * 浏览器端调用 AI 模块 JSON 接口的小封装。
 * 所有请求都带 viewer 的 cookie（同源 fetch 默认带），服务端按 viewer.id 隔离数据。
 */

import type { DrawingItem, MessageItem, ThreadSummary } from "./types";

type ApiEnvelope<T> = { ok: boolean; data?: T; error?: string };

async function parse<T>(res: Response): Promise<T> {
  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await res.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }
  if (!res.ok || !payload || payload.ok !== true || payload.data === undefined) {
    throw new Error(payload?.error || `请求失败（HTTP ${res.status}）`);
  }
  return payload.data;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  return parse<T>(res);
}

async function requestVoid(url: string, init?: RequestInit): Promise<void> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  let payload: { ok?: boolean; error?: string } | null = null;
  try {
    payload = (await res.json()) as { ok?: boolean; error?: string };
  } catch {
    payload = null;
  }
  if (!res.ok || !payload || payload.ok !== true) {
    throw new Error(payload?.error || `请求失败（HTTP ${res.status}）`);
  }
}

/* ---------------------------------- 会话 ---------------------------------- */

export function fetchThreads(): Promise<{ threads: ThreadSummary[] }> {
  return request<{ threads: ThreadSummary[] }>("/api/ai/threads");
}

export function createThread(title?: string): Promise<{ thread: ThreadSummary }> {
  return request<{ thread: ThreadSummary }>("/api/ai/threads", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export function fetchThread(
  threadId: string,
): Promise<{ thread: ThreadSummary; messages: MessageItem[] }> {
  return request<{ thread: ThreadSummary; messages: MessageItem[] }>(
    `/api/ai/threads/${encodeURIComponent(threadId)}`,
  );
}

export function renameThread(threadId: string, title: string): Promise<{ thread: ThreadSummary }> {
  return request<{ thread: ThreadSummary }>(`/api/ai/threads/${encodeURIComponent(threadId)}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export function deleteThread(threadId: string): Promise<void> {
  return requestVoid(`/api/ai/threads/${encodeURIComponent(threadId)}`, { method: "DELETE" });
}

export function clearThreadMessages(threadId: string): Promise<void> {
  return requestVoid(`/api/ai/threads/${encodeURIComponent(threadId)}/messages`, {
    method: "DELETE",
  });
}

/* ---------------------------------- 画作 ---------------------------------- */

export function saveDrawing(id: string): Promise<{ drawing: DrawingItem }> {
  return request<{ drawing: DrawingItem }>(`/api/ai/drawings/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "save" }),
  });
}

export function deleteDrawing(id: string): Promise<void> {
  return requestVoid(`/api/ai/drawings/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function fetchDrawings(): Promise<{ drawings: DrawingItem[] }> {
  return request<{ drawings: DrawingItem[] }>("/api/ai/drawings");
}

/* ---------------------------------- 测试连接 ------------------------------- */

export type PingResult = {
  demo: boolean;
  model: string;
  latencyMs: number;
  message: string;
};

export async function pingAi(headers: Record<string, string>): Promise<PingResult> {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ mode: "ping", messages: [{ role: "user", content: "ping" }] }),
  });
  let payload: (PingResult & { ok?: boolean; error?: string }) | null = null;
  try {
    payload = (await res.json()) as (PingResult & { ok?: boolean; error?: string }) | null;
  } catch {
    payload = null;
  }
  if (!res.ok || !payload || payload.ok !== true) {
    throw new Error(payload?.error || `请求失败（HTTP ${res.status}）`);
  }
  return payload;
}
