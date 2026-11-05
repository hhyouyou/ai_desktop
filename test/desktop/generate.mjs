/**
 * 「在线桌面」方向样张生成器
 * 运行：node test/desktop/generate.mjs
 * 思路：壁纸 + 应用图标 + 窗口 + Dock / 小组件，把工具、AI、待办、热点放进同一个桌面。
 */
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "test", "desktop");
fs.mkdirSync(OUT, { recursive: true });

/* ------------------------------- 图标 ------------------------------- */

const SVG = {
  grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/></svg>`,
  spark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3.2 14.4 9.4 20.6 12l-6.2 2.6L12 20.8 9.6 14.6 3.4 12l6.2-2.6Z"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4.5"/><path d="m7.8 12.3 2.8 2.8 5.6-6"/></svg>`,
  flame: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 21c3.9 0 6.3-2.5 6.3-6 0-4.2-3.9-6-4.6-11.2-2.1 1.6-2.9 3.8-2.9 5.4-1-.5-1.6-1.6-1.8-2.5-2 1.6-3.6 4.3-3.6 8.3C5.4 18.5 8 21 12 21Z"/></svg>`,
  brush: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M14 3.6 20.4 10 12 18.4 5.6 12Z"/><path d="M4 20c3.4 0 4.4-2 4.4-4.4"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.9 1.9M16.6 16.6l1.9 1.9M18.5 5.5l-1.9 1.9M7.4 16.6l-1.9 1.1"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10.8" cy="10.8" r="6.4"/><path d="m15.6 15.6 4.6 4.6"/></svg>`,
};

const ic = (name) => `<span class="ic">${SVG[name]}</span>`;

/* ------------------------------- 内容 ------------------------------- */

const APPS = [
  { name: "工具", icon: "grid", tone: "t-green" },
  { name: "AI 对话", icon: "spark", tone: "t-violet" },
  { name: "待办", icon: "check", tone: "t-blue" },
  { name: "热点", icon: "flame", tone: "t-amber" },
  { name: "画图", icon: "brush", tone: "t-rose" },
  { name: "设置", icon: "settings", tone: "t-slate" },
];

const TOOLS = [
  { name: "图片压缩", hint: "本地处理" },
  { name: "JSON 格式化", hint: "开发" },
  { name: "二维码生成", hint: "Wi-Fi / 名片" },
  { name: "密码生成", hint: "密码学随机" },
];

const TODOS = [
  { text: "回复合作邮件", done: true },
  { text: "提交周报草稿", done: true },
  { text: "复查图片压缩的边界情况", done: false },
  { text: "把热榜接进 AI 简报", done: false },
  { text: "给工具页补移动端断点", done: false },
];

const HOT = [
  { t: "女子每天 2 杯咖啡打喷嚏震断肋骨", h: "128.4 万" },
  { t: "LPL 四队承包 S16 瑞士轮前四场", h: "96.1 万" },
  { t: "何以中国 当惊世界殊", h: "74.2 万" },
  { t: "晚 8 点天猫 iPhone 18 Pro 历史最低价", h: "61.8 万" },
  { t: "AI 编程工具正在重写小团队的分工", h: "52.3 万" },
];

const CHAT = [
  { who: "me", text: "把今天的搜索记录整理成三个待办" },
  { who: "ai", text: "已整理：① 回复合作邮件 ② 提交周报 ③ 复查压缩工具的边界情况" },
  { who: "me", text: "第 2 条拆成子任务" },
  { who: "ai", text: "① 收集本周数据 ② 写三条结论 ③ 周五前发出" },
];

const todosHTML = (cls = "") =>
  TODOS.map(
    (item) =>
      `<li class="todo ${item.done ? "done" : ""} ${cls}"><span class="box">${item.done ? "✓" : ""}</span><span class="todo-text">${item.text}</span></li>`,
  ).join("");

const hotHTML = () =>
  HOT.map(
    (item, i) =>
      `<li class="hot-item"><span class="hot-i">${i + 1}</span><span class="hot-t">${item.t}</span><span class="hot-h">${item.h}</span></li>`,
  ).join("");

const chatHTML = () =>
  CHAT.map(
    (m) => `<div class="msg ${m.who}">${m.who === "ai" ? '<span class="who">块集 AI</span>' : ""}${m.text}</div>`,
  ).join("");

const toolsHTML = () =>
  TOOLS.map(
    (tool) => `<button class="tool"><span class="tool-name">${tool.name}</span><span class="tool-hint">${tool.hint}</span></button>`,
  ).join("");

const appsHTML = () =>
  APPS.map(
    (app) => `<button class="app"><span class="app-ic ${app.tone}">${ic(app.icon)}</span><span class="app-name">${app.name}</span></button>`,
  ).join("");

const dockHTML = () =>
  APPS.map((app) => `<button class="dock-ic ${app.tone}" title="${app.name}">${ic(app.icon)}</button>`).join("");

const railHTML = () =>
  APPS.map(
    (app) => `<button class="rail-app" title="${app.name}"><span class="rail-ic ${app.tone}">${ic(app.icon)}</span><span class="rail-name">${app.name}</span></button>`,
  ).join("");

/* --------------------------- 通用桌面外壳（3 套变体） --------------------------- */

const shell = ({ title, slogan, themeClass, supportLine }) => `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>块集 · ${title}</title>
<style>__CSS__</style></head>
<body class="shell ${themeClass}">
  <div class="wallpaper" aria-hidden="true"></div>
  <header class="bar">
    <div class="bar-left"><span class="logo"></span><span class="wordmark">块集</span><span class="wm-en">BLOCKSET</span></div>
    <nav class="bar-nav"><a class="on">桌面</a><a>工具</a><a>AI</a><a>待办</a><a>热点</a></nav>
    <div class="bar-right">
      <span class="bar-search">${ic("search")}<span>搜索或 ⌘K</span></span>
      <span class="bar-clock">09:41</span>
      <span class="bar-avatar">Q</span>
    </div>
  </header>

  <main class="desk">
    <aside class="rail">${railHTML()}</aside>

    <section class="stage">
      <p class="slogan">${slogan}</p>
      <article class="win win-chat">
        <header class="win-bar">
          <span class="lights"><i></i><i></i><i></i></span>
          <span class="win-title">AI 对话</span>
          <span class="win-meta">DeepSeek · 已保存 3 个会话</span>
        </header>
        <div class="chat-body">
          <aside class="chat-side">
            <p class="side-label">最近会话</p>
            <button class="conv on">整理今天的记录</button>
            <button class="conv">周报提纲</button>
            <button class="conv">压缩参数怎么调</button>
            <p class="side-label">模型</p>
            <span class="model-chip">DeepSeek</span>
            <span class="model-chip">通义千问</span>
          </aside>
          <div class="chat-main">
            <div class="chat-scroll">${chatHTML()}</div>
            <div class="composer"><span>继续追问，或粘贴一段要处理的文字…</span><kbd>↵</kbd></div>
          </div>
        </div>
      </article>

      <article class="win win-todo">
        <header class="win-bar"><span class="lights"><i></i><i></i><i></i></span><span class="win-title">待办</span><span class="win-meta">今天 · 2/5</span></header>
        <div class="todo-body">
          <div class="progress"><span class="progress-fill"></span></div>
          <ul class="todo-list">${todosHTML()}</ul>
          <div class="todo-add"><span>＋ 添加待办（回车）</span></div>
        </div>
      </article>

      <article class="win win-tools">
        <header class="win-bar"><span class="lights"><i></i><i></i><i></i></span><span class="win-title">常用工具</span><span class="win-meta">14 款</span></header>
        <div class="tool-row">${toolsHTML()}</div>
      </article>
    </section>

    <aside class="widgets">
      <div class="wgt wgt-clock">
        <p class="wgt-label">今天</p>
        <p class="wgt-time">09:41</p>
        <p class="wgt-sub">10 月 20 日 · 周二</p>
      </div>
      <div class="wgt wgt-hot">
        <div class="wgt-head"><p class="wgt-label">今日热点</p><span class="wgt-live">实时 8/8</span></div>
        <ol class="hot-list">${hotHTML()}</ol>
      </div>
      <div class="wgt wgt-slogan">
        <p class="wgt-label">${supportLine}</p>
        <p class="wgt-text">工具、AI、待办、热点，都在这一屏。</p>
      </div>
    </aside>
  </main>

  <footer class="dock">${dockHTML()}</footer>
</body></html>`;

/* --------------------------------- 主题 --------------------------------- */

const clearCSS = `/* 01 清爽桌面：浅色渐变壁纸 + 白窗口 + 底部 Dock */
*{box-sizing:border-box}
body.shell{margin:0;height:100vh;overflow:hidden;font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif;color:#1b2330;
  --ink:#1b2330;--muted:#69748a;--line:rgba(20,32,60,.09);--card:rgba(255,255,255,.86);--accent:#3b6ef6;--ok:#12a97b;
  display:flex;flex-direction:column}
.wallpaper{position:fixed;inset:0;z-index:-2;background:
  radial-gradient(900px 520px at 18% 8%,#dbeafe 0%,transparent 60%),
  radial-gradient(760px 460px at 82% 12%,#e8e4ff 0%,transparent 62%),
  radial-gradient(900px 700px at 60% 100%,#d6f6ef 0%,transparent 65%),
  linear-gradient(180deg,#f7f9ff,#eef2fb)}
.wallpaper::after{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(20,32,60,.05) 1px,transparent 1px);background-size:22px 22px}
.bar{display:flex;align-items:center;gap:22px;padding:10px 22px;background:rgba(255,255,255,.72);backdrop-filter:blur(18px);border-bottom:1px solid var(--line);font-size:13px}
.bar-left{display:flex;align-items:center;gap:8px}
.logo{width:22px;height:22px;border-radius:7px;background:var(--ink);position:relative}
.logo::after{content:"";position:absolute;inset:6px;border-radius:3px;background:#fff;opacity:.9}
.wordmark{font-weight:700;letter-spacing:.01em}
.wm-en{font-size:9px;letter-spacing:.18em;color:var(--muted)}
.bar-nav{display:flex;gap:2px;margin-left:6px}
.bar-nav a{color:var(--muted);padding:6px 11px;border-radius:8px;cursor:default}
.bar-nav a.on{background:rgba(27,35,48,.07);color:var(--ink);font-weight:600}
.bar-right{margin-left:auto;display:flex;align-items:center;gap:12px}
.bar-search{display:flex;align-items:center;gap:7px;color:var(--muted);background:rgba(255,255,255,.7);border:1px solid var(--line);padding:6px 12px;border-radius:9px}
.bar-search .ic svg{width:14px;height:14px}
.bar-clock{font-variant-numeric:tabular-nums;font-weight:600}
.bar-avatar{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#3b6ef6,#7c9bff);color:#fff;display:grid;place-items:center;font-size:12px;font-weight:700}
.desk{flex:1;display:grid;grid-template-columns:96px minmax(0,1fr) 296px;gap:16px;padding:16px 22px 84px;min-height:0}
.rail{display:flex;flex-direction:column;gap:10px;align-items:center;padding-top:6px}
.rail-app{background:none;border:0;display:flex;flex-direction:column;align-items:center;gap:5px;cursor:default}
.rail-ic{width:44px;height:44px;border-radius:13px;display:grid;place-items:center;color:#fff;box-shadow:0 8px 18px rgba(20,40,90,.18)}
.rail-ic .ic svg{width:21px;height:21px}
.rail-name{font-size:10.5px;color:var(--muted)}
.t-green{background:linear-gradient(150deg,#34d399,#0f9f78)}
.t-violet{background:linear-gradient(150deg,#8b7cf6,#5b4bdc)}
.t-blue{background:linear-gradient(150deg,#4f8cff,#2f63e0)}
.t-amber{background:linear-gradient(150deg,#fbbf24,#f08a1d)}
.t-rose{background:linear-gradient(150deg,#fb7ba8,#e0457b)}
.t-slate{background:linear-gradient(150deg,#94a3b8,#5b6b83)}
.stage{position:relative;display:grid;grid-template-columns:1.16fr .84fr;grid-template-rows:auto auto 1fr;gap:14px;align-content:start;min-height:0}
.slogan{grid-column:1/-1;margin:2px 0 2px;font-size:15px;font-weight:600;color:#3a4763}
.slogan::after{content:"";display:block;width:36px;height:2px;background:var(--accent);margin-top:8px;border-radius:2px}
.win{background:var(--card);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.8);border-radius:16px;box-shadow:0 24px 60px rgba(24,40,80,.14),0 2px 6px rgba(24,40,80,.05);overflow:hidden;display:flex;flex-direction:column;min-height:0}
.win-chat{grid-column:1;grid-row:2;height:430px}
.win-todo{grid-column:2;grid-row:2;height:430px}
.win-tools{grid-column:1/-1;grid-row:3;align-self:start;min-height:0}
.win-bar{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--line);background:rgba(255,255,255,.5)}
.lights{display:flex;gap:5px}
.lights i{width:9px;height:9px;border-radius:50%;background:#d8dee9}
.lights i:nth-child(1){background:#ff8f8f}.lights i:nth-child(2){background:#ffd48f}.lights i:nth-child(3){background:#8fe0a8}
.win-title{font-size:12.5px;font-weight:700}
.win-meta{margin-left:auto;font-size:10.5px;color:var(--muted)}
.chat-body{display:grid;grid-template-columns:150px 1fr;min-height:0;flex:1}
.chat-side{border-right:1px solid var(--line);padding:12px 10px;display:flex;flex-direction:column;gap:6px;background:rgba(248,250,255,.5)}
.side-label{margin:6px 0 2px;font-size:10px;color:var(--muted);letter-spacing:.08em}
.conv{border:0;background:none;text-align:left;font-size:11.5px;color:#3a4763;padding:6px 8px;border-radius:8px;cursor:default}
.conv.on{background:#fff;box-shadow:0 1px 3px rgba(20,40,90,.1);font-weight:600}
.model-chip{font-size:10px;color:var(--muted);border:1px solid var(--line);border-radius:7px;padding:3px 7px;margin-right:4px}
.chat-main{display:flex;flex-direction:column;min-height:0}
.chat-scroll{flex:1;padding:14px 16px;overflow:hidden;display:flex;flex-direction:column;gap:9px}
.msg{font-size:12.5px;line-height:1.65;padding:9px 12px;border-radius:12px;max-width:88%}
.msg.me{align-self:flex-end;background:var(--accent);color:#fff;border-bottom-right-radius:4px}
.msg.ai{align-self:flex-start;background:#f2f5fb;border:1px solid var(--line);border-bottom-left-radius:4px}
.who{display:block;font-size:10px;color:var(--muted);margin-bottom:3px;font-weight:700}
.composer{display:flex;align-items:center;gap:10px;margin:0 14px 14px;padding:9px 12px;border:1px solid var(--line);border-radius:10px;background:#fff;font-size:11.5px;color:#93a0b4}
.composer kbd{margin-left:auto;font-size:10px;border:1px solid var(--line);border-radius:5px;padding:1px 5px;color:var(--muted)}
.todo-body{padding:12px 14px;display:flex;flex-direction:column;gap:10px}
.progress{height:4px;border-radius:4px;background:#e8edf7;overflow:hidden}
.progress-fill{display:block;height:100%;width:40%;background:var(--ok);border-radius:4px}
.todo-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px}
.todo{display:flex;gap:9px;align-items:flex-start;font-size:12px;line-height:1.5}
.todo .box{width:15px;height:15px;border-radius:5px;border:1.5px solid #c7d0e0;display:grid;place-items:center;font-size:9px;color:#fff;flex-shrink:0;margin-top:1px}
.todo.done .box{background:var(--ok);border-color:var(--ok)}
.todo.done .todo-text{color:#9aa6ba;text-decoration:line-through}
.todo-add{font-size:11.5px;color:#9aa6ba;border-top:1px dashed var(--line);padding-top:9px}
.tool-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:12px 14px}
.tool{display:flex;flex-direction:column;gap:3px;align-items:flex-start;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:#fbfcff;cursor:default}
.tool-name{font-size:12px;font-weight:600}
.tool-hint{font-size:10.5px;color:var(--muted)}
.widgets{display:flex;flex-direction:column;gap:12px;min-height:0;overflow:hidden}
.wgt{background:var(--card);backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.8);border-radius:16px;box-shadow:0 18px 44px rgba(24,40,80,.1);padding:14px}
.wgt-label{margin:0;font-size:10.5px;letter-spacing:.1em;color:var(--muted)}
.wgt-time{margin:6px 0 0;font-size:34px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.wgt-sub{margin:2px 0 0;font-size:11px;color:var(--muted)}
.wgt-head{display:flex;align-items:baseline;justify-content:space-between}
.wgt-live{font-size:10px;color:var(--ok)}
.hot-list{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}
.hot-item{display:grid;grid-template-columns:16px 1fr auto;gap:8px;align-items:baseline;font-size:11.5px;line-height:1.35}
.hot-i{font-size:10px;font-weight:700;color:var(--accent)}
.hot-t{color:#2c3850}
.hot-h{font-size:10px;color:var(--muted)}
.wgt-slogan p:last-child{margin:6px 0 0;font-size:12px;line-height:1.6;color:#2c3850}
.dock{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);display:flex;gap:12px;padding:10px 14px;border-radius:20px;
  background:rgba(255,255,255,.66);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.9);box-shadow:0 20px 50px rgba(24,40,80,.18)}
.dock-ic{width:40px;height:40px;border-radius:12px;border:0;display:grid;place-items:center;color:#fff;cursor:default;box-shadow:0 6px 14px rgba(20,40,90,.16)}
.dock-ic .ic svg{width:19px;height:19px}
.ic svg{width:20px;height:20px;display:block}
@media (max-width:1180px){.desk{grid-template-columns:76px 1fr}.widgets{display:none}.stage{grid-template-columns:1fr}.win-chat,.win-todo{grid-column:1;grid-row:auto;height:auto}.win-tools{grid-column:1;grid-row:auto}}
@media (max-width:820px){.bar-nav,.bar-search{display:none}.desk{grid-template-columns:1fr;padding-bottom:96px}.rail{display:none}.chat-side{display:none}.chat-body{grid-template-columns:1fr}.win-chat{height:360px}}`;

const glassCSS = `/* 02 毛玻璃桌面：深色壁纸 + 半透明窗口 + 居中 Dock */
*{box-sizing:border-box}
body.shell{margin:0;height:100vh;overflow:hidden;font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif;color:#eef2ff;
  --ink:#eef2ff;--muted:#94a3c4;--line:rgba(255,255,255,.14);--card:rgba(255,255,255,.09);--accent:#8ab4ff;--ok:#6ee7b7;
  display:flex;flex-direction:column}
.wallpaper{position:fixed;inset:0;z-index:-2;background:
  radial-gradient(720px 520px at 12% 10%,#3b2b6b 0%,transparent 62%),
  radial-gradient(680px 520px at 88% 18%,#123c5a 0%,transparent 60%),
  radial-gradient(760px 620px at 52% 100%,#1c2a4d 0%,transparent 66%),
  linear-gradient(160deg,#0b1020,#131a2e 55%,#0d1424)}
.wallpaper::after{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:44px 44px;mask-image:radial-gradient(circle at 50% 40%,#000 20%,transparent 78%)}
.bar{display:flex;align-items:center;gap:22px;padding:9px 22px;background:rgba(12,18,32,.42);backdrop-filter:blur(22px);border-bottom:1px solid var(--line);font-size:12.5px}
.bar-left{display:flex;align-items:center;gap:8px}
.logo{width:20px;height:20px;border-radius:6px;background:linear-gradient(135deg,#8ab4ff,#b79cff)}
.wordmark{font-weight:600}
.wm-en{font-size:9px;letter-spacing:.2em;color:var(--muted)}
.bar-nav{display:flex;gap:2px;margin-left:8px}
.bar-nav a{color:var(--muted);padding:6px 11px;border-radius:8px;cursor:default}
.bar-nav a.on{background:rgba(255,255,255,.12);color:#fff}
.bar-right{margin-left:auto;display:flex;align-items:center;gap:12px}
.bar-search{display:flex;align-items:center;gap:7px;color:var(--muted);background:rgba(255,255,255,.08);border:1px solid var(--line);padding:5px 11px;border-radius:8px}
.bar-search .ic svg{width:14px;height:14px}
.bar-clock{font-variant-numeric:tabular-nums;color:#fff}
.bar-avatar{width:25px;height:25px;border-radius:50%;background:linear-gradient(135deg,#8ab4ff,#b79cff);color:#0b1020;display:grid;place-items:center;font-size:11px;font-weight:800}
.desk{flex:1;display:grid;grid-template-columns:88px minmax(0,1fr) 290px;gap:16px;padding:16px 22px 96px;min-height:0}
.rail{display:flex;flex-direction:column;gap:9px;align-items:center;padding-top:4px}
.rail-app{background:none;border:0;display:flex;flex-direction:column;align-items:center;gap:5px;cursor:default}
.rail-ic{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;color:#fff;background:rgba(255,255,255,.1);border:1px solid var(--line);backdrop-filter:blur(12px)}
.rail-ic .ic svg{width:20px;height:20px}
.rail-name{font-size:10px;color:var(--muted)}
.t-green{color:#6ee7b7}.t-violet{color:#c4b5fd}.t-blue{color:#93c5fd}.t-amber{color:#fcd34d}.t-rose{color:#fda4c6}.t-slate{color:#cbd5e1}
.stage{position:relative;display:grid;grid-template-columns:1.16fr .84fr;grid-template-rows:auto auto 1fr;gap:14px;align-content:start;min-height:0}
.slogan{grid-column:1/-1;margin:2px 0;font-size:15px;font-weight:600;color:#dfe8ff}
.slogan::after{content:"";display:block;width:36px;height:2px;background:var(--accent);margin-top:8px}
.win{background:var(--card);backdrop-filter:blur(24px);border:1px solid var(--line);border-radius:18px;box-shadow:0 30px 70px rgba(0,0,0,.4);overflow:hidden;display:flex;flex-direction:column;min-height:0}
.win-chat{grid-column:1;grid-row:2;height:430px}
.win-todo{grid-column:2;grid-row:2;height:430px}
.win-tools{grid-column:1/-1;grid-row:3;align-self:start;min-height:0}
.win-bar{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--line);background:rgba(255,255,255,.04)}
.lights{display:flex;gap:5px}.lights i{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.2)}
.lights i:nth-child(1){background:#ff8f8f}.lights i:nth-child(2){background:#ffd48f}.lights i:nth-child(3){background:#8fe0a8}
.win-title{font-size:12.5px;font-weight:600}
.win-meta{margin-left:auto;font-size:10.5px;color:var(--muted)}
.chat-body{display:grid;grid-template-columns:148px 1fr;flex:1;min-height:0}
.chat-side{border-right:1px solid var(--line);padding:12px 10px;display:flex;flex-direction:column;gap:6px;background:rgba(255,255,255,.03)}
.side-label{margin:6px 0 2px;font-size:10px;color:var(--muted);letter-spacing:.08em}
.conv{border:0;background:none;text-align:left;font-size:11.5px;color:#c7d2e8;padding:6px 8px;border-radius:8px;cursor:default}
.conv.on{background:rgba(255,255,255,.1)}
.model-chip{font-size:10px;color:var(--muted);border:1px solid var(--line);border-radius:7px;padding:3px 7px;margin-right:4px}
.chat-main{display:flex;flex-direction:column;min-height:0}
.chat-scroll{flex:1;padding:14px 16px;overflow:hidden;display:flex;flex-direction:column;gap:9px}
.msg{font-size:12.5px;line-height:1.65;padding:9px 12px;border-radius:12px;max-width:88%}
.msg.me{align-self:flex-end;background:rgba(138,180,255,.24);border:1px solid rgba(138,180,255,.34);border-bottom-right-radius:4px;color:#eaf1ff}
.msg.ai{align-self:flex-start;background:rgba(255,255,255,.07);border:1px solid var(--line);border-bottom-left-radius:4px}
.who{display:block;font-size:10px;color:var(--muted);margin-bottom:3px}
.composer{display:flex;align-items:center;gap:10px;margin:0 14px 14px;padding:9px 12px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.05);font-size:11.5px;color:var(--muted)}
.composer kbd{margin-left:auto;font-size:10px;border:1px solid var(--line);border-radius:5px;padding:1px 5px}
.todo-body{padding:12px 14px;display:flex;flex-direction:column;gap:10px}
.progress{height:4px;border-radius:4px;background:rgba(255,255,255,.1);overflow:hidden}
.progress-fill{display:block;height:100%;width:40%;background:var(--ok);border-radius:4px}
.todo-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px}
.todo{display:flex;gap:9px;align-items:flex-start;font-size:12px;line-height:1.5;color:#dbe4f7}
.todo .box{width:15px;height:15px;border-radius:5px;border:1.5px solid rgba(255,255,255,.24);display:grid;place-items:center;font-size:9px;color:#04120b;flex-shrink:0;margin-top:1px}
.todo.done .box{background:var(--ok);border-color:var(--ok)}
.todo.done .todo-text{color:var(--muted);text-decoration:line-through}
.todo-add{font-size:11.5px;color:var(--muted);border-top:1px dashed var(--line);padding-top:9px}
.tool-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:12px 14px}
.tool{display:flex;flex-direction:column;gap:3px;align-items:flex-start;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,.05);cursor:default;color:#e6ecfa}
.tool-name{font-size:12px;font-weight:600}
.tool-hint{font-size:10.5px;color:var(--muted)}
.widgets{display:flex;flex-direction:column;gap:12px;min-height:0;overflow:hidden}
.wgt{background:var(--card);backdrop-filter:blur(20px);border:1px solid var(--line);border-radius:18px;padding:14px;box-shadow:0 24px 60px rgba(0,0,0,.32)}
.wgt-label{margin:0;font-size:10.5px;letter-spacing:.1em;color:var(--muted)}
.wgt-time{margin:6px 0 0;font-size:34px;font-weight:600;font-variant-numeric:tabular-nums}
.wgt-sub{margin:2px 0 0;font-size:11px;color:var(--muted)}
.wgt-head{display:flex;align-items:baseline;justify-content:space-between}
.wgt-live{font-size:10px;color:var(--ok)}
.hot-list{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}
.hot-item{display:grid;grid-template-columns:16px 1fr auto;gap:8px;align-items:baseline;font-size:11.5px;line-height:1.35}
.hot-i{font-size:10px;font-weight:700;color:var(--accent)}
.hot-t{color:#dbe4f7}
.hot-h{font-size:10px;color:var(--muted)}
.wgt-slogan p:last-child{margin:6px 0 0;font-size:12px;line-height:1.6;color:#dbe4f7}
.dock{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);display:flex;gap:12px;padding:10px 14px;border-radius:20px;
  background:rgba(20,28,48,.55);backdrop-filter:blur(24px);border:1px solid var(--line);box-shadow:0 24px 60px rgba(0,0,0,.5)}
.dock-ic{width:40px;height:40px;border-radius:12px;border:1px solid var(--line);background:rgba(255,255,255,.08);display:grid;place-items:center;cursor:default}
.dock-ic .ic svg{width:19px;height:19px}
.ic svg{width:20px;height:20px;display:block}
@media (max-width:1180px){.desk{grid-template-columns:72px 1fr}.widgets{display:none}.stage{grid-template-columns:1fr}.win-chat,.win-todo{grid-column:1;grid-row:auto;height:auto}.win-tools{grid-column:1;grid-row:auto}}
@media (max-width:820px){.bar-nav,.bar-search{display:none}.desk{grid-template-columns:1fr;padding-bottom:96px}.rail{display:none}.chat-side{display:none}.chat-body{grid-template-columns:1fr}.win-chat{height:360px}}`;

const minimalCSS = `/* 03 极简工作台：近白底 + 细边框面板 + 单一强调色 */
*{box-sizing:border-box}
body.shell{margin:0;height:100vh;overflow:hidden;background:#fbfbfa;color:#14161a;font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif;
  --ink:#14161a;--muted:#777d87;--line:#e8e8e4;--accent:#0f766e;--ok:#0f766e;display:flex;flex-direction:column}
.wallpaper{display:none}
.bar{display:flex;align-items:center;gap:24px;padding:14px 28px;border-bottom:1px solid var(--line);background:#fff;font-size:13px}
.bar-left{display:flex;align-items:center;gap:9px}
.logo{width:20px;height:20px;border:2px solid var(--ink);border-radius:5px}
.wordmark{font-weight:650}
.wm-en{font-size:9px;letter-spacing:.18em;color:var(--muted)}
.bar-nav{display:flex;gap:18px;margin-left:12px}
.bar-nav a{color:var(--muted);cursor:default}
.bar-nav a.on{color:var(--ink);font-weight:600;border-bottom:2px solid var(--accent);padding-bottom:3px}
.bar-right{margin-left:auto;display:flex;align-items:center;gap:14px;color:var(--muted);font-size:12px}
.bar-search{display:flex;align-items:center;gap:6px;border:1px solid var(--line);padding:5px 10px;border-radius:6px}
.bar-search .ic svg{width:13px;height:13px}
.bar-avatar{width:24px;height:24px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;font-size:11px}
.desk{flex:1;display:grid;grid-template-columns:76px minmax(0,1fr) 280px;gap:0;min-height:0;padding:0}
.rail{border-right:1px solid var(--line);padding:18px 0;display:flex;flex-direction:column;align-items:center;gap:14px;background:#fff}
.rail-app{background:none;border:0;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:default}
.rail-ic{width:34px;height:34px;border:1px solid var(--line);border-radius:9px;display:grid;place-items:center;color:var(--ink)}
.rail-ic .ic svg{width:17px;height:17px}
.rail-name{font-size:9.5px;color:var(--muted)}
.t-green,.t-violet,.t-blue,.t-amber,.t-rose,.t-slate{color:var(--ink)}
.stage{display:grid;grid-template-columns:1.18fr .82fr;grid-template-rows:auto auto 1fr;gap:18px;padding:26px 26px 96px;align-content:start;min-height:0}
.slogan{grid-column:1/-1;margin:0 0 6px;font-size:22px;font-weight:650;letter-spacing:-.01em}
.slogan::after{content:"";display:block;width:28px;height:2px;background:var(--accent);margin-top:12px}
.win{background:#fff;border:1px solid var(--line);border-radius:6px;overflow:hidden;display:flex;flex-direction:column;min-height:0}
.win-chat{grid-column:1;grid-row:2;height:420px}
.win-todo{grid-column:2;grid-row:2;height:420px}
.win-tools{grid-column:1/-1;grid-row:3;align-self:start;min-height:0}
.win-bar{display:flex;align-items:center;gap:12px;padding:11px 16px;border-bottom:1px solid var(--line)}
.lights{display:none}
.win-title{font-size:12px;font-weight:650;letter-spacing:.02em;text-transform:uppercase}
.win-meta{margin-left:auto;font-size:10.5px;color:var(--muted)}
.chat-body{display:grid;grid-template-columns:142px 1fr;flex:1;min-height:0}
.chat-side{border-right:1px solid var(--line);padding:12px 10px;display:flex;flex-direction:column;gap:4px}
.side-label{margin:6px 0 2px;font-size:9.5px;color:var(--muted);letter-spacing:.1em;text-transform:uppercase}
.conv{border:0;background:none;text-align:left;font-size:11.5px;color:var(--muted);padding:6px 6px;cursor:default;border-left:2px solid transparent}
.conv.on{color:var(--ink);border-left-color:var(--accent);font-weight:600}
.model-chip{font-size:10px;color:var(--muted);border:1px solid var(--line);border-radius:4px;padding:2px 6px;margin-right:4px}
.chat-main{display:flex;flex-direction:column;min-height:0}
.chat-scroll{flex:1;padding:14px 16px;overflow:hidden;display:flex;flex-direction:column;gap:8px}
.msg{font-size:12.5px;line-height:1.65;padding:8px 11px;border-radius:4px;max-width:90%}
.msg.me{align-self:flex-end;background:var(--ink);color:#fff}
.msg.ai{align-self:flex-start;background:#f7f7f5;border:1px solid var(--line)}
.who{display:block;font-size:9.5px;color:var(--muted);margin-bottom:3px;letter-spacing:.06em}
.composer{display:flex;align-items:center;gap:10px;margin:0 14px 14px;padding:9px 11px;border:1px solid var(--line);border-radius:4px;font-size:11.5px;color:var(--muted)}
.composer kbd{margin-left:auto;font-size:10px;border:1px solid var(--line);border-radius:3px;padding:1px 5px}
.todo-body{padding:14px 16px;display:flex;flex-direction:column;gap:12px}
.progress{height:2px;background:#efefec}
.progress-fill{display:block;height:100%;width:40%;background:var(--ok)}
.todo-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.todo{display:flex;gap:9px;align-items:flex-start;font-size:12px;line-height:1.5}
.todo .box{width:14px;height:14px;border:1px solid #cfcfc9;display:grid;place-items:center;font-size:9px;color:#fff;flex-shrink:0;margin-top:2px}
.todo.done .box{background:var(--ok);border-color:var(--ok)}
.todo.done .todo-text{color:#9a9a93;text-decoration:line-through}
.todo-add{font-size:11.5px;color:#9a9a93;border-top:1px dashed var(--line);padding-top:10px}
.tool-row{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-top:0}
.tool{display:flex;flex-direction:column;gap:4px;align-items:flex-start;padding:14px 16px;border:0;border-right:1px solid var(--line);background:none;cursor:default;text-align:left}
.tool:last-child{border-right:0}
.tool-name{font-size:12px;font-weight:600}
.tool-hint{font-size:10.5px;color:var(--muted)}
.widgets{border-left:1px solid var(--line);padding:26px 20px;display:flex;flex-direction:column;gap:24px;background:#fff;min-height:0;overflow:hidden}
.wgt{padding:0;border:0;border-radius:0;background:none;box-shadow:none}
.wgt-label{margin:0;font-size:9.5px;letter-spacing:.12em;color:var(--muted);text-transform:uppercase}
.wgt-time{margin:6px 0 0;font-size:30px;font-weight:650;font-variant-numeric:tabular-nums}
.wgt-sub{margin:2px 0 0;font-size:11px;color:var(--muted)}
.wgt-head{display:flex;align-items:baseline;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:7px}
.wgt-live{font-size:10px;color:var(--accent)}
.hot-list{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column;gap:9px}
.hot-item{display:grid;grid-template-columns:16px 1fr;gap:8px;font-size:11.5px;line-height:1.4}
.hot-i{font-size:10px;color:var(--muted);font-variant-numeric:tabular-nums}
.hot-t{color:#2a2d33}
.hot-h{display:none}
.wgt-slogan p:last-child{margin:6px 0 0;font-size:11.5px;line-height:1.7;color:var(--muted)}
.dock{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);display:flex;gap:10px;padding:8px 12px;border:1px solid var(--line);border-radius:6px;background:#fff;box-shadow:0 12px 30px rgba(20,24,30,.08)}
.dock-ic{width:34px;height:34px;border:1px solid var(--line);border-radius:5px;background:#fff;display:grid;place-items:center;color:var(--ink);cursor:default}
.dock-ic .ic svg{width:17px;height:17px}
.ic svg{width:20px;height:20px;display:block}
@media (max-width:1180px){.desk{grid-template-columns:64px 1fr}.widgets{display:none}.stage{grid-template-columns:1fr}.win-chat,.win-todo{grid-column:1;grid-row:auto;height:auto}.win-tools{grid-column:1;grid-row:auto}}
@media (max-width:820px){.bar-nav,.bar-search{display:none}.desk{grid-template-columns:1fr}.rail{display:none}.chat-side{display:none}.chat-body{grid-template-columns:1fr}.stage{padding:18px 18px 90px}.win-chat{height:340px}}`;

/* ------------------------------ 平铺工作台 ------------------------------ */

const tiling = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>块集 · 平铺工作台</title>
<style>
*{box-sizing:border-box}
body{margin:0;height:100vh;overflow:hidden;background:#0f1215;color:#d7dee6;font-family:"Cascadia Code","JetBrains Mono",Consolas,"PingFang SC",monospace;font-size:12px}
.tbar{display:flex;align-items:center;gap:8px;height:40px;padding:0 12px;border-bottom:1px solid #23292f;background:#12161a;font-size:11.5px}
.tbar .brand{color:#ffb454;font-weight:700;letter-spacing:.02em}
.tbar .brand span{color:#5b6874;font-weight:400}
.tabs{display:flex;gap:6px;margin-left:14px}
.tab{padding:4px 10px;border:1px solid #23292f;color:#8b98a5;border-radius:3px}
.tab.on{background:#1b222a;color:#e6edf3;border-color:#2f3944}
.tbar .right{margin-left:auto;display:flex;gap:14px;color:#5b6874}
.tbar .right b{color:#9fb0c0;font-weight:500}
.grid{height:calc(100vh - 40px - 26px);display:grid;grid-template-columns:1.25fr .75fr;grid-template-rows:1fr 1fr;gap:2px;background:#23292f;padding:2px}
.pane{background:#12161a;display:flex;flex-direction:column;min-height:0;overflow:hidden}
.pane-head{display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid #23292f;background:#151a1f;font-size:11px;color:#8b98a5}
.pane-head .idx{color:#ffb454}
.pane-head .t{color:#d7dee6;letter-spacing:.04em}
.pane-head .meta{margin-left:auto;color:#5b6874;font-size:10.5px}
.pane-body{padding:12px;overflow:hidden;flex:1;min-height:0;display:flex;flex-direction:column}
.pane-sub{margin:14px 0 8px;font-size:10px;letter-spacing:.12em;color:#5b6874}
.recent{display:flex;flex-direction:column;gap:6px;font-size:11.5px;color:#8b98a5}
.recent span{display:flex;justify-content:space-between;border-bottom:1px dashed #1f262d;padding-bottom:6px}
.tool-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.tool{padding:12px;min-height:64px;background:#151a1f;border:1px solid #23292f;display:flex;flex-direction:column;gap:3px;justify-content:center}
.tool-name{color:#e6edf3;font-size:12px}
.tool-hint{color:#5b6874;font-size:10.5px}
.chat{display:flex;flex-direction:column;gap:8px;height:100%}
.msg{font-size:11.5px;line-height:1.7;color:#b8c4d0}
.msg .k{color:#ffb454}
.msg.me .k{color:#7dd3fc}
.msg .b{color:#e6edf3}
.msg .lbl{color:#5b6874;font-size:10px}
.composer{margin-top:auto;border:1px solid #23292f;background:#0d1114;padding:7px 9px;color:#4b5762;display:flex;justify-content:space-between}
.composer kbd{color:#8b98a5;border:1px solid #23292f;padding:0 4px;border-radius:2px;font-size:10px}
.todo{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.todo li{display:flex;gap:8px;align-items:flex-start;line-height:1.5;color:#b8c4d0}
.todo .box{width:12px;height:12px;border:1px solid #3a4652;margin-top:3px;flex-shrink:0;text-align:center;line-height:10px;font-size:9px;color:#0f1215}
.todo li.done .box{background:#6ee7a8;border-color:#6ee7a8}
.todo li.done{color:#5b6874;text-decoration:line-through}
.todo .add{color:#4b5762;border-top:1px dashed #23292f;padding-top:8px;margin-top:4px}
.hot{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px}
.hot li{display:grid;grid-template-columns:18px 1fr auto;gap:8px;color:#b8c4d0;line-height:1.4}
.hot .n{color:#ffb454;font-size:10.5px}
.hot .h{color:#5b6874;font-size:10px}
.statusbar{height:26px;display:flex;align-items:center;gap:16px;padding:0 12px;border-top:1px solid #23292f;background:#12161a;color:#5b6874;font-size:10.5px}
.statusbar .acc{color:#ffb454}
.statusbar .right{margin-left:auto;display:flex;gap:14px}
@media (max-width:900px){.grid{grid-template-columns:1fr;grid-template-rows:repeat(4,1fr)}.slogan{display:none}}
</style></head>
<body>
  <header class="tbar">
    <span class="brand">◧ 块集 <span>blockset</span></span>
    <nav class="tabs"><span class="tab on">工作台</span><span class="tab">工具</span><span class="tab">AI</span><span class="tab">待办</span><span class="tab">热点</span></nav>
    <div class="right"><span><b>09:41</b> 周二</span><span>⌘K 命令</span><span>Q</span></div>
  </header>
  <main class="grid">
    <section class="pane">
      <div class="pane-head"><span class="idx">01</span><span class="t">TOOLS</span><span class="meta">14 款 · 全部本地运行</span></div>
      <div class="pane-body">
        <div class="tool-grid">
          ${TOOLS.concat([{ name: "九宫格切图", hint: "3×3" }, { name: "文本对比", hint: "diff" }])
            .map((t) => `<div class="tool"><span class="tool-name">${t.name}</span><span class="tool-hint">${t.hint}</span></div>`)
            .join("")}
        </div>
        <p class="pane-sub">最近使用</p>
        <div class="recent">
          <span><b>图片压缩</b> 2 分钟前</span>
          <span><b>JSON 格式化</b> 今天 09:12</span>
          <span><b>二维码生成</b> 昨天</span>
        </div>
      </div>
    </section>
    <section class="pane">
      <div class="pane-head"><span class="idx">02</span><span class="t">AI CHAT</span><span class="meta">deepseek-chat · 3 个会话</span></div>
      <div class="pane-body">
        <div class="chat">
          <p class="msg me"><span class="lbl">you</span><br/><span class="k">›</span> <span class="b">把今天的搜索记录整理成三个待办</span></p>
          <p class="msg"><span class="lbl">assistant</span><br/><span class="k">›</span> <span class="b">① 回复合作邮件 ② 提交周报 ③ 复查压缩工具边界</span></p>
          <p class="msg me"><span class="lbl">you</span><br/><span class="k">›</span> <span class="b">第 2 条拆成子任务</span></p>
          <div class="composer"><span>继续追问…</span><kbd>↵</kbd></div>
        </div>
      </div>
    </section>
    <section class="pane">
      <div class="pane-head"><span class="idx">03</span><span class="t">TODOS</span><span class="meta">今天 2/5</span></div>
      <div class="pane-body">
        <ul class="todo">${todosHTML().replaceAll('class="todo ', 'class="').replaceAll('class="todo"', 'class=""')}<li><span class="box"></span><span>整理本周热榜到简报</span></li><li><span class="box"></span><span>把 AI 会话导出成 Markdown</span></li></ul>
      </div>
    </section>
    <section class="pane">
      <div class="pane-head"><span class="idx">04</span><span class="t">DAILY HOT</span><span class="meta">实时 8/8 · 11:29 刷新</span></div>
      <div class="pane-body">
        <ul class="hot">${HOT.map((h, i) => `<li><span class="n">${String(i + 1).padStart(2, "0")}</span><span>${h.t}</span><span class="h">${h.h}</span></li>`).join("")}<li><span class="n">06</span><span>把热榜接进 AI 简报的第一版</span><span class="h">48.6 万</span></li></ul>
      </div>
    </section>
  </main>
  <footer class="statusbar"><span class="acc">● 本地模式</span><span>工具在浏览器运行，文件不上传</span><span class="right"><span>hot 8/8</span><span>ai demo</span><span>todo 5</span><span>v0.2</span></span></footer>
</body></html>`;

/* ------------------------------ 纸面工作台 ------------------------------ */

const paper = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>块集 · 纸面工作台</title>
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:#efe9dc;color:#2f2a24;font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif;
  background-image:radial-gradient(rgba(120,100,70,.07) 1px,transparent 1px);background-size:5px 5px}
.desk{max-width:1180px;margin:0 auto;padding:34px 28px 70px}
.top{display:flex;align-items:baseline;gap:20px;padding-bottom:14px;border-bottom:1px solid #d8ccb6;margin-bottom:28px}
.brand{font-family:"Songti SC","Noto Serif SC",SimSun,Georgia,serif;font-size:21px;letter-spacing:.12em}
.brand span{font-family:inherit;font-size:9px;letter-spacing:.26em;color:#8b7d68;margin-left:8px}
.top .slogan{margin-left:auto;font-size:12.5px;color:#7a6c58;letter-spacing:.06em}
.top .clock{font-size:12px;color:#7a6c58}
.sheets{display:grid;grid-template-columns:1.15fr .85fr;grid-template-areas:"tools ai" "todo hot";gap:22px}
.sheet{position:relative;background:#fbf7ee;border:1px solid #d9cdb8;border-radius:4px;padding:22px 24px;box-shadow:0 10px 24px rgba(122,100,70,.1)}
.sheet::before{content:"";position:absolute;left:50%;top:-9px;width:74px;height:18px;transform:translateX(-50%) rotate(-1.5deg);background:rgba(214,198,168,.55);border:1px solid rgba(180,160,125,.5)}
.sheet h2{font-family:"Songti SC","Noto Serif SC",SimSun,Georgia,serif;font-weight:400;font-size:20px;letter-spacing:.06em;margin:0 0 4px}
.sheet .sub{margin:0 0 16px;font-size:11px;letter-spacing:.14em;color:#8b7d68}
.sheet-tools{grid-area:tools}
.sheet-ai{grid-area:ai}
.sheet-todo{grid-area:todo}
.sheet-hot{grid-area:hot}
.tools{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.tool{border-bottom:1px dashed #d9cdb8;padding:10px 0;display:flex;flex-direction:column;gap:2px}
.tool-name{font-size:14px}
.tool-hint{font-size:11px;color:#8b7d68}
.chat{display:flex;flex-direction:column;gap:12px;font-size:13px;line-height:1.85}
.msg{padding:8px 0;border-bottom:1px dashed #e2d8c6}
.msg .who{display:block;font-size:10px;letter-spacing:.14em;color:#a2573a;margin-bottom:2px}
.msg.me{color:#5c5347}
.msg.me .who{color:#8b7d68}
.composer{margin-top:14px;border:1px solid #d9cdb8;background:#f6f0e4;padding:9px 12px;font-size:11.5px;color:#9c8f7b;display:flex;justify-content:space-between}
.todo{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px;font-size:13px}
.todo li{display:flex;gap:9px;align-items:flex-start;line-height:1.7}
.todo .box{width:14px;height:14px;border:1px solid #b9ab92;margin-top:4px;flex-shrink:0;text-align:center;line-height:12px;font-size:10px;color:#a2573a}
.todo li.done{color:#a4977f;text-decoration:line-through}
.todo .add{margin-top:6px;color:#a4977f;font-size:11.5px;border-top:1px dashed #e2d8c6;padding-top:10px}
.hot{list-style:none;margin:0;padding:0;font-size:13px;line-height:1.9}
.hot li{display:grid;grid-template-columns:22px 1fr auto;gap:10px;padding:7px 0;border-bottom:1px dashed #e2d8c6;align-items:baseline}
.hot .n{font-family:"Songti SC",SimSun,serif;color:#a2573a;font-size:12px}
.hot .h{font-size:10.5px;color:#a4977f}
.sheet-slogan{grid-column:1/-1;text-align:center;padding:26px;border-style:dashed;background:transparent;box-shadow:none}
.sheet-slogan::before{display:none}
.sheet-slogan p{margin:0;font-family:"Songti SC","Noto Serif SC",SimSun,serif;font-size:22px;letter-spacing:.08em;color:#5c5347}
.sheet-slogan small{display:block;margin-top:8px;font-size:11px;letter-spacing:.18em;color:#8b7d68}
@media (max-width:900px){.sheets{grid-template-columns:1fr;grid-template-areas:"tools" "ai" "todo" "hot"}.top .slogan{display:none}}
</style></head>
<body>
  <main class="desk">
    <header class="top">
      <span class="brand">块集<span>BLOCKSET</span></span>
      <span class="slogan">一张桌子，放下今天要做的事</span>
      <span class="clock">09:41 · 10 月 20 日</span>
    </header>
    <div class="sheets">
      <section class="sheet sheet-tools">
        <h2>常用工具</h2>
        <p class="sub">LOCAL TOOLS · 14</p>
        <div class="tools">${TOOLS.concat([{ name: "九宫格切图", hint: "3×3 切图" }, { name: "文本对比", hint: "逐行 diff" }]).map((t) => `<div class="tool"><span class="tool-name">${t.name}</span><span class="tool-hint">${t.hint}</span></div>`).join("")}</div>
      </section>
      <section class="sheet sheet-ai">
        <h2>AI 对话</h2>
        <p class="sub">CHAT · DEEPSEEK</p>
        <div class="chat">${CHAT.map((m) => `<div class="msg ${m.who}"><span class="who">${m.who === "ai" ? "块集 AI" : "我"}</span>${m.text}</div>`).join("")}</div>
        <div class="composer"><span>继续追问…</span><span>↵</span></div>
      </section>
      <section class="sheet sheet-todo">
        <h2>待办</h2>
        <p class="sub">TODAY · 2/5</p>
        <ul class="todo">${todosHTML().replaceAll('class="todo ', 'class="').replaceAll('class="todo"', 'class=""')}<li class="add">＋ 写下一件事</li></ul>
      </section>
      <section class="sheet sheet-hot">
        <h2>今日热点</h2>
        <p class="sub">DAILY HOT · 8 个来源</p>
        <ul class="hot">${HOT.map((h, i) => `<li><span class="n">${i + 1}</span><span>${h.t}</span><span class="h">${h.h}</span></li>`).join("")}</ul>
      </section>
      <section class="sheet sheet-slogan">
        <p>把重复的小事，收进同一张桌子。</p>
        <small>TOOLS · AI · TODOS · DAILY HOT</small>
      </section>
    </div>
  </main>
</body></html>`;

/* ------------------------------ 小组件主屏 ------------------------------ */

const widgets = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>块集 · 小组件主屏</title>
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:linear-gradient(160deg,#eef4ff 0%,#e9f7f4 48%,#f7eefb 100%);color:#1b2330;font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif}
.nav{display:flex;align-items:center;gap:18px;padding:16px 34px;font-size:13px}
.brand{display:flex;align-items:center;gap:9px;font-weight:700}
.logo{width:22px;height:22px;border-radius:7px;background:linear-gradient(135deg,#3b6ef6,#7c9bff)}
.brand span{font-size:9px;letter-spacing:.18em;color:#6b7689;font-weight:500}
.search{margin-left:auto;display:flex;align-items:center;gap:7px;background:rgba(255,255,255,.7);border:1px solid rgba(20,40,90,.08);padding:7px 13px;border-radius:10px;color:#6b7689;font-size:12px}
.nav .avatar{width:28px;height:28px;border-radius:50%;background:#1b2330;color:#fff;display:grid;place-items:center;font-size:11px}
main{max-width:1180px;margin:0 auto;padding:6px 34px 60px}
.headline{margin:10px 0 4px;font-size:15px;color:#4c5875}
.headline b{font-size:26px;color:#1b2330;letter-spacing:-.01em;display:block;margin-bottom:4px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:150px;gap:14px;margin-top:22px}
.w{background:rgba(255,255,255,.82);border:1px solid rgba(255,255,255,.9);border-radius:20px;padding:16px;box-shadow:0 12px 30px rgba(24,40,80,.09);display:flex;flex-direction:column;overflow:hidden}
.w.label{font-size:10px;letter-spacing:.12em;color:#7c879b}
.w-time{grid-column:span 2;grid-row:span 2;background:linear-gradient(150deg,#ffffff,#eef3ff)}
.clock{font-size:56px;font-weight:700;letter-spacing:-.03em;line-height:1;margin-top:6px}
.clock-sub{color:#6b7689;font-size:12px;margin-top:6px}
.clock-note{margin-top:auto;font-size:11.5px;color:#4c5875;border-top:1px solid rgba(20,40,90,.08);padding-top:10px}
.w-tools{grid-column:span 2;grid-row:span 2}
.w-ai{grid-column:span 2;grid-row:span 2;background:linear-gradient(160deg,#1b2330,#2b3a5c);color:#e8eefc;border-color:rgba(255,255,255,.1)}
.w-todo{grid-column:span 2;grid-row:span 2}
.w-hot{grid-column:span 2;grid-row:span 2}
.w-note{grid-column:span 2;grid-row:span 2}
.w-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:10px}
.w-head h2{margin:0;font-size:13px;font-weight:650}
.w-head span{font-size:10.5px;color:#7c879b}
.tool-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.tool{border:1px solid rgba(20,40,90,.08);background:#f7f9ff;border-radius:12px;padding:9px 11px;display:flex;flex-direction:column;gap:2px}
.tool-name{font-size:12px;font-weight:600}
.tool-hint{font-size:10px;color:#7c879b}
.chat{display:flex;flex-direction:column;gap:8px;font-size:12px;line-height:1.6}
.msg{padding:8px 11px;border-radius:11px;max-width:92%}
.msg.me{align-self:flex-end;background:#3b6ef6;color:#fff}
.msg.ai{align-self:flex-start;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.14)}
.composer{margin-top:auto;display:flex;justify-content:space-between;border:1px solid rgba(255,255,255,.16);border-radius:9px;padding:7px 10px;font-size:11px;color:#9fb0cf}
.todo{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px;font-size:12px}
.todo li{display:flex;gap:8px;align-items:flex-start;line-height:1.45}
.todo .box{width:14px;height:14px;border-radius:4px;border:1.5px solid #c6d0e2;margin-top:1px;flex-shrink:0;font-size:9px;color:#fff;display:grid;place-items:center}
.todo li.done .box{background:#12a97b;border-color:#12a97b}
.todo li.done{color:#97a3b8;text-decoration:line-through}
.hot{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px;font-size:11.5px}
.hot li{display:grid;grid-template-columns:16px 1fr;gap:7px;line-height:1.4}
.hot .n{color:#3b6ef6;font-weight:700;font-size:10px}
.hot .h{color:#9aa6ba;font-size:10px}
.w-note{background:#fffbeb;border-color:#fde9b8}
.note{font-size:12px;line-height:1.8;color:#5c5347}
.note b{color:#a2573a}
.dock{display:flex;justify-content:center;gap:14px;margin-top:26px}
.dock button{width:52px;height:52px;border-radius:16px;border:0;display:grid;place-items:center;color:#fff;box-shadow:0 12px 26px rgba(24,40,80,.18);cursor:default}
.dock svg{width:24px;height:24px}
.bg1{background:linear-gradient(150deg,#34d399,#0f9f78)}
.bg2{background:linear-gradient(150deg,#8b7cf6,#5b4bdc)}
.bg3{background:linear-gradient(150deg,#4f8cff,#2f63e0)}
.bg4{background:linear-gradient(150deg,#fbbf24,#f08a1d)}
.bg5{background:linear-gradient(150deg,#fb7ba8,#e0457b)}
.bg6{background:linear-gradient(150deg,#94a3b8,#5b6b83)}
.ic svg{width:20px;height:20px;display:block}
@media (max-width:1000px){.grid{grid-template-columns:repeat(2,1fr)}.w-time,.w-tools,.w-ai,.w-todo,.w-hot,.w-note{grid-column:span 2}}
@media (max-width:620px){.grid{grid-template-columns:1fr}.nav{padding:14px 18px}main{padding:0 18px 40px}.search{display:none}}
</style></head>
<body>
  <header class="nav">
    <span class="brand"><span class="logo"></span>块集 <span>BLOCKSET</span></span>
    <span class="search">⌘K 搜索工具、AI 会话、待办</span>
    <span class="avatar">Q</span>
  </header>
  <main>
    <p class="headline"><b>09:41 · 周二</b>所有常用，都在首屏。</p>
    <div class="grid">
      <section class="w w-time">
        <p class="label">TODAY</p>
        <p class="clock">09:41</p>
        <p class="clock-sub">10 月 20 日 · 周二</p>
        <p class="clock-note">今天 5 件事，已完成 2 件 · 热点 8 个来源已更新</p>
      </section>
      <section class="w w-tools">
        <div class="w-head"><h2>常用工具</h2><span>14 款</span></div>
        <div class="tool-grid">
          ${TOOLS.concat([{ name: "九宫格切图", hint: "3×3 切图" }, { name: "文本对比", hint: "逐行 diff" }]).map((t) => `<div class="tool"><span class="tool-name">${t.name}</span><span class="tool-hint">${t.hint}</span></div>`).join("")}
        </div>
      </section>
      <section class="w w-ai">
        <div class="w-head"><h2 style="color:#e8eefc">AI 对话</h2><span style="color:#9fb0cf">deepseek</span></div>
        <div class="chat">${CHAT.slice(0, 3).map((m) => `<div class="msg ${m.who}">${m.text}</div>`).join("")}<div class="composer"><span>继续追问…</span><span>↵</span></div></div>
      </section>
      <section class="w w-todo">
        <div class="w-head"><h2>待办</h2><span>2 / 5</span></div>
        <ul class="todo">${todosHTML().replaceAll('class="todo ', 'class="').replaceAll('class="todo"', 'class=""')}</ul>
      </section>
      <section class="w w-hot">
        <div class="w-head"><h2>今日热点</h2><span>实时 8/8</span></div>
        <ul class="hot">${HOT.map((h, i) => `<li><span class="n">${i + 1}</span><span>${h.t}</span></li>`).join("")}</ul>
      </section>
      <section class="w w-note">
        <div class="w-head"><h2>今日一句</h2><span>便签</span></div>
        <p class="note">打开浏览器就是桌面：<b>工具在本地跑</b>，<b>AI 会话有历史</b>，<b>待办和热点都在这一屏</b>。</p>
      </section>
    </div>
    <div class="dock">
      ${["grid", "spark", "check", "flame", "brush", "settings"].map((n, i) => `<button class="bg${i + 1}">${ic(n)}</button>`).join("")}
    </div>
  </main>
</body></html>`;

/* ------------------------------- 输出 ------------------------------- */

const pages = [
  {
    file: "01-clear-desktop.html",
    name: "01 · 清爽桌面",
    slogan: "你的在线桌面 · 工具、AI、待办、热点一屏收好",
    desc: "浅色渐变壁纸 + 白色窗口 + 底部 Dock + 右侧小组件。最像“浏览器里的桌面”，干净、亲和、信息不挤。",
    html: shell({
      title: "清爽桌面",
      slogan: "你的在线桌面 · 工具、AI、待办、热点一屏收好",
      themeClass: "th-clear",
      supportLine: "SLOGAN · A",
    }).replaceAll("__CSS__", clearCSS),
  },
  {
    file: "02-glass-desktop.html",
    name: "02 · 毛玻璃桌面",
    slogan: "打开浏览器，就是你的桌面",
    desc: "深色渐变壁纸 + 半透明毛玻璃窗口 + 顶部菜单栏。最有“系统感”和高级感，适合做主视觉，但深色阅读内容稍重。",
    html: shell({
      title: "毛玻璃桌面",
      slogan: "打开浏览器，就是你的桌面",
      themeClass: "th-glass",
      supportLine: "SLOGAN · B",
    }).replaceAll("__CSS__", glassCSS),
  },
  {
    file: "03-minimal-desk.html",
    name: "03 · 极简工作台",
    slogan: "少一点，但够用",
    desc: "近白底 + 细边框分栏 + 单一墨绿强调色。像一张排好版的工作台，最克制，最不容易看腻。",
    html: shell({
      title: "极简工作台",
      slogan: "少一点，但够用",
      themeClass: "th-minimal",
      supportLine: "SLOGAN · C",
    }).replaceAll("__CSS__", minimalCSS),
  },
  {
    file: "04-tiling-workspace.html",
    name: "04 · 平铺工作台",
    slogan: "四块屏，装下一天的工作流",
    desc: "深色 + 无圆角四宫格平铺：工具 / AI / 待办 / 热点各占一格，像 tiling window manager。密度最高，开发者味最重。",
    html: tiling,
  },
  {
    file: "05-paper-desk.html",
    name: "05 · 纸面工作台",
    slogan: "一张桌子，放下今天要做的事",
    desc: "米白纸面 + 图钉便签 + 宋体标题。把“桌面”理解成一张真的书桌，温和、有手作感，适合偏内容的个人站。",
    html: paper,
  },
  {
    file: "06-widget-home.html",
    name: "06 · 小组件主屏",
    slogan: "所有常用，都在首屏",
    desc: "把桌面做成“主屏小组件”：时钟、工具、AI、待办、热点各占一块 widget。最容易被理解，移动端也天然好落地。",
    html: widgets,
  },
];

for (const page of pages) {
  fs.writeFileSync(path.join(OUT, page.file), page.html, "utf8");
  console.log(`written test/desktop/${page.file} (${(page.html.length / 1024).toFixed(1)}KB)`);
}

const cards = pages
  .map(
    (page) => `    <section class="item">
      <div class="item-head"><h2>${page.name}</h2><a class="open" href="${page.file}" target="_blank">打开完整页面 ↗</a></div>
      <p class="item-desc">${page.desc}</p>
      <p class="item-slogan">Slogan：<b>${page.slogan}</b></p>
      <div class="frame"><iframe src="${page.file}" title="${page.name}" loading="lazy"></iframe></div>
    </section>`,
  )
  .join("\n");

const index = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>块集 · 在线桌面方向探索</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#f3f3f0;color:#14161a;font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif;line-height:1.6}
  .wrap{max-width:1200px;margin:0 auto;padding:40px 24px 80px}
  h1{font-size:28px;margin:0 0 8px;letter-spacing:-.02em}
  .lead{color:#6d737c;font-size:14.5px;max-width:52em;margin:0 0 6px}
  .note{color:#8b9099;font-size:12.5px;margin:0 0 30px}
  .item{background:#fff;border:1px solid #e7e7e2;border-radius:16px;padding:18px;margin-bottom:18px;box-shadow:0 1px 2px rgba(16,24,40,.04)}
  .item-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
  .item-head h2{font-size:16px;margin:0}
  .open{font-size:12.5px;color:#0f766e;text-decoration:none;font-weight:600}
  .item-desc{color:#6d737c;font-size:13px;margin:6px 0 2px;max-width:78em}
  .item-slogan{color:#8b9099;font-size:12px;margin:0 0 12px}
  .item-slogan b{color:#3f4650;font-weight:600}
  .frame{position:relative;height:470px;overflow:hidden;border:1px solid #e7e7e2;border-radius:12px;background:#fff}
  .frame iframe{width:1440px;height:900px;border:0;transform:scale(.78);transform-origin:top left}
  @media (max-width:1000px){.frame{height:320px}.frame iframe{transform:scale(.5)}}
</style></head>
<body><div class="wrap">
  <h1>块集 · 「在线桌面」方向探索</h1>
  <p class="lead">产品思路：一个浏览器里的桌面 —— 日常工具、可切换模型且保留历史的 AI 对话、待办规划、聚合热点，都在同一屏完成。</p>
  <p class="note">6 个方案都在用「壁纸 / 应用图标 / 窗口 / Dock 或小组件」表达桌面；每套附带一个 slogan 试试语感。点右侧「打开完整页面」看 1440 宽真实排版。</p>
${cards}
</div></body></html>`;

fs.writeFileSync(path.join(OUT, "index.html"), index, "utf8");
console.log("written test/desktop/index.html");
