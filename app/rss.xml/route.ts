import { getArticles } from "@/lib/articles";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(value: string): string {
  return `<![CDATA[${value.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

/** 文章 date 是本地（东八区）日期，输出 RFC 822 时间给 RSS 阅读器 */
function toRfc822(date: string): string {
  const parsed = new Date(`${date}T08:00:00+08:00`);
  return Number.isNaN(parsed.getTime()) ? new Date().toUTCString() : parsed.toUTCString();
}

export async function GET() {
  const articles = getArticles().slice(0, 20);
  const channelLink = `${SITE.url}/article`;
  const lastBuildDate = articles[0] ? toRfc822(articles[0].date) : new Date().toUTCString();
  const selfLink = `${SITE.url}/rss.xml`;

  const items = articles
    .map((article) => {
      const link = `${SITE.url}/article/${article.slug}`;
      const categories = article.tags
        .map((tag) => `      <category>${escapeXml(tag)}</category>`)
        .join("\n");
      return [
        "    <item>",
        `      <title>${escapeXml(article.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        `      <pubDate>${toRfc822(article.date)}</pubDate>`,
        `      <description>${escapeXml(article.summary)}</description>`,
        `      <content:encoded>${cdata(article.html)}</content:encoded>`,
        categories,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(`${SITE.fullName} · 技术博客`)}</title>
    <link>${escapeXml(channelLink)}</link>
    <description>${escapeXml("块集 BlockSet 的技术博客：工具箱实现、浏览器本地计算、AI 应用架构与内容整理。")}</description>
    <language>zh-CN</language>
    <copyright>${escapeXml(`© ${SITE.year} ${SITE.fullName}`)}</copyright>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <generator>块集 BlockSet</generator>
    <atom:link href="${escapeXml(selfLink)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
