/**
 * 用 Chrome DevTools Protocol 做真实浏览器验证：
 * 打开页面 → 等网络空闲 + 固定等待 → 读取 DOM 文本 / 控制台错误 → 截图。
 *
 * 用法：node scripts/cdp-shot.mjs /apps/json-reader /ai/app/chat
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9333;
const BASE = process.env.SMOKE_BASE || "http://127.0.0.1:4310";
const WAIT_MS = Number(process.env.CDP_WAIT || 7000);
const OUT_DIR = path.join(process.cwd(), ".tmp");

const paths = process.argv.slice(2);
if (paths.length === 0) {
  console.error("用法: node scripts/cdp-shot.mjs /path1 /path2");
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    "--disable-dev-shm-usage",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${path.join(OUT_DIR, "cdp-profile")}`,
    "--window-size=1440,1600",
    "about:blank",
  ],
  { stdio: "ignore" },
);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForChrome() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await sleep(250);
  }
  throw new Error("Chrome 调试端口未就绪");
}

async function newTarget() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" });
  if (!res.ok) throw new Error(`新建标签页失败 ${res.status}`);
  return res.json();
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    const events = [];
    let seq = 0;
    ws.addEventListener("open", () => {
      resolve({
        events,
        send(method, params = {}) {
          const id = ++seq;
          return new Promise((res, rej) => {
            pending.set(id, { res, rej });
            ws.send(JSON.stringify({ id, method, params }));
          });
        },
        close() {
          ws.close();
        },
      });
    });
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(JSON.stringify(msg.error)));
        else res(msg.result);
      } else {
        events.push(msg);
      }
    });
    ws.addEventListener("error", reject);
  });
}

async function main() {
  await waitForChrome();
  const { webSocketDebuggerUrl } = await newTarget();
  const cdp = await connect(webSocketDebuggerUrl);

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Log.enable");
  await cdp.send("Network.enable");

  // 可选：注入主题 cookie，用于给内页截图（内页主题只读 cookie）
  const theme = process.env.CDP_THEME;
  if (theme) {
    await cdp.send("Network.setCookie", {
      name: "bs_theme",
      value: theme,
      url: BASE,
      path: "/",
      httpOnly: true,
    });
  }

  if (process.env.CDP_MOBILE === "1") {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 2600,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true });
    await cdp.send("Network.setUserAgentOverride", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });
  }

  for (const route of paths) {
    const url = /^(https?|file):/.test(route) ? route : `${BASE}${route}`;
    cdp.events.length = 0;
    await cdp.send("Page.navigate", { url });
    await sleep(WAIT_MS);

    const text = await cdp.send("Runtime.evaluate", {
      expression:
        "(document.querySelector('main')||document.body).innerText.replace(/\\s+/g,' ').slice(0,300)",
      returnByValue: true,
    });

    const skeleton = await cdp.send("Runtime.evaluate", {
      expression: "document.querySelectorAll('.animate-pulse').length",
      returnByValue: true,
    });

    const errors = cdp.events
      .filter(
        (e) =>
          e.method === "Runtime.exceptionThrown" ||
          (e.method === "Runtime.consoleAPICalled" && e.params?.type === "error") ||
          (e.method === "Log.entryAdded" && e.params?.entry?.level === "error"),
      )
      .map((e) => {
        if (e.method === "Runtime.exceptionThrown") {
          return `exception: ${e.params.exceptionDetails?.exception?.description ?? e.params.exceptionDetails?.text}`;
        }
        if (e.method === "Log.entryAdded") return `log: ${e.params.entry.text}`;
        return `console.error: ${e.params.args?.map((a) => a.value ?? a.description).join(" ")}`;
      })
      .slice(0, 5);

    const shot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
    const name = route.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "home";
    const file = path.join(OUT_DIR, `cdp-${name}.png`);
    fs.writeFileSync(file, Buffer.from(shot.data, "base64"));

    console.log(`\n=== ${route} ===`);
    console.log(`text: ${text.result.value}`);
    console.log(`skeleton nodes: ${skeleton.result.value}`);
    console.log(`console errors: ${errors.length ? "\n  " + errors.join("\n  ") : "none"}`);
    console.log(`shot: ${file}`);
  }

  cdp.close();
}

main()
  .catch((error) => {
    console.error("FAILED:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    setTimeout(() => chrome.kill("SIGKILL"), 500);
  });
