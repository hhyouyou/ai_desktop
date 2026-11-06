/**
 * 逐个地点验收：把镜头推到每处院落拍特写，再让人物走过去确认寻路可达。
 *
 * 用法：node scripts/town-sites.mjs [id1 id2 ...]
 * 不带参数时跑 SITES 里全部五个新院落。
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9338;
const BASE = process.env.TOWN_BASE || "http://127.0.0.1:4310";
const OUT_DIR = path.join(process.cwd(), ".tmp");

const ALL = [
  { id: "typewriter", x: -11.9, z: -20, zoom: 3.6 },
  { id: "radio", x: 30, z: -27.8, zoom: 3.4 },
  { id: "kiosk", x: -8.6, z: 33, zoom: 3.6 },
  { id: "atelier", x: 26, z: 28.4, zoom: 3.4 },
  { id: "board", x: -15, z: 6.4, zoom: 3.4 },
];

const wanted = process.argv.slice(2);
const sites = wanted.length ? ALL.filter((s) => wanted.includes(s.id)) : ALL;

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
    `--user-data-dir=${path.join(OUT_DIR, "town-sites-profile")}`,
    "--window-size=1440,900",
    "about:blank",
  ],
  { stdio: "ignore" },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function shoot(cdp, name) {
  const shot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  const file = path.join(OUT_DIR, name);
  fs.writeFileSync(file, Buffer.from(shot.data, "base64"));
  return file;
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

  const shootOnly = process.env.SHOTS_ONLY === "1";
  const results = [];

  for (const site of sites) {
    // 先拍院落特写
    await evaluate(cdp, `window.__town && window.__town.resetView()`);
    await sleep(300);
    await evaluate(cdp, `window.__town && window.__town.focusOn(${site.x}, ${site.z}, ${site.zoom})`);
    await sleep(1700);
    const file = await shoot(cdp, `town-site-${site.id}.png`);

    // 再验证能不能走到门口
    let arrived = { card: false, name: null };
    let state = null;
    if (!shootOnly) {
      await evaluate(cdp, `window.__town && window.__town.goToBuilding('${site.id}')`);
      for (let i = 0; i < 110; i += 1) {
        await sleep(900);
        state = await evaluate(cdp, `window.__town && window.__town.getState()`);
        arrived = await evaluate(
          cdp,
          `(() => {
            const card = document.querySelector('.town-card');
            return { card: !!card, name: card ? (card.querySelector('.town-card-name')||{}).innerText : null };
          })()`,
        );
        if (arrived.card) break;
      }
    }

    results.push({
      id: site.id,
      file,
      reached: arrived.card,
      cardName: arrived.name,
      pos: state ? `${state.x.toFixed(1)},${state.z.toFixed(1)}` : null,
      arrivedFlag: state ? state.arrived : null,
    });
    console.log(`[${site.id}] 卡片=${arrived.card} 名称=${arrived.name ?? "-"} 位置=${state ? state.x.toFixed(1) + "," + state.z.toFixed(1) : "-"}`);
  }

  await evaluate(cdp, `window.__town && window.__town.resetView()`);
  await sleep(600);
  const overview = await shoot(cdp, "town-overview.png");

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

  console.log("\n=== 汇总 ===");
  console.log(JSON.stringify(results, null, 2));
  console.log("=== 全景 ===");
  console.log(overview);
  console.log("=== 控制台错误 ===");
  console.log(errors.length ? errors.join("\n") : "none");

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
