import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  currentAnonymousHash,
  getViewer,
  signSession,
  upgradeToEmail,
} from "@/lib/auth";

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

/** POST /api/auth/register  body: { email, password, name? }
 *  把当前匿名身份升级为邮箱账号：保留 user id，因此已有待办 / 计划数据不丢。 */
export async function POST(req: NextRequest) {
  const body = await readBody(req);
  if (!body) return NextResponse.json({ ok: false, error: "请求体必须是 JSON 对象" }, { status: 400 });

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "请填写邮箱和密码" }, { status: 400 });
  }

  const viewer = await getViewer();
  if (!viewer.anonymous) {
    return NextResponse.json(
      { ok: false, error: "当前已登录，请先退出再注册新账号" },
      { status: 400 },
    );
  }

  const identityHash = await currentAnonymousHash();
  const result = upgradeToEmail({ identityHash, email, password, name: name || undefined });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  const user = result.user;
  const normalizedEmail = user.identity.replace(/^email:/, "");
  const displayName = user.name || normalizedEmail.split("@")[0] || "用户";

  const response = NextResponse.json(
    {
      ok: true,
      data: {
        id: user.id,
        name: displayName,
        email: normalizedEmail,
        kind: "email",
        anonymous: false,
      },
    },
    { status: 201 },
  );
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
