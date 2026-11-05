/**
 * 风格探索生成器：同一套内容，套 6 种不同的视觉语言。
 * 运行：node test/styles/generate.mjs
 * 输出：test/styles/*.html（纯静态，无构建、无外部依赖）
 */
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "test", "styles");
fs.mkdirSync(OUT, { recursive: true });

/* ------------------------------- 共享内容 ------------------------------- */

const TOOLS = [
  { name: "图片压缩", desc: "本地压缩，尽量保留清晰度", tag: "图像" },
  { name: "JSON 格式化", desc: "格式化、校验、折叠浏览", tag: "开发" },
  { name: "二维码生成", desc: "文本、网址、Wi-Fi 与名片", tag: "开发" },
  { name: "密码生成", desc: "密码学随机源，实时算熵", tag: "安全" },
  { name: "九宫格切图", desc: "一键切成 3×3，按序下载", tag: "图像" },
  { name: "文本对比", desc: "逐行 diff，高亮增删改", tag: "文本" },
];

const HOT = [
  { t: "女子每天 2 杯咖啡打喷嚏震断肋骨", h: "128.4 万" },
  { t: "LPL 四队承包 S16 瑞士轮前四场", h: "96.1 万" },
  { t: "何以中国 当惊世界殊", h: "74.2 万" },
  { t: "晚 8 点天猫 iPhone 18 Pro 历史最低价", h: "61.8 万" },
  { t: "AI 编程工具正在重写小团队的分工", h: "52.3 万" },
];

const toolCards = (mode) =>
  TOOLS.map(
    (tool, index) =>
      `<article class="tool ${mode}">
        <div class="tool-top"><span class="tool-idx">${String(index + 1).padStart(2, "0")}</span><span class="tool-tag">${tool.tag}</span></div>
        <h3 class="tool-name">${tool.name}</h3>
        <p class="tool-desc">${tool.desc}</p>
        <span class="tool-go">打开 →</span>
      </article>`,
  ).join("\n");

const hotRows = HOT.map(
  (item, index) =>
    `<li class="hot-row"><span class="hot-rank">${index + 1}</span><span class="hot-title">${item.t}</span><span class="hot-heat">${item.h}</span></li>`,
).join("\n");

const body = ({ kicker, styleName }) => `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>块集 BlockSet · ${styleName}</title>
<style>__CSS__</style>
</head>
<body class="page">
  <header class="hdr">
    <a class="brand" href="#">块集<span class="brand-en">BLOCKSET</span></a>
    <nav class="nav"><a href="#">工具箱</a><a href="#">AI 助手</a><a href="#">每日热点</a><a href="#">博客</a></nav>
    <a class="hdr-cta" href="#">开始使用</a>
  </header>

  <main>
    <section class="hero">
      <p class="kicker">${kicker}</p>
      <h1 class="headline">把重复的小事<br />做成能用的工具</h1>
      <p class="lede">图片压缩、JSON 格式化、二维码、密码生成——在浏览器本地完成，文件不上传。再加 AI 对话、每日热点与待办清单。</p>
      <div class="actions">
        <a class="btn btn-primary" href="#">开始用工具</a>
        <a class="btn btn-ghost" href="#">打开 AI 对话</a>
      </div>
      <dl class="stats">
        <div><dt>14</dt><dd>款即用工具</dd></div>
        <div><dt>8</dt><dd>个热点来源</dd></div>
        <div><dt>0</dt><dd>个上传的文件</dd></div>
      </dl>
    </section>

    <section class="block tools">
      <div class="sec-head">
        <h2>常用工具</h2>
        <a class="sec-more" href="#">全部 14 款</a>
      </div>
      <div class="tool-grid">
        ${toolCards("__MODE__")}
      </div>
    </section>

    <section class="block ai">
      <div class="ai-copy">
        <p class="kicker">AI ASSISTANT</p>
        <h2>会提问，也该会写完</h2>
        <p class="ai-desc">对话、写作、画图三个入口共用一套模型配置，支持任意 OpenAI 兼容接口；没有 Key 时进入演示模式，界面照常可用。</p>
        <a class="btn btn-primary" href="#">试试对话</a>
      </div>
      <div class="ai-chat" aria-hidden="true">
        <div class="bubble user">帮我把今天的搜索记录整理成三个待办</div>
        <div class="bubble ai">① 回复合作邮件 ② 提交周报 ③ 复查压缩工具的边界情况</div>
        <div class="bubble user">把第 2 条拆成子任务</div>
      </div>
    </section>

    <section class="block hot">
      <div class="sec-head">
        <h2>今日热点</h2>
        <a class="sec-more" href="#">全部来源</a>
      </div>
      <ol class="hot-list">
        ${hotRows}
      </ol>
      <p class="hot-note">微博 · 知乎 · 百度 · 抖音 · B 站 · GitHub · 掘金 · 36 氪 &nbsp;|&nbsp; 实时 8/8 · 最近刷新 11:29</p>
    </section>
  </main>

  <footer class="ftr">
    <span>© 2026 块集 BlockSet</span>
    <span>本地计算 · 不上传文件 · 无需注册</span>
    <span class="ftr-note">风格探索样张 · ${styleName}</span>
  </footer>
</body>
</html>`;

/* ------------------------------- 六套风格 ------------------------------- */

const editorial = `/* ===== 01 编辑杂志：纸感、衬线、极简双色 ===== */
:root{
  --paper:#fbf8f1; --ink:#16140f; --muted:#6d6659; --line:#d8d0c0; --accent:#8a2b1b;
  --serif:"Songti SC","Noto Serif SC",SimSun,Georgia,"Times New Roman",serif;
  --sans:"PingFang SC","Microsoft YaHei",system-ui,sans-serif;
}
*{box-sizing:border-box}
body.page{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);font-size:15px;line-height:1.75;
  background-image:radial-gradient(rgba(22,20,15,.035) 1px,transparent 1px);background-size:4px 4px}
.hdr{max-width:1040px;margin:0 auto;padding:26px 32px 14px;display:flex;align-items:baseline;gap:32px;border-bottom:1px solid var(--ink)}
.brand{font-family:var(--serif);font-size:24px;letter-spacing:.08em;text-decoration:none;color:var(--ink);display:flex;gap:10px;align-items:baseline}
.brand-en{font-family:var(--sans);font-size:9px;letter-spacing:.3em;color:var(--muted)}
.nav{margin-left:auto;display:flex;gap:24px}
.nav a{color:var(--ink);text-decoration:none;font-size:13px;letter-spacing:.06em;padding-bottom:2px;border-bottom:1px solid transparent}
.nav a:hover{border-color:var(--accent)}
.hdr-cta{font-size:12px;letter-spacing:.14em;color:var(--accent);text-decoration:none;text-transform:uppercase}
main{max-width:1040px;margin:0 auto;padding:0 32px 40px}
.hero{padding:76px 0 68px;border-bottom:1px solid var(--line)}
.kicker{font-size:10.5px;letter-spacing:.32em;color:var(--accent);text-transform:uppercase;margin:0 0 26px}
.headline{font-family:var(--serif);font-weight:400;font-size:clamp(42px,5.4vw,68px);line-height:1.24;letter-spacing:.01em;margin:0;max-width:15em}
.lede{max-width:34em;color:var(--muted);font-size:15.5px;margin:30px 0 0;line-height:1.9}
.actions{display:flex;gap:26px;margin-top:38px;align-items:center}
.btn{text-decoration:none;font-size:13.5px;letter-spacing:.06em;padding:2px 0;border-bottom:1px solid currentColor;color:var(--ink)}
.btn-primary{color:var(--accent);border-bottom-width:2px}
.btn-ghost{color:var(--muted)}
.stats{display:flex;gap:64px;margin:56px 0 0;padding:0}
.stats div{display:flex;flex-direction:column;gap:2px}
.stats dt{font-family:var(--serif);font-size:38px;line-height:1}
.stats dd{margin:0;font-size:11px;letter-spacing:.18em;color:var(--muted);text-transform:uppercase}
.block{padding:64px 0;border-bottom:1px solid var(--line)}
.sec-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:34px}
.sec-head h2{font-family:var(--serif);font-weight:400;font-size:30px;letter-spacing:.04em;margin:0}
.sec-more{font-size:11.5px;letter-spacing:.16em;color:var(--muted);text-decoration:none;text-transform:uppercase}
.tool-grid{display:grid;grid-template-columns:1fr 1fr;column-gap:64px;border-top:1px solid var(--line)}
.tool.bordered{display:grid;grid-template-columns:1fr auto;column-gap:24px;align-items:baseline;padding:20px 0;border-bottom:1px solid var(--line)}
.tool-top{grid-column:2;grid-row:1 / span 2;align-self:start;display:flex;justify-content:flex-end}
.tool-idx{display:none}
.tool-tag{font-size:10px;letter-spacing:.16em;color:var(--muted);text-transform:uppercase}
.tool-name{grid-column:1;grid-row:1;font-family:var(--serif);font-weight:400;font-size:20px;margin:0}
.tool-desc{grid-column:1;grid-row:2;margin:2px 0 0;color:var(--muted);font-size:13px}
.tool-go{display:none}
.ai{display:grid;grid-template-columns:1fr 1fr;gap:64px}
.ai-copy h2{font-family:var(--serif);font-weight:400;font-size:34px;margin:0 0 16px;letter-spacing:.03em}
.ai-desc{color:var(--muted);font-size:14px;margin:0 0 26px;max-width:26em}
.ai-chat{border-left:2px solid var(--accent);padding:6px 0 6px 26px;display:flex;flex-direction:column;gap:16px}
.bubble{font-size:13.5px;line-height:1.8;color:var(--ink)}
.bubble.user{color:var(--muted);font-style:italic}
.bubble.user::before{content:"问 — "}
.bubble.ai::before{content:"答 — ";color:var(--accent);font-family:var(--serif)}
.hot-list{list-style:none;margin:0;padding:0;counter-reset:hot;border-top:1px solid var(--line)}
.hot-row{display:grid;grid-template-columns:38px 1fr auto;align-items:baseline;gap:18px;padding:15px 0;border-bottom:1px solid var(--line)}
.hot-rank{font-family:var(--serif);font-size:12px;color:var(--accent)}
.hot-title{font-size:14.5px}
.hot-heat{font-size:11px;letter-spacing:.1em;color:var(--muted)}
.hot-note{margin:22px 0 0;font-size:10.5px;letter-spacing:.14em;color:var(--muted);text-transform:uppercase}
.ftr{max-width:1040px;margin:0 auto;padding:34px 32px 60px;display:flex;gap:26px;font-size:11px;letter-spacing:.08em;color:var(--muted)}
.ftr-note{margin-left:auto}
@media (max-width:760px){.nav{display:none}.hero{padding:56px 0}.tool-grid{grid-template-columns:1fr}.ai{grid-template-columns:1fr;gap:32px}.stats{gap:32px}}`;

const swiss = `/* ===== 02 瑞士网格：白底、栅格、单色强调 ===== */
:root{--paper:#fff;--ink:#0a0a0a;--muted:#767676;--line:#0a0a0a;--accent:#e2231a;
  --sans:"Helvetica Neue",Helvetica,Arial,"PingFang SC","Microsoft YaHei",sans-serif}
*{box-sizing:border-box}
body.page{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);font-size:15px;line-height:1.6;letter-spacing:-.01em}
.hdr{display:grid;grid-template-columns:repeat(12,1fr);align-items:center;gap:16px;padding:22px 40px;border-bottom:2px solid var(--ink)}
.brand{grid-column:span 4;font-size:19px;font-weight:700;letter-spacing:-.03em;text-decoration:none;color:var(--ink)}
.brand-en{font-size:10px;letter-spacing:.12em;font-weight:500;color:var(--muted);margin-left:8px}
.nav{grid-column:span 6;display:flex;gap:28px;font-size:13px}
.nav a{color:var(--ink);text-decoration:none}
.nav a:hover{color:var(--accent)}
.hdr-cta{grid-column:span 2;text-align:right;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--accent);text-decoration:none}
main{padding:0 40px}
.hero{display:grid;grid-template-columns:repeat(12,1fr);gap:16px;padding:72px 0 64px;border-bottom:1px solid #e5e5e5}
.kicker{grid-column:1/13;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin:0 0 18px}
.headline{grid-column:1/10;margin:0;font-size:clamp(48px,7vw,92px);line-height:.98;letter-spacing:-.045em;font-weight:700}
.lede{grid-column:1/5;margin:28px 0 0;color:var(--muted);font-size:14px;line-height:1.65}
.actions{grid-column:5/10;display:flex;gap:12px;margin-top:28px;align-items:flex-start}
.btn{display:inline-block;text-decoration:none;font-size:13px;font-weight:700;padding:12px 20px;border:1px solid var(--ink);color:var(--ink)}
.btn-primary{background:var(--ink);color:#fff;border-color:var(--ink)}
.btn-ghost{background:transparent}
.btn-ghost:hover{background:var(--accent);border-color:var(--accent);color:#fff}
.stats{grid-column:1/13;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:56px 0 0;padding-top:18px;border-top:2px solid var(--ink)}
.stats div{display:flex;align-items:baseline;gap:10px}
.stats dt{font-size:40px;font-weight:700;letter-spacing:-.04em;line-height:1}
.stats dd{margin:0;font-size:11px;color:var(--muted);letter-spacing:.06em}
.block{padding:56px 0;border-bottom:1px solid #e5e5e5}
.sec-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:22px}
.sec-head h2{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.16em;margin:0}
.sec-more{font-size:11px;color:var(--muted);text-decoration:none;text-transform:uppercase;letter-spacing:.1em}
.tool-grid{display:grid;grid-template-columns:repeat(3,1fr);column-gap:32px;row-gap:0;border-top:2px solid var(--ink)}
.tool.compact{border-bottom:1px solid #e5e5e5;padding:16px 0 18px;min-height:132px;display:flex;flex-direction:column;gap:5px}
.tool-top{display:flex;justify-content:space-between;align-items:baseline}
.tool-idx{font-size:11px;font-weight:700;color:var(--accent)}
.tool-tag{font-size:10px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase}
.tool-name{margin:6px 0 0;font-size:18px;font-weight:700;letter-spacing:-.02em}
.tool-desc{margin:0;font-size:12.5px;color:var(--muted);line-height:1.5}
.tool-go{margin-top:auto;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
.ai{display:grid;grid-template-columns:repeat(12,1fr);gap:16px}
.ai-copy{grid-column:1/6}
.ai-copy h2{font-size:32px;line-height:1.05;letter-spacing:-.035em;margin:0 0 14px;font-weight:700}
.ai-desc{color:var(--muted);font-size:13.5px;margin:0 0 22px;max-width:28em}
.ai-chat{grid-column:7/13;min-width:0;background:var(--ink);color:#fff;padding:24px;display:block}
.bubble{display:block;font-size:13px;line-height:1.6;border-bottom:1px solid #333;padding-bottom:12px;margin-bottom:12px}
.bubble:last-child{border-bottom:0}
.bubble.user{color:#a3a3a3}
.bubble.ai{color:#fff}
.hot-list{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;column-gap:40px;border-top:1px solid var(--ink)}
.hot-row{display:grid;grid-template-columns:34px 1fr auto;gap:12px;align-items:baseline;padding:13px 0;border-bottom:1px solid #e5e5e5}
.hot-rank{font-size:11px;font-weight:700;color:var(--accent)}
.hot-title{font-size:13.5px}
.hot-heat{font-size:11px;color:var(--muted)}
.hot-note{margin:20px 0 0;font-size:10.5px;color:var(--muted);letter-spacing:.08em}
.ftr{display:flex;gap:24px;padding:28px 40px 52px;font-size:11px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase}
.ftr-note{margin-left:auto}
@media (max-width:820px){.nav,.hdr-cta{display:none}.hdr{grid-template-columns:1fr}.brand{grid-column:1}.hero{grid-template-columns:1fr;padding:44px 0}.headline,.lede,.actions,.kicker,.stats{grid-column:1}.tool-grid{grid-template-columns:1fr 1fr}.ai{grid-template-columns:1fr}.ai-copy,.ai-chat{grid-column:1}.hot-list{grid-template-columns:1fr}}`;

const soft = `/* ===== 03 柔和卡片：浅灰蓝底、软阴影、低饱和 ===== */
:root{--bg:#eef1f7;--surface:#fff;--ink:#1d2431;--muted:#6b7486;--line:#e3e8f2;--accent:#5b7cfa;--accent-soft:#e9edff;--ok:#34c7a0;
  --sans:"PingFang SC","Microsoft YaHei",system-ui,-apple-system,sans-serif;
  --shadow:0 18px 40px rgba(24,39,75,.08),0 2px 6px rgba(24,39,75,.04)}
*{box-sizing:border-box}
body.page{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:15px;line-height:1.7}
.hdr{max-width:1080px;margin:0 auto;padding:20px 24px;display:flex;align-items:center;gap:20px}
.brand{font-size:18px;font-weight:700;letter-spacing:-.01em;text-decoration:none;color:var(--ink);display:flex;gap:8px;align-items:center}
.brand::before{content:"";width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,var(--accent),#8ea6ff)}
.brand-en{font-size:9px;letter-spacing:.14em;color:var(--muted);font-weight:500}
.nav{margin-left:auto;display:flex;gap:6px;background:#fff;padding:6px;border-radius:999px;box-shadow:var(--shadow)}
.nav a{text-decoration:none;color:var(--muted);font-size:13px;padding:7px 14px;border-radius:999px}
.nav a:first-child{background:var(--accent-soft);color:var(--accent);font-weight:600}
.hdr-cta{text-decoration:none;font-size:13px;font-weight:600;color:#fff;background:var(--accent);padding:10px 18px;border-radius:999px;box-shadow:0 8px 20px rgba(91,124,250,.35)}
main{max-width:1080px;margin:0 auto;padding:0 24px 40px}
.hero{text-align:center;padding:72px 0 56px}
.kicker{display:inline-block;font-size:12px;color:var(--accent);background:var(--accent-soft);padding:6px 14px;border-radius:999px;margin:0 0 22px;font-weight:600}
.headline{margin:0;font-size:clamp(34px,4.6vw,52px);line-height:1.28;letter-spacing:-.02em;font-weight:700}
.lede{color:var(--muted);font-size:15px;max-width:34em;margin:20px auto 0}
.actions{display:flex;gap:12px;justify-content:center;margin-top:30px}
.btn{text-decoration:none;padding:12px 24px;border-radius:14px;font-size:14px;font-weight:600;background:#fff;color:var(--ink);box-shadow:var(--shadow)}
.btn-primary{background:var(--accent);color:#fff;box-shadow:0 12px 26px rgba(91,124,250,.32)}
.stats{display:flex;justify-content:center;gap:16px;margin:44px 0 0;padding:0}
.stats div{background:#fff;border-radius:18px;padding:16px 26px;box-shadow:var(--shadow);min-width:132px}
.stats dt{font-size:28px;font-weight:700;letter-spacing:-.02em}
.stats dd{margin:2px 0 0;font-size:11.5px;color:var(--muted)}
.block{background:var(--surface);border-radius:26px;padding:28px;margin-bottom:20px;box-shadow:var(--shadow)}
.sec-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
.sec-head h2{font-size:17px;font-weight:700;margin:0}
.sec-more{font-size:12.5px;color:var(--accent);text-decoration:none;font-weight:600}
.tool-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.tool.soft{background:#f7f9fe;border:1px solid var(--line);border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:6px;transition:.2s}
.tool.soft:hover{transform:translateY(-2px);box-shadow:0 12px 26px rgba(24,39,75,.1);background:#fff}
.tool-top{display:flex;justify-content:space-between;align-items:center}
.tool-idx{width:28px;height:28px;border-radius:9px;background:var(--accent-soft);color:var(--accent);font-size:11px;font-weight:700;display:grid;place-items:center}
.tool-tag{font-size:10.5px;color:var(--muted)}
.tool-name{margin:4px 0 0;font-size:15.5px;font-weight:700}
.tool-desc{margin:0;font-size:12.5px;color:var(--muted);line-height:1.55}
.tool-go{display:none}
.ai{display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:center;background:linear-gradient(135deg,#fff,#f4f7ff)}
.ai-copy h2{font-size:26px;margin:0 0 10px;letter-spacing:-.01em}
.ai-desc{color:var(--muted);font-size:13.5px;margin:0 0 20px}
.ai-chat{display:flex;flex-direction:column;gap:10px}
.bubble{font-size:13px;padding:12px 16px;border-radius:16px;line-height:1.6;max-width:88%}
.bubble.user{background:var(--accent);color:#fff;border-bottom-right-radius:6px;align-self:flex-end}
.bubble.ai{background:#fff;border:1px solid var(--line);border-bottom-left-radius:6px;align-self:flex-start;box-shadow:0 6px 16px rgba(24,39,75,.05)}
.hot-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.hot-row{display:grid;grid-template-columns:30px 1fr auto;gap:14px;align-items:center;padding:11px 0;border-bottom:1px solid var(--line);font-size:13.5px}
.hot-row:last-child{border-bottom:0}
.hot-rank{width:22px;height:22px;border-radius:7px;background:var(--accent-soft);color:var(--accent);font-size:11px;font-weight:700;display:grid;place-items:center}
.hot-heat{font-size:11.5px;color:var(--muted)}
.hot-note{margin:14px 0 0;font-size:11px;color:var(--muted)}
.ftr{max-width:1080px;margin:0 auto;padding:26px 24px 48px;display:flex;gap:18px;font-size:11.5px;color:var(--muted)}
.ftr-note{margin-left:auto}
@media (max-width:820px){.nav{display:none}.tool-grid{grid-template-columns:1fr 1fr}.ai{grid-template-columns:1fr}}`;

const dark = `/* ===== 04 暗色终端：近黑、等宽、霓虹绿 ===== */
:root{--bg:#0a0e11;--panel:#10171d;--line:#1e2a33;--ink:#e6edf3;--muted:#7d8c99;--accent:#6ee7a8;--link:#58a6ff;
  --mono:"Cascadia Code","JetBrains Mono",Consolas,"SFMono-Regular",monospace;
  --sans:"PingFang SC","Microsoft YaHei",system-ui,sans-serif}
*{box-sizing:border-box}
body.page{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:14.5px;line-height:1.7;
  background-image:linear-gradient(rgba(110,231,168,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(110,231,168,.035) 1px,transparent 1px);background-size:32px 32px}
.hdr{display:flex;align-items:center;gap:24px;padding:16px 28px;border-bottom:1px solid var(--line);background:rgba(10,14,17,.85);backdrop-filter:blur(8px);position:sticky;top:0}
.brand{font-family:var(--mono);font-size:15px;color:var(--ink);text-decoration:none}
.brand::before{content:"~/";color:var(--accent)}
.brand-en{display:none}
.nav{margin-left:auto;display:flex;gap:20px;font-family:var(--mono);font-size:12px}
.nav a{color:var(--muted);text-decoration:none}
.nav a::before{content:"./";opacity:.5}
.nav a:hover{color:var(--accent)}
.hdr-cta{font-family:var(--mono);font-size:12px;color:var(--accent);text-decoration:none;border:1px solid var(--accent);padding:7px 14px;border-radius:3px}
.hdr-cta::after{content:" ↵"}
main{max-width:1060px;margin:0 auto;padding:0 28px 40px}
.hero{padding:80px 0 60px;border-bottom:1px dashed var(--line)}
.kicker{font-family:var(--mono);font-size:11px;color:var(--accent);letter-spacing:.12em;margin:0 0 20px}
.kicker::before{content:"# "}
.headline{margin:0;font-size:clamp(32px,4.8vw,54px);line-height:1.22;letter-spacing:-.02em;font-weight:700}
.headline::after{content:"_";color:var(--accent);animation:none}
.lede{color:var(--muted);max-width:40em;margin:22px 0 0;font-size:14px;line-height:1.85}
.actions{display:flex;gap:14px;margin-top:28px}
.btn{font-family:var(--mono);font-size:12.5px;text-decoration:none;padding:10px 18px;border:1px solid var(--line);color:var(--ink);border-radius:3px}
.btn-primary{background:var(--accent);color:#04120b;border-color:var(--accent);font-weight:700}
.btn-primary:hover{background:#8ef3bd}
.btn-ghost{color:var(--muted)}
.btn-ghost:hover{color:var(--accent);border-color:var(--accent)}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);border:1px solid var(--line);margin:48px 0 0;padding:0}
.stats div{background:var(--panel);padding:18px 20px;display:flex;align-items:baseline;gap:10px}
.stats dt{font-family:var(--mono);font-size:26px;color:var(--accent);line-height:1}
.stats dd{margin:0;font-family:var(--mono);font-size:11px;color:var(--muted)}
.block{padding:52px 0;border-bottom:1px dashed var(--line)}
.sec-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:20px;font-family:var(--mono)}
.sec-head h2{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:0}
.sec-more{font-size:11.5px;color:var(--link);text-decoration:none}
.tool-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.tool.tile{background:var(--panel);border:1px solid var(--line);border-radius:4px;padding:16px;display:flex;flex-direction:column;gap:6px;transition:.15s}
.tool.tile:hover{border-color:var(--accent);transform:translateY(-1px)}
.tool-top{display:flex;justify-content:space-between;font-family:var(--mono);font-size:11px}
.tool-idx{color:var(--accent)}
.tool-tag{color:var(--muted)}
.tool-tag::before{content:"[";}.tool-tag::after{content:"]"}
.tool-name{margin:4px 0 0;font-size:15px;font-weight:700}
.tool-desc{margin:0;font-size:12.5px;color:var(--muted);line-height:1.6}
.tool-go{margin-top:8px;font-family:var(--mono);font-size:11px;color:var(--link)}
.ai{display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:center}
.ai-copy h2{font-size:26px;margin:0 0 12px}
.ai-desc{color:var(--muted);font-size:13.5px;margin:0 0 22px}
.ai-chat{background:#0d1318;border:1px solid var(--line);border-radius:6px;padding:14px;font-family:var(--mono);font-size:12px;line-height:1.8}
.ai-chat::before{content:"$ blockset chat --demo";display:block;color:var(--muted);border-bottom:1px solid var(--line);padding-bottom:8px;margin-bottom:10px}
.bubble{margin:0 0 8px}
.bubble.user{color:var(--muted)}.bubble.user::before{content:"you  › "}
.bubble.ai{color:var(--ink)}.bubble.ai::before{content:"ai   › ";color:var(--accent)}
.hot-list{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}
.hot-row{display:grid;grid-template-columns:40px 1fr auto;gap:14px;padding:12px 0;border-bottom:1px solid var(--line);font-size:13.5px}
.hot-rank{font-family:var(--mono);color:var(--accent);font-size:12px}
.hot-rank::before{content:"0";opacity:.6}
.hot-heat{font-family:var(--mono);font-size:11.5px;color:var(--muted)}
.hot-note{margin:18px 0 0;font-family:var(--mono);font-size:11px;color:var(--muted)}
.ftr{display:flex;gap:22px;padding:26px 28px 50px;font-family:var(--mono);font-size:11px;color:var(--muted)}
.ftr-note{margin-left:auto}
@media (max-width:820px){.nav{display:none}.tool-grid{grid-template-columns:1fr 1fr}.ai{grid-template-columns:1fr}.stats{grid-template-columns:1fr}}`;

const warm = `/* ===== 05 日式暖纸：米白、衬线、陶土与橄榄 ===== */
:root{--paper:#f4ede1;--card:#fbf6ec;--ink:#2b2620;--muted:#7c6f5f;--line:#ddd2bf;--accent:#a85a3c;--olive:#6f7a4e;
  --serif:"Songti SC","Noto Serif SC",SimSun,Georgia,serif;--sans:"PingFang SC","Microsoft YaHei",system-ui,sans-serif}
*{box-sizing:border-box}
body.page{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);font-size:15px;line-height:1.85;
  background-image:radial-gradient(rgba(120,100,70,.06) 1px,transparent 1px);background-size:5px 5px}
.hdr{max-width:1000px;margin:0 auto;padding:26px 30px;display:flex;align-items:center;gap:28px}
.brand{font-family:var(--serif);font-size:22px;letter-spacing:.14em;color:var(--ink);text-decoration:none}
.brand-en{font-family:var(--sans);font-size:9px;letter-spacing:.24em;color:var(--muted);margin-left:8px}
.nav{margin-left:auto;display:flex;gap:22px;font-size:13px}
.nav a{color:var(--muted);text-decoration:none}
.nav a:hover{color:var(--accent)}
.hdr-cta{font-size:12.5px;color:var(--ink);text-decoration:none;border:1px solid var(--line);padding:8px 16px;border-radius:999px;background:var(--card)}
main{max-width:1000px;margin:0 auto;padding:0 30px 40px}
.hero{padding:84px 0 66px;position:relative}
.hero::before{content:"工具 · AI · 热点";position:absolute;left:-34px;top:120px;writing-mode:vertical-rl;font-size:11px;letter-spacing:.4em;color:var(--muted)}
.kicker{font-size:11px;letter-spacing:.3em;color:var(--accent);margin:0 0 22px}
.headline{font-family:var(--serif);font-weight:400;font-size:clamp(40px,5vw,60px);line-height:1.35;letter-spacing:.02em;margin:0}
.lede{max-width:32em;color:var(--muted);font-size:15px;margin:28px 0 0;line-height:2}
.actions{display:flex;gap:14px;margin-top:34px}
.btn{text-decoration:none;font-size:13.5px;padding:11px 22px;border-radius:999px;border:1px solid var(--line);color:var(--ink);background:var(--card)}
.btn-primary{background:var(--accent);border-color:var(--accent);color:#fff8f2}
.btn-ghost{background:transparent}
.stats{display:flex;gap:56px;margin:52px 0 0;padding:24px 0 0;border-top:1px solid var(--line)}
.stats div{display:flex;flex-direction:column}
.stats dt{font-family:var(--serif);font-size:32px;line-height:1}
.stats dd{margin:4px 0 0;font-size:11px;letter-spacing:.16em;color:var(--muted)}
.block{padding:52px 0;border-top:1px solid var(--line)}
.sec-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:24px}
.sec-head h2{font-family:var(--serif);font-weight:400;font-size:26px;letter-spacing:.08em;margin:0}
.sec-more{font-size:11.5px;color:var(--muted);text-decoration:none;letter-spacing:.12em}
.tool-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.tool.paper{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:6px;transition:.2s}
.tool.paper:hover{border-color:var(--accent);transform:translateY(-2px)}
.tool-top{display:flex;justify-content:space-between;align-items:baseline}
.tool-idx{font-family:var(--serif);font-size:12px;color:var(--accent)}
.tool-tag{font-size:10.5px;color:var(--olive);letter-spacing:.08em}
.tool-name{margin:2px 0 0;font-family:var(--serif);font-weight:400;font-size:18px;letter-spacing:.04em}
.tool-desc{margin:0;font-size:12.5px;color:var(--muted);line-height:1.7}
.tool-go{display:none}
.ai{display:grid;grid-template-columns:0.9fr 1.1fr;gap:44px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:22px;padding:32px}
.ai-copy h2{font-family:var(--serif);font-weight:400;font-size:28px;letter-spacing:.06em;margin:0 0 14px}
.ai-desc{color:var(--muted);font-size:13.5px;margin:0 0 22px;line-height:1.9}
.ai-chat{display:flex;flex-direction:column;gap:12px}
.bubble{font-size:13px;line-height:1.8;padding:12px 16px;border-radius:14px;background:var(--paper)}
.bubble.user{border:1px dashed var(--line);background:transparent;color:var(--muted)}
.bubble.ai{border:1px solid var(--line)}
.bubble.ai::before{content:"块集 — ";font-family:var(--serif);color:var(--accent)}
.hot-list{list-style:none;margin:0;padding:0}
.hot-row{display:grid;grid-template-columns:36px 1fr auto;gap:14px;align-items:baseline;padding:14px 0;border-bottom:1px solid var(--line)}
.hot-rank{font-family:var(--serif);font-size:13px;color:var(--accent)}
.hot-rank::before{content:"○ "}
.hot-title{font-size:14px}
.hot-heat{font-size:11px;color:var(--muted)}
.hot-note{margin:18px 0 0;font-size:11px;color:var(--muted);letter-spacing:.06em}
.ftr{max-width:1000px;margin:0 auto;padding:30px 30px 56px;display:flex;gap:22px;font-size:11px;color:var(--muted);letter-spacing:.06em}
.ftr-note{margin-left:auto}
@media (max-width:820px){.nav{display:none}.hero::before{display:none}.tool-grid{grid-template-columns:1fr 1fr}.ai{grid-template-columns:1fr;padding:24px}.stats{gap:28px}}`;

const bento = `/* ===== 06 Bento 现代：浅灰白、卡片栅格、靛蓝单强调 ===== */
:root{--bg:#f6f6f3;--surface:#fff;--ink:#14161a;--muted:#6d737c;--line:#e7e7e2;--accent:#4f46e5;--accent-soft:#eef0ff;
  --sans:"PingFang SC","Microsoft YaHei",system-ui,-apple-system,sans-serif;
  --shadow:0 1px 2px rgba(16,24,40,.04),0 10px 28px rgba(16,24,40,.06)}
*{box-sizing:border-box}
body.page{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:15px;line-height:1.65}
.hdr{max-width:1100px;margin:0 auto;padding:18px 24px;display:flex;align-items:center;gap:20px}
.brand{display:flex;align-items:center;gap:9px;font-size:17px;font-weight:650;text-decoration:none;color:var(--ink);letter-spacing:-.01em}
.brand::before{content:"";width:24px;height:24px;border-radius:7px;background:var(--accent);box-shadow:inset 0 -6px 0 rgba(255,255,255,.25)}
.brand-en{font-size:9px;letter-spacing:.1em;color:var(--muted);font-weight:500}
.nav{margin-left:auto;display:flex;gap:4px}
.nav a{text-decoration:none;color:var(--muted);font-size:13.5px;padding:8px 13px;border-radius:9px}
.nav a:hover{background:#ececea;color:var(--ink)}
.hdr-cta{text-decoration:none;font-size:13.5px;font-weight:600;color:#fff;background:var(--ink);padding:9px 16px;border-radius:10px}
main{max-width:1100px;margin:0 auto;padding:0 24px 40px}
.hero{display:grid;grid-template-columns:1.15fr .85fr;grid-template-areas:"kick stats" "head stats" "lede stats" "actions stats";column-gap:44px;align-items:start;padding:56px 0 44px}
.kicker{grid-area:kick;display:inline-flex;align-items:center;gap:6px;justify-self:start;font-size:12px;color:var(--accent);background:var(--accent-soft);padding:5px 11px;border-radius:8px;margin:0 0 16px;font-weight:600}
.kicker::before{content:"●";font-size:7px}
.headline{grid-area:head;margin:0;font-size:clamp(34px,4.2vw,48px);line-height:1.2;letter-spacing:-.03em;font-weight:700}
.lede{grid-area:lede;color:var(--muted);font-size:14.5px;max-width:32em;margin:18px 0 0}
.actions{grid-area:actions;display:flex;gap:10px;margin-top:26px}
.btn{text-decoration:none;font-size:14px;font-weight:600;padding:11px 20px;border-radius:11px;background:#fff;color:var(--ink);border:1px solid var(--line);box-shadow:var(--shadow)}
.btn-primary{background:var(--accent);border-color:var(--accent);color:#fff}
.btn-ghost{background:transparent;box-shadow:none}
.stats{grid-area:stats;display:grid;grid-template-columns:1fr 1fr;gap:10px;align-self:center;margin:0}
.stats div:first-child{grid-column:span 2}
.stats div{background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px;box-shadow:var(--shadow)}
.stats dt{font-size:26px;font-weight:700;letter-spacing:-.02em}
.stats dd{margin:2px 0 0;font-size:11.5px;color:var(--muted)}
.block{margin-bottom:18px}
.sec-head{display:flex;justify-content:space-between;align-items:center;margin:8px 0 14px}
.sec-head h2{font-size:15px;font-weight:650;margin:0;letter-spacing:-.01em}
.sec-more{font-size:12.5px;color:var(--accent);text-decoration:none;font-weight:600}
.tool-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.tool.bento{background:#fff;border:1px solid var(--line);border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:4px;box-shadow:var(--shadow);transition:.18s}
.tool.bento:hover{transform:translateY(-2px);border-color:#d6d6cf}
.tool-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.tool-idx{width:26px;height:26px;border-radius:8px;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;font-size:11px;font-weight:700}
.tool-tag{font-size:10.5px;color:var(--muted);border:1px solid var(--line);padding:2px 7px;border-radius:999px}
.tool-name{margin:0;font-size:15px;font-weight:650}
.tool-desc{margin:0;font-size:12.5px;color:var(--muted);line-height:1.5}
.tool-go{margin-top:8px;font-size:11.5px;color:var(--accent);font-weight:600}
.ai{display:grid;grid-template-columns:1fr 1fr;gap:10px;background:#fff;border:1px solid var(--line);border-radius:20px;padding:22px;box-shadow:var(--shadow)}
.ai-copy h2{font-size:22px;margin:0 0 8px;letter-spacing:-.02em}
.ai-desc{color:var(--muted);font-size:13px;margin:0 0 18px}
.ai-chat{display:flex;flex-direction:column;gap:8px;justify-content:center}
.bubble{font-size:12.5px;padding:10px 13px;border-radius:12px;line-height:1.6;max-width:90%}
.bubble.user{background:var(--accent);color:#fff;border-bottom-right-radius:4px;align-self:flex-end}
.bubble.ai{background:#f4f4f1;border-bottom-left-radius:4px;align-self:flex-start}
.hot{background:#fff;border:1px solid var(--line);border-radius:20px;padding:20px 22px;box-shadow:var(--shadow)}
.hot-list{list-style:none;margin:0;padding:0}
.hot-row{display:grid;grid-template-columns:26px 1fr auto;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line);font-size:13.5px}
.hot-row:last-child{border-bottom:0}
.hot-rank{width:20px;height:20px;border-radius:6px;background:#f1f1ee;color:var(--muted);font-size:10.5px;font-weight:700;display:grid;place-items:center}
.hot-row:nth-child(-n+3) .hot-rank{background:var(--accent-soft);color:var(--accent)}
.hot-heat{font-size:11.5px;color:var(--muted)}
.hot-note{margin:12px 0 0;font-size:11px;color:var(--muted)}
.ftr{max-width:1100px;margin:0 auto;padding:24px;display:flex;gap:20px;font-size:11.5px;color:var(--muted)}
.ftr-note{margin-left:auto}
@media (max-width:860px){.nav{display:none}.hero{grid-template-columns:1fr;grid-template-areas:"kick" "head" "lede" "actions" "stats";padding:36px 0}.stats{grid-template-columns:repeat(3,1fr)}.stats div:first-child{grid-column:span 1}.tool-grid{grid-template-columns:1fr 1fr}.ai{grid-template-columns:1fr}}`;

const styles = [
  {
    file: "01-editorial.html",
    name: "01 · 编辑杂志",
    mode: "bordered",
    kicker: "TOOLBOX · AI · DAILY HOT",
    desc: "纸感米白 + 宋体标题 + 双色克制，靠字号、留白和细分隔线组织信息。最安静、最“读物感”。",
    css: editorial,
  },
  {
    file: "02-swiss.html",
    name: "02 · 瑞士网格",
    mode: "compact",
    kicker: "BLOCKSET — TOOLS / AI / HOT",
    desc: "纯白 + 严格 12 栏 + 单点红，Helvetica 风格粗标题，信息密度高但秩序感强。最“产品/设计公司”。",
    css: swiss,
  },
  {
    file: "03-soft.html",
    name: "03 · 柔和卡片",
    mode: "soft",
    kicker: "轻一点，也能用",
    desc: "浅灰蓝底 + 大圆角 + 软阴影 + 低饱和蓝，卡片轻浮动。最“亲切、现代 SaaS”，但整体最低调。",
    css: soft,
  },
  {
    file: "04-dark.html",
    name: "04 · 暗色终端",
    mode: "tile",
    kicker: "blockset --dev-mode",
    desc: "近黑底 + 等宽字 + 单点荧光绿 + 网格底纹。最“开发者/极客”，长时间看最不刺眼。",
    css: dark,
  },
  {
    file: "05-warm.html",
    name: "05 · 日式暖纸",
    mode: "paper",
    kicker: "工具，也可以慢一点",
    desc: "米白纸纹 + 宋体 + 陶土/橄榄色点缀 + 大留白。最“手作、生活感”，适合内容型个人站。",
    css: warm,
  },
  {
    file: "06-bento.html",
    name: "06 · Bento 现代",
    mode: "bento",
    kicker: "NEW · 14 款工具已就位",
    desc: "浅灰白 + 白卡片 + 细边 + 靛蓝单强调 + 大圆角。最“2025 产品官网”，克制但有现代感。",
    css: bento,
  },
];

for (const style of styles) {
  const html = body(style).replaceAll("__CSS__", style.css).replaceAll("__MODE__", style.mode);
  fs.writeFileSync(path.join(OUT, style.file), html, "utf8");
  console.log(`written test/styles/${style.file} (${(html.length / 1024).toFixed(1)}KB)`);
}

/* ------------------------------- 索引页 ------------------------------- */

const cards = styles
  .map(
    (style) => `    <section class="item">
      <div class="item-head">
        <h2>${style.name}</h2>
        <a class="open" href="${style.file}" target="_blank">打开完整页面 ↗</a>
      </div>
      <p class="item-desc">${style.desc}</p>
      <div class="frame">
        <iframe src="${style.file}" title="${style.name}" loading="lazy"></iframe>
      </div>
    </section>`,
  )
  .join("\n");

const index = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>块集 · UI 风格探索</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#f3f3f0;color:#14161a;font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif;line-height:1.6}
  .wrap{max-width:1180px;margin:0 auto;padding:40px 24px 80px}
  h1{font-size:30px;margin:0 0 8px;letter-spacing:-.02em}
  .lead{color:#6d737c;font-size:14.5px;max-width:44em;margin:0 0 6px}
  .note{color:#8b9099;font-size:12.5px;margin:0 0 32px}
  .item{background:#fff;border:1px solid #e7e7e2;border-radius:18px;padding:18px;margin-bottom:18px;box-shadow:0 1px 2px rgba(16,24,40,.04)}
  .item-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
  .item-head h2{font-size:16px;margin:0}
  .open{font-size:12.5px;color:#4f46e5;text-decoration:none;font-weight:600}
  .item-desc{color:#6d737c;font-size:13px;margin:6px 0 14px;max-width:70em}
  .frame{position:relative;height:440px;overflow:hidden;border:1px solid #e7e7e2;border-radius:12px;background:#fff}
  .frame iframe{width:1440px;height:1300px;border:0;transform:scale(.76);transform-origin:top left}
  .frame::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(to bottom,transparent 82%,rgba(255,255,255,.95))}
  @media (max-width:900px){.frame{height:300px}.frame iframe{transform:scale(.5)}}
</style>
</head>
<body>
  <div class="wrap">
    <h1>块集 · UI 风格探索</h1>
    <p class="lead">同一套内容（首页：主视觉 / 工具 / AI / 热点），6 种不同的视觉语言。纯静态样张，没有功能，也不影响线上版本。</p>
    <p class="note">点标题右侧「打开完整页面」可看 1440 宽的真实排版；下面的缩略框是真实 iframe 渲染。</p>
${cards}
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(OUT, "index.html"), index, "utf8");
console.log("written test/styles/index.html");
