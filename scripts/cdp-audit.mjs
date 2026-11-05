/**
 * 响应式审计：用 CDP 以移动端视口打开页面，找出导致横向溢出的元素。
 * 用法：node scripts/cdp-audit.mjs / /apps /user/todo
 */
import { spawn } from "node:child_process";
import path from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9334;
const BASE = process.env.SMOKE_BASE || "http://127.0.0.1:4310";
const WIDTH = Number(process.env.AUDIT_WIDTH || 390);
const HEIGHT = Number(process.env.AUDIT_HEIGHT || 844);

const paths = process.argv.slice(2);
if (paths.length === 0) process.exit(1);

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${path.join(process.cwd(), ".tmp", "cdp-audit-profile")}`,
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

async function newTarget() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" });
  return res.json();
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    let seq = 0;
    ws.addEventListener("open", () =>
      resolve({
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
      }
    });
    ws.addEventListener("error", reject);
  });
}

const AUDIT = `(() => {
  const vw = window.innerWidth;
  const doc = document.documentElement;
  const offenders = [];
  for (const el of document.querySelectorAll('body *')) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) continue;
    const style = getComputedStyle(el);
    if (style.position === 'fixed') continue;
    if (rect.right > vw + 1 || rect.left < -1) {
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && typeof el.className === 'string' ? el.className : '').slice(0, 110),
        text: (el.textContent || '').trim().slice(0, 32),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        overflowX: style.overflowX,
      });
    }
  }
  offenders.sort((a, b) => b.right - a.right);
  return JSON.stringify({
    innerWidth: vw,
    scrollWidth: doc.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    offenders: offenders.slice(0, 12),
  });
})()`;

async function main() {
  await waitForChrome();
  const { webSocketDebuggerUrl } = await newTarget();
  const cdp = await connect(webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true });
  await cdp.send("Network.enable");
  await cdp.send("Network.setUserAgentOverride", {
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });

  for (const route of paths) {
    await cdp.send("Page.navigate", { url: `${BASE}${route}` });
    await sleep(4500);
    const result = await cdp.send("Runtime.evaluate", { expression: AUDIT, returnByValue: true });
    const data = JSON.parse(result.result.value);
    console.log(`\n=== ${route} ===`);
    console.log(`viewport=${data.innerWidth} scrollWidth=${data.scrollWidth} bodyScrollWidth=${data.bodyScrollWidth}`);
    if (data.offenders.length === 0) {
      console.log("无横向溢出元素 ✓");
    } else {
      for (const o of data.offenders) {
        console.log(`  [${o.left}..${o.right}] w=${o.width} <${o.tag}> ${o.cls} | ${o.text}`);
      }
    }
  }
  cdp.close();
}

main()
  .catch((error) => {
    console.error("FAILED:", error);
    process.exitCode = 1;
  })
  .finally(() => setTimeout(() => chrome.kill("SIGKILL"), 400));
