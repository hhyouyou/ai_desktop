---
title: 把 8 个热榜塞进一页：热点聚合的数据管线
date: 2026-10-18
summary: 热榜聚合看起来只是"抓个接口、渲染个列表"，真正花时间的是规范化、缓存回退和错误提示。这篇记录块集每日热点的四层数据管线。
tags: [前端, 数据, 设计]
---

每日热点上线后，最常被问的是："你的数据从哪来？" 答案有点扫兴：**从缓存来**。

页面本身只做两件事——读本地 SQLite 里的榜单，把 8 个来源渲染成标签页。真正的抓取发生在 `/api/hot?refresh=1`，而且随时可能失败。这一篇讲清楚这条管线是怎么设计的。

## 第一层：抓取必须能失败

上游是第三方接口，超时、限流、返回结构变化都是常态。所以抓取的第一原则不是"成功"，而是**失败时页面还要能打开**。

```ts
export async function refreshSource(source: HotSourceKey) {
  const fallback = getCachedBoard(source); // 先拿缓存/示例数据兜底
  try {
    const payload = await fetchUpstreamJson(source); // 8s 超时
    const items = normalizeHotItems(extractRawList(payload));
    if (items.length === 0) return { board: fallback, warning: "上游返回空列表" };
    saveBoard(source, items);
    return { board: { ...fallback, items, live: true } };
  } catch (error) {
    return { board: fallback, warning: `抓取失败：${error}` };
  }
}
```

注意这里**没有 throw**。任何异常都被收成一个 `warning` 字符串，和回退后的榜单一起返回。页面照常渲染，只是顶部多一条提示。

## 第二层：规范化比抓取重要

热榜接口的字段名几乎没有统一过。微博返回 `word`，GitHub 返回 `name`，有的把链接放在 `mobil_url`，有的干脆只有标题。

与其为每个来源写一个适配器，不如写一个足够宽容的规范化函数：按候选字段列表依次取值，取不到就用下一条规则。

```ts
function pickText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

const item = {
  rank: index + 1,
  title: pickText(record, ["title", "name", "word", "hot_word", "keyword"]),
  url: pickUrl(record),   // 只接受 http(s)，否则置空
  hot: pickHot(record),   // 数字自动格式化成「12.4 万」
};
```

这样上游换字段通常不用改代码。代价是宽容度换来的"隐式约定"，所以规范化之后还要过滤：标题为空、链接非 http 的条目直接丢掉。

## 第三层：三个缓存，三种角色

- **内存软缓存（3 分钟）**：用户连点刷新时不重复打上游。数据只在进程里，重启即失效。
- **SQLite `hot_cache`**：页面默认读它，跨进程、跨重启都还在。上游挂了也能显示"上次抓到的东西"。
- **内置示例数据**：连缓存都没有时的最后一块拼图。界面上明确标「示例数据」，不伪装成实时。

三层依次回退，所以"没有数据"这个状态在页面上几乎不会出现。

## 第四层：把状态如实告诉用户

这是最容易被忽略的一层。数据不可靠的时候，界面必须自己说清楚：

- 未配置 `HOT_API_BASE`：页面顶部一块黄色卡片，写清楚怎么接入、接口约定是什么。
- 配置了但没抓到：灰色提示条，说明"点刷新试试，失败会回退"。
- 某个来源失败：只在该来源的卡片上标「示例数据」，不影响其他来源。

热榜这类内容最容易变成"看起来是真的就行"。但把示例数据标成实时，是比抓取失败更严重的问题。

## 写在最后

这条管线的代码量不大，真正占篇幅的是那些 if：超时怎么办、空列表怎么办、字段变了怎么办、用户看到的是不是真的。

数据聚合类功能的完成度，基本就取决于你愿意为"失败路径"写多少代码。
