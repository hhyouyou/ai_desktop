/**
 * 端到端验证 AI 对话：真实浏览器里输入、发送、读回复。
 * 用法：node scripts/cdp-ai.mjs [route]
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9335;
const BASE = process.env.SMOKE_BASE || "http://127.0.0.1:4310";
const ROUTE = process.argv[2] || "/ai/app/chat";
const PROMPT = process.argv[3] || "用一句话说明你能帮我做什么，不要用列表。";

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${path.join(process.cwd(), ".tmp", "cdp-ai-profile")}`,
    "--window-size=1440,1400",
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
    const errors = [];
    let seq = 0;
    ws.addEventListener("open", () =>
      resolve({
        errors,
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
      } else if (
        msg.method === "Runtime.exceptionThrown" ||
        (msg.method === "Runtime.consoleAPICalled" && msg.params?.type === "error")
      ) {
        errors.push(msg.method);
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

const FILL_AND_SEND = `(() => {
  const ta = document.querySelector('textarea[aria-label="消息输入框"]');
  if (!ta) return { ok: false, error: '找不到输入框' };
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(ta, ${JSON.stringify(PROMPT)});
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  const buttons = [...document.querySelectorAll('button')];
  const send = buttons.find((b) => b.textContent.trim() === '发送' && !b.disabled);
  if (!send) return { ok: false, error: '发送按钮不可用（可能是输入未同步）' };
  send.click();
  return { ok: true };
})()`;

const READ_REPLY = `(() => {
  const main = document.querySelector('main');
  const text = (main ? main.innerText : document.body.innerText).replace(/\\s+/g, ' ');
  return text.length;
})()`;

async function main() {
  await waitForChrome();
  const target = await (
    await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })
  ).json();
  const cdp = await connect(target.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Page.navigate", { url: `${BASE}${ROUTE}` });
  await sleep(6000);

  const before = await evaluate(cdp, READ_REPLY);
  console.log(`页面就绪，当前文本长度 ${before}`);

  const sent = await evaluate(cdp, FILL_AND_SEND);
  if (!sent.ok) throw new Error(`发送失败：${sent.error}`);
  console.log(`已填写并点击发送：${PROMPT}`);

  let last = before;
  let stable = 0;
  for (let i = 0; i < 40; i += 1) {
    await sleep(700);
    const len = await evaluate(cdp, READ_REPLY);
    if (len > before + 8 && len === last) stable += 1;
    else stable = 0;
    last = len;
    if (stable >= 2) break;
  }

  const tail = await evaluate(
    cdp,
    `(() => {
      const main = document.querySelector('main');
      const text = (main ? main.innerText : document.body.innerText).replace(/\\s+/g, ' ');
      return text.slice(-700);
    })()`,
  );

  const shot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  const file = path.join(process.cwd(), "docs", "screenshots", "04-ai-chat.png");
  fs.writeFileSync(file, Buffer.from(shot.data, "base64"));

  console.log(`\n回复尾部：…${tail.slice(-420)}`);
  console.log(`\n控制台错误：${cdp.errors.length ? cdp.errors.join(", ") : "无"}`);
  console.log(`截图已更新：${file}`);

  // 助手消息才会带「重新生成」按钮；据此判断回复是否真的渲染出来
  const grew = tail.includes("重新生成");
  console.log(`\n结论：${grew ? "页面内 AI 回复已生成 ✅" : "未检测到新回复 ❌"}`);
  cdp.close();
  process.exitCode = grew ? 0 : 1;
}

main()
  .catch((error) => {
    console.error("FAILED:", error);
    process.exitCode = 1;
  })
  .finally(() => setTimeout(() => chrome.kill("SIGKILL"), 400));
