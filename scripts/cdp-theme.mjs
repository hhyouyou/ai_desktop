/**
 * 端到端验证桌面主题切换：
 * 打开首页 → 点「主题」→ 依次点毛玻璃/平铺 → 读 data-theme、localStorage、cookie 接口。
 * 用法：node scripts/cdp-theme.mjs
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9336;
const BASE = process.env.SMOKE_BASE || "http://127.0.0.1:4310";

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${path.join(process.cwd(), ".tmp", "cdp-theme-profile")}`,
    "--window-size=1440,1000",
    "about:blank",
  ],
  { stdio: "ignore" },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForChrome() {
  for (let i = 0; i < 80; i += 1) {
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) return;
    } catch {
      /* retry */
    }
    await sleep(250);
  }
  throw new Error("Chrome 未就绪");
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    const events = [];
    let seq = 0;
    ws.addEventListener("open", () =>
      resolve({
        events,
        send(method, params = {}) {
          const id = ++seq;
          return new Promise((res, rej) => {
            pending.set(id, { res, rej });
            ws.send(JSON.stringify({ id, method, params }));
          });
        },
        close: () => ws.close(),
      }),
    );
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
      } else {
        events.push(msg);
      }
    });
    ws.addEventListener("error", reject);
  });
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || "页面脚本执行失败");
  }
  return result.result.value;
}

const readTheme = `(() => {
  const root = document.querySelector('.desk-root');
  let local = null;
  try { local = localStorage.getItem('blockset.theme'); } catch (e) {}
  return { theme: root ? root.dataset.theme : null, local, buttons: document.querySelectorAll('[data-theme-id]').length };
})()`;

async function main() {
  await waitForChrome();
  const target = await (
    await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })
  ).json();
  const cdp = await connect(target.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Page.navigate", { url: BASE });
  await sleep(6000);

  console.log("初始：", JSON.stringify(await evaluate(cdp, readTheme)));

  await evaluate(cdp, `document.querySelector('.theme-btn').click(); true`);
  await sleep(400);
  const opened = await evaluate(cdp, `document.querySelectorAll('[data-theme-id]').length`);
  console.log(`打开面板后主题按钮数：${opened}`);

  for (const id of ["glass", "tiling", "paper", "clear"]) {
    await evaluate(cdp, `document.querySelector('[data-theme-id="${id}"]').click(); true`);
    await sleep(700);
    const state = await evaluate(cdp, readTheme);
    console.log(`点击 ${id} → theme=${state.theme} local=${state.local}`);
  }

  // 校验 cookie 是否落库（httpOnly，用接口读）
  const cookie = await evaluate(
    cdp,
    `fetch('/api/theme').then(r => r.json()).then(j => JSON.stringify(j.data))`,
  );
  console.log("接口读到的主题：", cookie);

  const shot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  const file = path.join(process.cwd(), "docs", "screenshots", "desktop-theme-panel.png");
  fs.writeFileSync(file, Buffer.from(shot.data, "base64"));

  const errors = cdp.events.filter(
    (e) =>
      e.method === "Runtime.exceptionThrown" ||
      (e.method === "Runtime.consoleAPICalled" && e.params?.type === "error"),
  );
  console.log(`控制台错误：${errors.length ? errors.length : "无"}`);
  console.log(`截图：${file}`);

  const final = await evaluate(cdp, readTheme).catch(() => null);
  cdp.close();
  console.log("最终状态：", JSON.stringify(final));
  process.exitCode = final ? 0 : 1;
}

main()
  .catch((error) => {
    console.error("FAILED:", error);
    process.exitCode = 1;
  })
  .finally(() => setTimeout(() => chrome.kill("SIGKILL"), 400));
