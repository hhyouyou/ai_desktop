import { NextResponse, type NextRequest } from "next/server";
import {
  getCachedBoards,
  HOT_SOURCES,
  isHotSourceKey,
  type HotSource,
  type HotSourceKey,
} from "@/lib/hot";
import { hotApiConfigured, refreshSources } from "@/lib/hot-fetch";
import type { HotApiData } from "@/components/content/hot-api-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/hot?source=weibo&refresh=1
 * - source 可选：只刷新指定来源（不传则刷新全部）
 * - refresh=1 时尝试抓取上游；失败回退缓存 / 示例数据，永远返回 200
 * - 不传 refresh 时只读缓存（缓存为空则返回示例数据）
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const sourceParam = params.get("source");
  if (sourceParam && !isHotSourceKey(sourceParam)) {
    return NextResponse.json({ ok: false, error: "未知的热点来源" }, { status: 400 });
  }

  const wantsRefresh = params.get("refresh") === "1";
  const requestedSource: HotSourceKey | undefined =
    sourceParam && isHotSourceKey(sourceParam) ? sourceParam : undefined;
  const targets: HotSource[] = requestedSource
    ? HOT_SOURCES.filter((source) => source.key === requestedSource)
    : HOT_SOURCES;

  const warnings: string[] = [];
  if (wantsRefresh) {
    try {
      const outcomes = await refreshSources(targets.map((source) => source.key));
      for (const outcome of outcomes) {
        if (outcome.warning) warnings.push(outcome.warning);
      }
    } catch (error) {
      warnings.push(
        error instanceof Error ? `刷新热点失败：${error.message}` : "刷新热点失败，已回退缓存",
      );
    }
  }

  const boards = getCachedBoards();
  const configured = hotApiConfigured();
  const data: HotApiData = {
    boards,
    configured,
    demo: boards.every((board) => !board.live),
    warnings: [...new Set(warnings)],
    ...(requestedSource ? { requestedSource } : {}),
    refreshedAt: Date.now(),
  };

  return NextResponse.json(
    { ok: true, data },
    { headers: { "cache-control": "no-store" } },
  );
}
