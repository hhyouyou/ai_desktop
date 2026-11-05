/**
 * AI 模块的数据访问层（仅服务端使用）。
 * 所有查询都带 user_id 过滤：会话、消息、画作严格按访问者隔离。
 */

import { db } from "@/lib/db";
import { uid } from "@/lib/utils";
import type { ChatRole, DrawingItem, MessageItem, ThreadSummary } from "./types";

type ThreadRow = {
  id: string;
  user_id: string;
  title: string;
  mode: string;
  created_at: number;
  updated_at: number;
};

type ThreadWithCount = ThreadRow & { message_count: number };

type MessageRow = {
  id: string;
  thread_id: string;
  role: string;
  content: string;
  created_at: number;
};

type DrawingRow = {
  id: string;
  user_id: string;
  prompt: string;
  model: string;
  status: string;
  payload: string;
  mime: string;
  created_at: number;
};

function asRole(value: string): ChatRole {
  return value === "assistant" || value === "system" ? value : "user";
}

function toThread(row: ThreadWithCount): ThreadSummary {
  return {
    id: row.id,
    title: row.title,
    mode: row.mode,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messageCount: row.message_count,
  };
}

function toMessage(row: MessageRow): MessageItem {
  return {
    id: row.id,
    role: asRole(row.role),
    content: row.content,
    createdAt: row.created_at,
  };
}

function toDrawing(row: DrawingRow): DrawingItem {
  return {
    id: row.id,
    prompt: row.prompt,
    model: row.model,
    mime: row.mime,
    payload: row.payload,
    status: row.status,
    createdAt: row.created_at,
  };
}

/* ---------------------------------- 会话 ---------------------------------- */

export function listThreads(userId: string): ThreadSummary[] {
  const rows = db
    .prepare(
      `SELECT t.*, (SELECT COUNT(*) FROM messages m WHERE m.thread_id = t.id) AS message_count
         FROM threads t
        WHERE t.user_id = ?
        ORDER BY t.updated_at DESC`,
    )
    .all(userId) as ThreadWithCount[];
  return rows.map(toThread);
}

export function getThread(userId: string, threadId: string): ThreadSummary | null {
  const row = db
    .prepare(
      `SELECT t.*, (SELECT COUNT(*) FROM messages m WHERE m.thread_id = t.id) AS message_count
         FROM threads t
        WHERE t.id = ? AND t.user_id = ?`,
    )
    .get(threadId, userId) as ThreadWithCount | undefined;
  return row ? toThread(row) : null;
}

export function createThread(userId: string, title = "新对话"): ThreadSummary {
  const now = Date.now();
  const id = uid("th");
  db.prepare(
    "INSERT INTO threads (id, user_id, title, mode, created_at, updated_at) VALUES (?, ?, ?, 'chat', ?, ?)",
  ).run(id, userId, title.trim().slice(0, 40) || "新对话", now, now);
  return {
    id,
    title: title.trim().slice(0, 40) || "新对话",
    mode: "chat",
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  };
}

export function renameThread(userId: string, threadId: string, title: string): boolean {
  const clean = title.replace(/\s+/g, " ").trim().slice(0, 40);
  if (!clean) return false;
  const result = db
    .prepare("UPDATE threads SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?")
    .run(clean, Date.now(), threadId, userId);
  return result.changes > 0;
}

export function deleteThread(userId: string, threadId: string): boolean {
  const result = db.prepare("DELETE FROM threads WHERE id = ? AND user_id = ?").run(threadId, userId);
  return result.changes > 0;
}

export function clearThreadMessages(userId: string, threadId: string): boolean {
  const owns = ownsThread(userId, threadId);
  if (!owns) return false;
  db.prepare("DELETE FROM messages WHERE thread_id = ?").run(threadId);
  db.prepare("UPDATE threads SET title = '新对话', updated_at = ? WHERE id = ?").run(Date.now(), threadId);
  return true;
}

export function ownsThread(userId: string, threadId: string): boolean {
  const row = db
    .prepare("SELECT 1 AS ok FROM threads WHERE id = ? AND user_id = ?")
    .get(threadId, userId) as { ok: number } | undefined;
  return Boolean(row);
}

export function touchThread(threadId: string): void {
  db.prepare("UPDATE threads SET updated_at = ? WHERE id = ?").run(Date.now(), threadId);
}

/** 第一条用户消息后自动用内容当标题 */
export function autoTitleThread(userId: string, threadId: string, text: string): void {
  const row = db
    .prepare("SELECT title FROM threads WHERE id = ? AND user_id = ?")
    .get(threadId, userId) as { title: string } | undefined;
  if (!row || (row.title !== "新对话" && row.title !== "")) return;
  const title = text.replace(/\s+/g, " ").trim().slice(0, 18) || "新对话";
  db.prepare("UPDATE threads SET title = ? WHERE id = ?").run(title, threadId);
}

/* ---------------------------------- 消息 ---------------------------------- */

export function listMessages(threadId: string, limit = 200): MessageItem[] {
  const rows = db
    .prepare(
      `SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at ASC, rowid ASC LIMIT ?`,
    )
    .all(threadId, limit) as MessageRow[];
  return rows.map(toMessage);
}

export function appendMessage(threadId: string, role: ChatRole, content: string): MessageItem {
  const now = Date.now();
  const id = uid("msg");
  db.prepare(
    "INSERT INTO messages (id, thread_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(id, threadId, role, content, now);
  touchThread(threadId);
  return { id, role, content, createdAt: now };
}

/** 重新生成前，删掉最后一条助手消息，避免上下文里出现两份回答 */
export function deleteLastAssistantMessage(threadId: string): void {
  const row = db
    .prepare(
      "SELECT id FROM messages WHERE thread_id = ? AND role = 'assistant' ORDER BY created_at DESC, rowid DESC LIMIT 1",
    )
    .get(threadId) as { id: string } | undefined;
  if (row) db.prepare("DELETE FROM messages WHERE id = ?").run(row.id);
}

/* ---------------------------------- 画作 ---------------------------------- */

export function insertDrawing(input: {
  userId: string;
  prompt: string;
  model: string;
  payload: string;
  mime: string;
  status?: "preview" | "done";
}): DrawingItem {
  const now = Date.now();
  const id = uid("dr");
  db.prepare(
    `INSERT INTO drawings (id, user_id, prompt, model, status, payload, mime, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.userId,
    input.prompt,
    input.model,
    input.status ?? "preview",
    input.payload,
    input.mime,
    now,
  );
  return {
    id,
    prompt: input.prompt,
    model: input.model,
    mime: input.mime,
    payload: input.payload,
    status: input.status ?? "preview",
    createdAt: now,
  };
}

export function getDrawing(userId: string, drawingId: string): DrawingItem | null {
  const row = db
    .prepare("SELECT * FROM drawings WHERE id = ? AND user_id = ?")
    .get(drawingId, userId) as DrawingRow | undefined;
  return row ? toDrawing(row) : null;
}

export function listDrawings(userId: string, includePreview = false): DrawingItem[] {
  const sql = includePreview
    ? "SELECT * FROM drawings WHERE user_id = ? ORDER BY created_at DESC LIMIT 120"
    : "SELECT * FROM drawings WHERE user_id = ? AND status = 'done' ORDER BY created_at DESC LIMIT 120";
  const rows = db.prepare(sql).all(userId) as DrawingRow[];
  return rows.map(toDrawing);
}

export function saveDrawing(userId: string, drawingId: string): DrawingItem | null {
  const result = db
    .prepare("UPDATE drawings SET status = 'done' WHERE id = ? AND user_id = ?")
    .run(drawingId, userId);
  if (result.changes === 0) {
    // 已经保存过也算成功（幂等）
    return getDrawing(userId, drawingId);
  }
  return getDrawing(userId, drawingId);
}

export function deleteDrawing(userId: string, drawingId: string): boolean {
  const result = db
    .prepare("DELETE FROM drawings WHERE id = ? AND user_id = ?")
    .run(drawingId, userId);
  return result.changes > 0;
}

/** 清理过期的预览图，避免用户反复生成把表撑大 */
export function prunePreviewDrawings(userId: string, keepMs = 2 * 60 * 60 * 1000): void {
  db.prepare("DELETE FROM drawings WHERE user_id = ? AND status = 'preview' AND created_at < ?").run(
    userId,
    Date.now() - keepMs,
  );
}
