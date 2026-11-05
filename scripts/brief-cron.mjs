#!/usr/bin/env node
/**
 * 每日简报定时生成脚本
 *
 * 用法：
 *   node scripts/brief-cron.mjs           # 自动模式：当天简报新鲜就跳过（30 分钟内 / 热榜未更新）
 *   node scripts/brief-cron.mjs --force   # 强制重新生成
 *
 * 环境变量：
 *   BRIEF_BASE  站点地址，默认 http://127.0.0.1:4310
 *
 * 约定：站点必须正在运行（npm run dev / npm start），脚本只是触发一次 HTTP 请求。
 * 由 Windows 任务计划 / Linux cron / systemd timer 每天调用即可。
 */

const base = (process.env.BRIEF_BASE || "http://127.0.0.1:4310").replace(/\/+$/, "");
const force = process.argv.includes("--force");
const url = `${base}/api/brief${force ? "" : "?auto=1"}`;
const started = Date.now();

try {
  const response = await fetch(url, { method: "POST" });
  const json = await response.json();
  if (!response.ok || !json.ok) {
    console.error(`[brief] 生成失败：HTTP ${response.status} ${json.error ?? ""}`.trim());
    process.exit(1);
  }
  const brief = json.data.brief;
  const skipped = Boolean(json.data.skipped);
  console.log(
    `[brief] ${brief.date} ${skipped ? "已跳过（当天简报仍新鲜）" : "已生成"} · demo=${brief.demo} · model=${brief.model ?? "-"} · ${Date.now() - started}ms`,
  );
  if (json.data.warning) console.warn(`[brief] warning: ${json.data.warning}`);
} catch (error) {
  console.error(`[brief] 请求失败：${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
