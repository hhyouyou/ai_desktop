---
title: 2026 年，给自己的站补一个 RSS
date: 2026-09-20
summary: RSS 没有死，它只是从大众入口退回了订阅工具里。这篇记录在 Next.js 里手写 RSS 2.0 输出的两个坑：XML 转义与全文输出，以及为什么值得保留这个旧协议。
tags: [内容, 前端]
---

每隔一段时间就会有人宣布 RSS 已死。但如果你把一篇文章的阅读量拆开看，来自 RSS 阅读器的比例从来不是零——它只是安静，且质量很高。

对一个个人站来说，补一个 RSS 的成本极低：一个路由、四十行字符串拼接，换来的是一条不依赖任何平台的发布通道。

## 为什么还要 RSS

- **不依赖平台算法**。订阅关系直接建立在读者和站点之间，中间没有推荐系统。
- **完整内容**。可以输出全文，也可以只输出摘要，由发布者决定，而不是由平台决定。
- **可迁移**。读者换一个阅读器，订阅列表跟着走，不需要重新关注你。

它的使用人群小，但恰好是最愿意长期阅读的那一小部分人。

## 在 Next.js 里输出 RSS

在 App Router 里，`app/rss.xml/route.ts` 就是一个普通路由处理器。返回 `Response` 时把 Content-Type 设对：

```ts
export async function GET() {
  const articles = getArticles().slice(0, 20);
  const xml = buildRss(articles);
  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
```

`rss.xml` 作为目录名完全没有问题，Next 会把它当成 `/rss.xml` 这条路由。

## 坑一：XML 转义必须先做

最容易被忽略的一步。文章标题里的 `&`、摘要里的引号、代码块里的 `<div>`，直接拼进 XML 都会让阅读器报解析错误。

```ts
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
```

顺序很重要：`&` 必须第一个替换，否则后面替换出来的实体会被二次转义。

验证方式也很朴素——把路由输出抓下来，丢进任何 XML 解析器，能解析通过才算数。

## 坑二：全文输出要用 CDATA

`<description>` 里只放纯文本摘要就够了。但如果要输出全文（`content:encoded`），里面是 HTML，就必须用 CDATA 包起来，否则所有标签都会破坏 XML 结构。

```ts
function cdata(value: string): string {
  return `<![CDATA[${value.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}
```

那个看起来奇怪的 replace 是为了处理正文里恰好出现 `]]>` 的情况——虽然极少见，但一旦出现，整个 feed 就废了。

## 一些细节

- `<pubDate>` 用 RFC 822 格式，例如 `Sat, 18 Oct 2026 00:00:00 GMT`；
- `<guid isPermaLink="true">` 直接用文章永久链接，阅读器靠它去重；
- `<atom:link rel="self">` 指向 feed 自身，方便一些聚合服务识别；
- 加上 `<category>` 把文章标签带出去，订阅器可以按标签过滤。

## 把 RSS 当成发布清单

补完 RSS 之后，一个意外的好处是：它会逼你检查"最近到底写了什么"。feed 里超过 20 条没有更新，说明该写了。

内容站真正的资产不是流量，而是那些能沉淀下来的文章。RSS 这个旧协议，恰好是保留这份资产最轻的一种方式。
