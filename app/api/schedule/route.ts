import { NextRequest, NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import {
  createSchedule,
  listSchedules,
  normalizeScheduleInput,
  scheduleCounts,
} from "@/lib/schedules";

export const dynamic = "force-dynamic";

async function readBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const payload: unknown = await req.json();
    if (payload === null || typeof payload !== "object" || Array.isArray(payload)) return null;
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** GET /api/schedule 当前用户的计划清单（按 run_at 升序） */
export async function GET() {
  const viewer = await getViewer();
  return NextResponse.json({
    ok: true,
    data: listSchedules(viewer.id),
    counts: scheduleCounts(viewer.id),
  });
}

/** POST /api/schedule  body: { title, note?, runAt, repeat?, enabled? } */
export async function POST(req: NextRequest) {
  const body = await readBody(req);
  if (!body) return NextResponse.json({ ok: false, error: "请求体必须是 JSON 对象" }, { status: 400 });

  const normalized = normalizeScheduleInput(body, false);
  if (!normalized.ok) return NextResponse.json({ ok: false, error: normalized.error }, { status: 400 });

  const viewer = await getViewer();
  const schedule = createSchedule(viewer.id, {
    title: normalized.value.title ?? "",
    note: normalized.value.note,
    runAt: normalized.value.runAt ?? Date.now(),
    repeat: normalized.value.repeat,
    enabled: normalized.value.enabled,
  });

  return NextResponse.json({ ok: true, data: schedule }, { status: 201 });
}
