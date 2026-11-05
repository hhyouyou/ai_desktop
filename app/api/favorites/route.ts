import { NextRequest, NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getTool } from "@/lib/site";
import { getFavoriteSlugs, toggleFavorite } from "@/lib/tools/favorites";

/** GET /api/favorites -> 当前访客收藏的工具 slug 列表 */
export async function GET() {
  try {
    const viewer = await getViewer();
    return NextResponse.json({ ok: true, data: getFavoriteSlugs(viewer.id) });
  } catch {
    return NextResponse.json({ ok: false, error: "读取收藏失败，请稍后重试" }, { status: 500 });
  }
}

/** POST /api/favorites { slug } -> 切换收藏，返回 { favorited } */
export async function POST(request: NextRequest) {
  try {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: "请求内容不是合法的 JSON" }, { status: 400 });
    }

    const slug =
      typeof payload === "object" && payload !== null && "slug" in payload
        ? (payload as { slug?: unknown }).slug
        : undefined;

    if (typeof slug !== "string" || slug.trim() === "") {
      return NextResponse.json({ ok: false, error: "缺少工具标识 slug" }, { status: 400 });
    }

    const normalized = slug.trim();
    if (!getTool(normalized)) {
      return NextResponse.json({ ok: false, error: "工具不存在" }, { status: 404 });
    }

    const viewer = await getViewer();
    const favorited = toggleFavorite(viewer.id, normalized);
    return NextResponse.json({ ok: true, data: { favorited } });
  } catch {
    return NextResponse.json({ ok: false, error: "收藏操作失败，请稍后重试" }, { status: 500 });
  }
}
