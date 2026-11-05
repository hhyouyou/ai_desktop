/**
 * 探测：本机能否直连各热榜上游 / 能否下载 DailyHotApi 源码 / 公共实例是否可用。
 * 用法：node scripts/probe-hot.mjs
 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const targets = [
  {
    name: "baidu 热榜",
    url: "https://top.baidu.com/api/board?platform=wise&tab=realtime",
    headers: { "user-agent": UA, referer: "https://top.baidu.com/board?tab=realtime" },
  },
  {
    name: "zhihu 热榜",
    url: "https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=50",
    headers: { "user-agent": UA, referer: "https://www.zhihu.com/hot" },
  },
  {
    name: "bilibili 热门",
    url: "https://api.bilibili.com/x/web-interface/popular?ps=20&pn=1",
    headers: { "user-agent": UA, referer: "https://www.bilibili.com/" },
  },
  {
    name: "v2ex 热门",
    url: "https://www.v2ex.com/api/topics/hot.json",
    headers: { "user-agent": UA },
  },
  {
    name: "weibo 热搜",
    url: "https://weibo.com/ajax/side/hotSearch",
    headers: { "user-agent": UA, referer: "https://weibo.com/" },
  },
  {
    name: "douyin 热搜",
    url: "https://www.douyin.com/aweme/v1/web/hot/search/list/?device_platform=webapp&aid=6383",
    headers: { "user-agent": UA, referer: "https://www.douyin.com/" },
  },
  {
    name: "github trending(HTML)",
    url: "https://github.com/trending?since=daily",
    headers: { "user-agent": UA },
  },
  {
    name: "api.github.com 搜索",
    url: "https://api.github.com/search/repositories?q=stars:>5000&sort=stars&per_page=5",
    headers: { "user-agent": UA, accept: "application/vnd.github+json" },
  },
  {
    name: "DailyHotApi 公共实例 /weibo",
    url: "https://api-hot.imsyy.top/weibo",
    headers: { "user-agent": UA },
  },
  {
    name: "DailyHotApi 公共实例 /baidu",
    url: "https://api-hot.imsyy.top/baidu",
    headers: { "user-agent": UA },
  },
  {
    name: "jsDelivr 仓库文件",
    url: "https://cdn.jsdelivr.net/gh/imsyy/DailyHotApi@master/package.json",
    headers: { "user-agent": UA },
  },
  {
    name: "github tarball(API)",
    url: "https://api.github.com/repos/imsyy/DailyHotApi/tarball/master",
    headers: { "user-agent": UA },
    redirect: "manual",
  },
  {
    name: "ghfast.top 代理",
    url: "https://ghfast.top/https://raw.githubusercontent.com/imsyy/DailyHotApi/master/package.json",
    headers: { "user-agent": UA },
  },
  {
    name: "gh-proxy.com 代理",
    url: "https://gh-proxy.com/https://raw.githubusercontent.com/imsyy/DailyHotApi/master/package.json",
    headers: { "user-agent": UA },
  },
  {
    name: "hub.gitmirror.com",
    url: "https://hub.gitmirror.com/https://raw.githubusercontent.com/imsyy/DailyHotApi/master/package.json",
    headers: { "user-agent": UA },
  },
];

const results = [];

for (const target of targets) {
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const response = await fetch(target.url, {
      headers: target.headers,
      redirect: target.redirect ?? "follow",
      signal: controller.signal,
    });
    clearTimeout(timer);
    let preview = "";
    if (response.status >= 200 && response.status < 400 && response.headers.get("content-type")?.includes("json")) {
      const text = await response.text();
      preview = text.replace(/\s+/g, " ").slice(0, 110);
    } else {
      await response.body?.cancel();
    }
    results.push({
      name: target.name,
      status: response.status,
      location: response.headers.get("location") ?? "",
      ms: Date.now() - started,
      preview,
    });
  } catch (error) {
    results.push({
      name: target.name,
      status: "ERR",
      location: "",
      ms: Date.now() - started,
      preview: String(error).slice(0, 90),
    });
  }
}

for (const r of results) {
  console.log(
    `${String(r.status).padEnd(4)} ${String(r.ms).padStart(5)}ms  ${r.name}${r.location ? `  → ${r.location.slice(0, 60)}` : ""}${r.preview ? `\n      ${r.preview}` : ""}`,
  );
}
