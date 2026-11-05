/** GET /api/ai/drawings —— 当前访问者已保存的创作列表（?preview=1 时包含预览） */

import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { listDrawings } from "@/lib/ai/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  const viewer = await getViewer();
  const includePreview = req.nextUrl.searchParams.get("preview") === "1";
  return NextResponse.json({
    ok: true,
    data: { drawings: listDrawings(viewer.id, includePreview) },
  });
}
