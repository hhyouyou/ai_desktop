/**
 * 冒烟测试：逐路由请求，检查 HTTP 状态与关键内容。
 * 用法：node scripts/smoke.mjs [baseUrl]
 */
const BASE = process.argv[2] || "http://127.0.0.1:4310";

const TOOL_SLUGS = [
  "calculator",
  "gen-password",
  "mortgage-calculator",
  "timestamp",
  "qrcode",
  "json-reader",
  "md5",
  "base64",
  "image-compression",
  "image-cropper",
  "nine-grid",
  "color-picker",
  "text-diff",
  "word-counter",
];

const ARTICLES = ["why-blockset", "browser-local-compute", "ai-architecture-tradeoffs"];

const ROUTES = [
  ["/", "块集"],
  ["/apps", "工具箱"],
  ["/ai/app/chat", "AI"],
  ["/ai/app/writing", ""],
  ["/ai/app/settings", ""],
  ["/drawing/create", ""],
  ["/drawing/gallery", ""],
  ["/drawing/creations", ""],
  ["/daily-hot", ""],
  ["/daily-brief", ""],
  ["/article", ""],
  ["/announcements", ""],
  ["/menus", ""],
  ["/user/todo", ""],
  ["/user/todo/analysis", ""],
  ["/scheduled-tasks", ""],
  ["/auth/login", ""],
  ["/settings", ""],
  ["/about", "关于块集"],
  ["/support", ""],
  ["/rss.xml", "<rss"],
  ...TOOL_SLUGS.map((slug) => [`/apps/${slug}`, ""]),
];

const API_ROUTES = [
  ["/api/auth/me", "GET"],
  ["/api/todo", "GET"],
  ["/api/hot", "GET"],
];

const cookieJar = new Map();

function rememberCookies(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const line of raw) {
    const [pair] = line.split(";");
    const idx = pair.indexOf("=");
    if (idx > 0) cookieJar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }
}

function cookieHeader() {
  return [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function check(path, mustContain, method = "GET") {
  const started = Date.now();
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { cookie: cookieHeader(), "user-agent": "blockset-smoke/1.0" },
      redirect: "manual",
    });
    rememberCookies(res);
    const text = await res.text();
    const ok = res.status >= 200 && res.status < 400;
    const hasContent = mustContain
      ? text.includes(mustContain)
      : text.length > (method === "GET" && path.startsWith("/api") ? 2 : 200);
    return {
      path,
      status: res.status,
      ok: ok && hasContent,
      len: text.length,
      ms: Date.now() - started,
      note: hasContent ? "" : `缺少内容 "${mustContain}"`,
      body: text,
    };
  } catch (error) {
    return { path, status: 0, ok: false, len: 0, ms: Date.now() - started, note: String(error) };
  }
}

const failures = [];

console.log(`\n== 页面 (${BASE}) ==`);
for (const [path, needle] of ROUTES) {
  const r = await check(path, needle);
  const flag = r.ok ? "✓" : "✗";
  console.log(`${flag} ${String(r.status).padEnd(3)} ${String(r.len).padStart(7)}B ${String(r.ms).padStart(5)}ms  ${path} ${r.note}`);
  if (!r.ok) failures.push({ ...r, body: undefined });
}

console.log("\n== 接口 ==");
for (const [path, method] of API_ROUTES) {
  const r = await check(path, null, method);
  const flag = r.ok ? "✓" : "✗";
  console.log(`${flag} ${String(r.status).padEnd(3)} ${String(r.len).padStart(7)}B ${path}`);
  if (!r.ok) failures.push({ ...r, body: undefined });
}

if (!failures.length) {
  console.log("\n全部通过 ✓");
  process.exit(0);
}

console.log(`\n失败 ${failures.length} 项：`);
for (const f of failures) console.log(` - ${f.path} status=${f.status} ${f.note}`);
process.exit(1);
