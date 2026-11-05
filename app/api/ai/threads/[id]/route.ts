/** GET / PATCH / DELETE /api/ai/threads/[id] —— 单个会话的读取、重命名、删除 */

import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import {
  deleteThread,
  getThread,
  listMessages,
  renameThread,
} from "@/lib/ai/store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params): Promise<Response> {
  const { id } = await params;
  const viewer = await getViewer();
  const thread = getThread(viewer.id, id);
  if (!thread) {
    return NextResponse.json({ ok: false, error: "会话不存在或已被删除" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    data: { thread, messages: listMessages(id) },
  });
}

export async function PATCH(req: NextRequest, { params }: Params): Promise<Response> {
  const { id } = await params;
  const viewer = await getViewer();
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是合法的 JSON" }, { status: 400 });
  }
  const body = (payload ?? {}) as { title?: unknown };
  const title = typeof body.title === "string" ? body.title : "";
  if (!title.trim()) {
    return NextResponse.json({ ok: false, error: "标题不能为空" }, { status: 400 });
  }
  if (!renameThread(viewer.id, id, title)) {
    return NextResponse.json({ ok: false, error: "会话不存在或已被删除" }, { status: 404 });
  }
  const thread = getThread(viewer.id, id);
  if (!thread) {
    return NextResponse.json({ ok: false, error: "会话不存在或已被删除" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: { thread } });
}

export async function DELETE(_req: NextRequest, { params }: Params): Promise<Response> {
  const { id } = await params;
  const viewer = await getViewer();
  if (!deleteThread(viewer.id, id)) {
    return NextResponse.json({ ok: false, error: "会话不存在或已被删除" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: { id } });
}
