/**
 * /town 的浏览器验证：WebGL 是否真的渲染、控制台有无错误、
 * 以及「走到建筑门口 → 出现进入卡片」这条链路是否通。
 *
 * 用法：node scripts/town-check.mjs
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9337;
const BASE = process.env.TOWN_BASE || "http://127.0.0.1:4310";
const OUT_DIR = path.join(process.cwd(), ".tmp");

fs.mkdirSync(OUT_DIR, { recursive: true });

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--no-sandbox",
    "--enable-unsafe-swiftshader",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--hide-scrollbars",
    "--disable-dev-shm-usage",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--disable-frame-rate-limit",
    "--disable-features=CalculateNativeWinOcclusion",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${path.join(OUT_DIR, "town-check-profile")}`,
    "--window-size=1440,900",
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
      // 还没起来
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

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return result.result?.value;
}

async function main() {
  await waitForChrome();
  const { webSocketDebuggerUrl } = await newTarget();
  const cdp = await connect(webSocketDebuggerUrl);

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Log.enable");

  await cdp.send("Page.navigate", { url: `${BASE}/town` });
  await cdp.send("Page.bringToFront");
  await sleep(9000);

  const report = await evaluate(
    cdp,
    `(() => {
      const canvas = document.querySelector('.town-canvas canvas');
      const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
      return {
        canvas: !!canvas,
        size: canvas ? canvas.width + 'x' + canvas.height : null,
        webgl: !!gl,
        loading: !!document.querySelector('.town-loading'),
        listFallback: !!document.querySelector('.town-sheet'),
        hasDebugHook: typeof window.__town === 'object',
        hint: (document.querySelector('.town-hint')||{}).innerText || '',
      };
    })()`,
  );

  const shot1 = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  const file1 = path.join(OUT_DIR, "town-01-scene.png");
  fs.writeFileSync(file1, Buffer.from(shot1.data, "base64"));

  // 先拉近看工坊院子（此时还没有进入卡片挡住画面）
  await evaluate(cdp, `window.__town && window.__town.focusOn(7.5, -26, 3.6)`);
  await sleep(1600);
  const shot3 = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  const file3 = path.join(OUT_DIR, "town-03-focus.png");
  fs.writeFileSync(file3, Buffer.from(shot3.data, "base64"));
  await evaluate(cdp, `window.__town && window.__town.resetView()`);
  await sleep(600);

  await evaluate(cdp, `window.__town && window.__town.goToBuilding('telegraph')`);

  let arrived = { card: false, name: null, label: null };
  let state = null;
  for (let i = 0; i < 90; i += 1) {
    await sleep(1000);
    state = await evaluate(cdp, `window.__town && window.__town.getState()`);
    arrived = await evaluate(
      cdp,
      `(() => {
        const card = document.querySelector('.town-card');
        return {
          card: !!card,
          name: card ? (card.querySelector('.town-card-name')||{}).innerText : null,
          label: card ? (card.querySelector('.town-card-label')||{}).innerText : null,
        };
      })()`,
    );
    if (arrived.card) break;
  }

  // 卡住时把镜头对准人物，方便看它到底被什么挡住
  if (state && !state.arrived) {
    await evaluate(cdp, `window.__town && window.__town.focusOn(${state.x}, ${state.z}, 7)`);
    await sleep(900);
  }

  const shot2 = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  const file2 = path.join(OUT_DIR, "town-02-arrived.png");
  fs.writeFileSync(file2, Buffer.from(shot2.data, "base64"));


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
      return `console.error: ${(e.params.args ?? []).map((a) => a.value ?? a.description).join(" ")}`;
    })
    .slice(0, 8);

  console.log("=== 场景状态 ===");
  console.log(JSON.stringify(report, null, 2));
  console.log("=== 到达门口 ===");
  console.log(JSON.stringify(arrived, null, 2));
  console.log("=== 人物状态 ===");
  console.log(JSON.stringify(state, null, 2));
  console.log("=== 控制台错误 ===");
  console.log(errors.length ? errors.join("\n") : "none");
  console.log("=== 截图 ===");
  console.log(file1);
  console.log(file2);
  console.log(file3);

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
