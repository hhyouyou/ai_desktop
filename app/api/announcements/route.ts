import { NextResponse } from "next/server";
import { listAnnouncements } from "@/app/(site)/announcements/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/announcements → 公告列表（表为空时会自动写入种子公告） */
export async function GET() {
  try {
    const items = listAnnouncements();
    return NextResponse.json(
      { ok: true, data: { items } },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "读取公告失败" },
      { status: 500 },
    );
  }
}
