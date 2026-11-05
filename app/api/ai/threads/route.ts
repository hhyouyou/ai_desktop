/** GET  /api/ai/threads → 当前访问者的会话列表；POST 新建会话 */

import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { createThread, listThreads } from "@/lib/ai/store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const viewer = await getViewer();
  return NextResponse.json({ ok: true, data: { threads: listThreads(viewer.id) } });
}

export async function POST(req: NextRequest): Promise<Response> {
  const viewer = await getViewer();
  let payload: unknown = null;
  try {
    payload = await req.json();
  } catch {
    payload = null;
  }
  const body = (payload ?? {}) as { title?: unknown };
  const title = typeof body.title === "string" ? body.title : "新对话";
  return NextResponse.json({ ok: true, data: { thread: createThread(viewer.id, title) } });
}
