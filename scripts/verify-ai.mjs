/**
 * AI 链路验证：真实模式下应返回 X-AI-Demo: 0，且内容是模型生成的。
 * 用法：node scripts/verify-ai.mjs [baseUrl]
 */
const BASE = process.argv[2] || "http://127.0.0.1:4310";

async function readStream(response, maxChars = 600, timeoutMs = 90_000) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  const started = Date.now();
  let firstChunkAt = 0;
  let chunks = 0;

  while (text.length < maxChars) {
    if (Date.now() - started > timeoutMs) {
      await reader.cancel();
      return { text, chunks, firstChunkAt, timedOut: true };
    }
    const { done, value } = await reader.read();
    if (done) break;
    if (!firstChunkAt) firstChunkAt = Date.now() - started;
    chunks += 1;
    text += decoder.decode(value, { stream: true });
  }
  try {
    await reader.cancel();
  } catch {
    /* ignore */
  }
  return { text, chunks, firstChunkAt, timedOut: false };
}

async function chat() {
  const started = Date.now();
  const response = await fetch(`${BASE}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "user", content: "请用一句话自我介绍，并说明你是哪个模型。不要用 Markdown。" },
      ],
    }),
  });
  const demo = response.headers.get("x-ai-demo");
  const model = response.headers.get("x-ai-model");
  const { text, chunks, firstChunkAt } = await readStream(response);
  console.log(`[chat] status=${response.status} X-AI-Demo=${demo} X-AI-Model=${model}`);
  console.log(`[chat] 首块 ${firstChunkAt}ms / 共 ${chunks} 块 / 总耗时 ${Date.now() - started}ms`);
  console.log(`[chat] 回复：${text.replace(/\s+/g, " ").slice(0, 220)}`);
  return { demo, text };
}

async function writing() {
  const response = await fetch(`${BASE}/api/ai/writing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "xiaohongshu",
      topic: "把每周重复的截图压缩工作做成一个网页工具",
      points: "本地计算、不上传、不用注册",
      tone: "轻松",
    }),
  });
  const demo = response.headers.get("x-ai-demo");
  const { text, chunks } = await readStream(response, 400);
  console.log(`\n[writing] status=${response.status} X-AI-Demo=${demo} 分块=${chunks}`);
  console.log(`[writing] 开头：${text.replace(/\s+/g, " ").slice(0, 160)}`);
  return { demo, text };
}

async function image() {
  const response = await fetch(`${BASE}/api/ai/image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "几何色块拼成的工具箱，米白背景，珊瑚与柠檬黄", size: "1:1", style: "flat" }),
  });
  const json = await response.json().catch(() => ({}));
  const demo = response.headers.get("x-ai-demo") ?? String(json?.demo);
  const imageValue = json?.data?.image || json?.image || "";
  console.log(`\n[image] status=${response.status} demo=${demo} model=${json?.data?.model ?? json?.model ?? "-"}`);
  console.log(`[image] 结果类型：${imageValue.startsWith("data:image/svg") ? "程序化 SVG（演示）" : imageValue.startsWith("data:image") ? "base64 位图（真实）" : imageValue.startsWith("http") ? "远程 URL（真实）" : "无图片"}`);
  if (!json?.ok) console.log(`[image] 错误：${json?.error ?? "未知"}`);
  return { demo, ok: json?.ok, imageValue };
}

try {
  const c = await chat();
  const w = await writing();
  const i = await image();

  const chatLive = c.demo === "0" && c.text.trim().length > 10;
  const writingLive = w.demo === "0" && w.text.trim().length > 10;
  const imageLive = String(i.demo) === "0" && Boolean(i.imageValue);

  console.log("\n================ 结论 ================");
  console.log(`对话：${chatLive ? "真实模型 ✅" : "演示模式 ❌"}`);
  console.log(`写作：${writingLive ? "真实模型 ✅" : "演示模式 ❌"}`);
  console.log(`画图：${imageLive ? "真实模型 ✅" : i.ok ? "演示模式（几何 SVG）" : "调用失败 ❌"}`);
  process.exitCode = chatLive ? 0 : 1;
} catch (error) {
  console.error("验证失败：", error);
  process.exitCode = 1;
}
