import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getViewer, setUserName } from "@/lib/auth";
import { todoCounts } from "@/lib/todos";
import { scheduleCounts } from "@/lib/schedules";

export const dynamic = "force-dynamic";

const NAME_MAX = 24;

async function readBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const payload: unknown = await req.json();
    if (payload === null || typeof payload !== "object" || Array.isArray(payload)) return null;
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

function stats(userId: string) {
  const row = db
    .prepare("SELECT COUNT(*) AS count FROM favorites WHERE user_id = ?")
    .get(userId) as { count: number } | undefined;
  return {
    todos: todoCounts(userId),
    schedules: scheduleCounts(userId),
    favorites: row?.count ?? 0,
  };
}

/** GET /api/auth/me 当前访问者（匿名身份也返回）与数据统计 */
export async function GET() {
  const viewer = await getViewer();
  return NextResponse.json({ ok: true, data: { viewer, stats: stats(viewer.id) } });
}

/** PATCH /api/auth/me  body: { name } 修改昵称 */
export async function PATCH(req: NextRequest) {
  const body = await readBody(req);
  if (!body) return NextResponse.json({ ok: false, error: "请求体必须是 JSON 对象" }, { status: 400 });

  if (typeof body.name !== "string") {
    return NextResponse.json({ ok: false, error: "昵称必须是文本" }, { status: 400 });
  }
  const name = body.name.trim();
  if (!name) return NextResponse.json({ ok: false, error: "昵称不能为空" }, { status: 400 });
  if (name.length > NAME_MAX) {
    return NextResponse.json({ ok: false, error: `昵称最多 ${NAME_MAX} 个字` }, { status: 400 });
  }

  const viewer = await getViewer();
  setUserName(viewer.id, name);

  return NextResponse.json({
    ok: true,
    data: {
      viewer: { ...viewer, name },
      stats: stats(viewer.id),
    },
  });
}
