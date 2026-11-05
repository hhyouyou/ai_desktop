import { cookies, headers } from "next/headers";
import {
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "bs_session";

const DEV_SECRET = "blockset-dev-secret-change-me";
function secret(): string {
  return process.env.SESSION_SECRET || DEV_SECRET;
}

export type Viewer = {
  id: string;
  name: string;
  kind: "anon" | "email";
  email: string | null;
  anonymous: boolean;
};

type UserRow = {
  id: string;
  kind: "anon" | "email";
  identity: string;
  name: string | null;
  pass_hash: string | null;
  pass_salt: string | null;
  created_at: number;
};

/* ------------------------------ 匿名身份 ------------------------------ */

function hashIdentity(identity: string): string {
  return createHash("sha256").update(identity).digest("hex").slice(0, 24);
}

async function requestIdentity(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || h.get("x-real-ip") || "127.0.0.1";
  const ua = h.get("user-agent") ?? "unknown-agent";
  return hashIdentity(`${ip}::${ua}`);
}

function userById(id: string): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
}

function userByIdentity(identity: string): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE identity = ?").get(identity) as
    | UserRow
    | undefined;
}

function insertUser(input: {
  id: string;
  kind: "anon" | "email";
  identity: string;
  name: string | null;
  passHash?: string | null;
  passSalt?: string | null;
}): UserRow {
  db.prepare(
    `INSERT INTO users (id, kind, identity, name, pass_hash, pass_salt, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(identity) DO NOTHING`,
  ).run(
    input.id,
    input.kind,
    input.identity,
    input.name,
    input.passHash ?? null,
    input.passSalt ?? null,
    Date.now(),
  );
  return userByIdentity(input.identity)!;
}

function ensureAnonymous(hash: string): UserRow {
  const existing = userByIdentity(`anon:${hash}`);
  if (existing) return existing;
  return insertUser({
    id: `u_${randomBytes(9).toString("hex")}`,
    kind: "anon",
    identity: `anon:${hash}`,
    name: null,
  });
}

/* ------------------------------ 会话签名 ------------------------------ */

export function signSession(userId: string): string {
  const payload = Buffer.from(userId, "utf8").toString("base64url");
  const mac = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

export function verifySession(token: string | undefined | null): string | null {
  if (!token) return null;
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  try {
    return Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

function toViewer(row: UserRow): Viewer {
  const email = row.kind === "email" ? row.identity.replace(/^email:/, "") : null;
  return {
    id: row.id,
    name: row.name || email?.split("@")[0] || "访客",
    kind: row.kind,
    email,
    anonymous: row.kind === "anon",
  };
}

/** 读取（必要时创建）当前访问者。匿名访客由 IP + UA 派生，无需登录即可用待办。 */
export async function getViewer(): Promise<Viewer> {
  const store = await cookies();
  const userId = verifySession(store.get(SESSION_COOKIE)?.value);
  if (userId) {
    const row = userById(userId);
    if (row) return toViewer(row);
  }
  const row = ensureAnonymous(await requestIdentity());
  return toViewer(row);
}

/* ------------------------------ 密码 ------------------------------ */

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function findEmailUser(email: string): UserRow | undefined {
  return userByIdentity(`email:${normalizeEmail(email)}`);
}

export function findUserById(id: string): UserRow | undefined {
  return userById(id);
}

export function createEmailUser(input: {
  email: string;
  password: string;
  name?: string;
}): { ok: true; user: UserRow } | { ok: false; error: string } {
  const email = normalizeEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "邮箱格式不正确" };
  }
  if (input.password.length < 6) {
    return { ok: false, error: "密码至少 6 位" };
  }
  if (findEmailUser(email)) {
    return { ok: false, error: "该邮箱已注册，请直接登录" };
  }
  const { hash, salt } = hashPassword(input.password);
  const user = insertUser({
    id: `u_${randomBytes(9).toString("hex")}`,
    kind: "email",
    identity: `email:${email}`,
    name: input.name?.trim() || email.split("@")[0],
    passHash: hash,
    passSalt: salt,
  });
  return { ok: true, user };
}

export function checkPassword(email: string, password: string): UserRow | null {
  const user = findEmailUser(email);
  if (!user || !user.pass_hash || !user.pass_salt) return null;
  return verifyPassword(password, user.pass_hash, user.pass_salt) ? user : null;
}

export function setUserName(userId: string, name: string): void {
  db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name.trim().slice(0, 24), userId);
}

/** 把匿名访客升级为邮箱账号（保留原 id，数据不丢） */
export function upgradeToEmail(input: {
  identityHash: string;
  email: string;
  password: string;
  name?: string;
}): { ok: true; user: UserRow } | { ok: false; error: string } {
  const email = normalizeEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "邮箱格式不正确" };
  if (input.password.length < 6) return { ok: false, error: "密码至少 6 位" };
  const existing = findEmailUser(email);
  if (existing) return { ok: false, error: "该邮箱已注册，请直接登录" };

  const anon = userByIdentity(`anon:${input.identityHash}`);
  const { hash, salt } = hashPassword(input.password);
  if (anon) {
    db.prepare(
      "UPDATE users SET kind = 'email', identity = ?, name = ?, pass_hash = ?, pass_salt = ? WHERE id = ?",
    ).run(
      `email:${email}`,
      input.name?.trim() || email.split("@")[0],
      hash,
      salt,
      anon.id,
    );
    return { ok: true, user: userById(anon.id)! };
  }
  return createEmailUser({ email, password: input.password, name: input.name });
}

/** 供注册流程使用：把当前请求的匿名 hash 拿出来 */
export async function currentAnonymousHash(): Promise<string> {
  return requestIdentity();
}
