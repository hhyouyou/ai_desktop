import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { DEFAULT_THEME, isThemeId, normalizeTheme, THEME_COOKIE } from "@/lib/theme";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** 读取当前主题（用于客户端初始化或调试） */
export async function GET() {
  const store = await cookies();
  const theme = normalizeTheme(store.get(THEME_COOKIE)?.value);
  return NextResponse.json({ ok: true, data: { theme, default: DEFAULT_THEME } });
}

/** 设置主题：写入一年期 cookie，服务端下次渲染直接输出 data-theme，避免刷新闪烁 */
export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const theme = (payload as { theme?: unknown } | null)?.theme;
  if (typeof theme !== "string" || !isThemeId(theme)) {
    return NextResponse.json({ ok: false, error: "未知主题" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true, data: { theme } });
  response.cookies.set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
    httpOnly: true,
  });
  return response;
}

/** 恢复默认主题：清掉 cookie，下次渲染回落到 DEFAULT_THEME（纸面工作台） */
export async function DELETE() {
  const response = NextResponse.json({ ok: true, data: { theme: DEFAULT_THEME } });
  response.cookies.set(THEME_COOKIE, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    httpOnly: true,
  });
  return response;
}
