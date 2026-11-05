import { NextResponse, type NextRequest } from "next/server";
import { isThemeId, normalizeTheme, THEME_COOKIE } from "@/lib/theme";

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * 主题参数同步：
 * 访问任意页面带 ?theme=glass 时，把主题写进 cookie 并重定向到去掉参数的地址，
 * 保证首页和内页始终读同一份主题，不会出现「首页换了、内页没换」。
 */
export function proxy(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("theme");
  if (!raw || !isThemeId(raw)) return NextResponse.next();

  const theme = normalizeTheme(raw);
  if (request.cookies.get(THEME_COOKIE)?.value === theme) {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete("theme");
    return NextResponse.redirect(clean);
  }

  const clean = request.nextUrl.clone();
  clean.searchParams.delete("theme");
  const response = NextResponse.redirect(clean);
  response.cookies.set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
    httpOnly: true,
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api|favicon.ico|icon.svg).*)"],
};
