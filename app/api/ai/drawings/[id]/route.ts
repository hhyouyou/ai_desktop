/** PATCH（保存到我的创作）/ DELETE（删除） /api/ai/drawings/[id] */

import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { deleteDrawing, saveDrawing } from "@/lib/ai/store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_req: NextRequest, { params }: Params): Promise<Response> {
  const { id } = await params;
  const viewer = await getViewer();
  const drawing = saveDrawing(viewer.id, id);
  if (!drawing) {
    return NextResponse.json({ ok: false, error: "画作不存在或已被删除" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: { drawing } });
}

export async function DELETE(_req: NextRequest, { params }: Params): Promise<Response> {
  const { id } = await params;
  const viewer = await getViewer();
  if (!deleteDrawing(viewer.id, id)) {
    return NextResponse.json({ ok: false, error: "画作不存在或已被删除" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: { id } });
}
