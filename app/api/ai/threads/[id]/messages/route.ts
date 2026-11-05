/** DELETE /api/ai/threads/[id]/messages —— 清空该会话的消息（保留会话本身） */

import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { clearThreadMessages } from "@/lib/ai/store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params): Promise<Response> {
  const { id } = await params;
  const viewer = await getViewer();
  if (!clearThreadMessages(viewer.id, id)) {
    return NextResponse.json({ ok: false, error: "会话不存在或已被删除" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: { id } });
}
