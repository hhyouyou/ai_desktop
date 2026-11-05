import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, checkPassword, signSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

async function readBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const payload: unknown = await req.json();
    if (payload === null || typeof payload !== "object" || Array.isArray(payload)) return null;
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** POST /api/auth/login  body: { email, password } */
export async function POST(req: NextRequest) {
  const body = await readBody(req);
  if (!body) return NextResponse.json({ ok: false, error: "请求体必须是 JSON 对象" }, { status: 400 });

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "请填写邮箱和密码" }, { status: 400 });
  }

  const user = checkPassword(email, password);
  if (!user) {
    return NextResponse.json({ ok: false, error: "邮箱或密码不正确" }, { status: 401 });
  }

  const normalizedEmail = user.identity.replace(/^email:/, "");
  const name = user.name || normalizedEmail.split("@")[0] || "用户";

  const response = NextResponse.json({
    ok: true,
    data: { id: user.id, name, email: normalizedEmail, kind: "email", anonymous: false },
  });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: signSession(user.id),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
