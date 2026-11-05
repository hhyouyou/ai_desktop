import { NextResponse, type NextRequest } from "next/server";
import { getCachedBoards } from "@/lib/hot";
import { resolveAiConfig } from "@/lib/ai/config";
import {
  generateBrief,
  getBrief,
  isBriefFresh,
  listBriefs,
  saveBrief,
} from "@/lib/brief";
import { localDateKey } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/brief?date=YYYY-MM-DD
 * 返回指定日期的简报（不传则返回最新一期）和历史列表。
 */
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (date && !DATE_PATTERN.test(date)) {
    return NextResponse.json({ ok: false, error: "日期格式应为 YYYY-MM-DD" }, { status: 400 });
  }
  const history = listBriefs(24);
  const brief = date ? getBrief(date) : history[0] ?? null;
  return NextResponse.json(
    { ok: true, data: { brief, history } },
    { headers: { "cache-control": "no-store" } },
  );
}

/**
 * POST /api/brief
 * 用缓存的 8 个来源前 5 条生成今日简报。
 *
 * - ?auto=1（定时任务 / 首次打开自动生成）：当天简报仍新鲜时直接返回，不重复调用模型
 * - 默认（手动点按钮）：强制重新生成
 * 没有 AI Key 时用模板规则（demo:true），有 Key 时调用 OpenAI 兼容接口；结果都写入 briefs 表。
 */
export async function POST(request: NextRequest) {
  try {
    const auto = request.nextUrl.searchParams.get("auto") === "1";
    const boards = getCachedBoards();
    const latestDataAt = boards.reduce((max, board) => Math.max(max, board.fetchedAt), 0);

    if (auto) {
      const existing = getBrief(localDateKey());
      if (isBriefFresh(existing, latestDataAt)) {
        return NextResponse.json(
          {
            ok: true,
            data: { brief: existing!.payload, warning: null, skipped: true },
          },
          { headers: { "cache-control": "no-store" } },
        );
      }
    }

    const { payload, warning } = await generateBrief(boards, resolveAiConfig(request.headers));
    const saved = saveBrief(payload);
    return NextResponse.json(
      { ok: true, data: { brief: saved.payload, warning: warning ?? null, skipped: false } },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成简报失败，请稍后重试";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
