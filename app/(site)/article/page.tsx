import type { Metadata } from "next";
import { Icon } from "@/components/icons";
import { ArticleExplorer } from "@/components/content/article-explorer";
import { PageHeader } from "@/components/ui/section-heading";
import { allTags, getArticles } from "@/lib/articles";
import type { ArticleCard } from "@/components/content/article-types";

export const metadata: Metadata = {
  title: "技术博客",
  description:
    "块集 BlockSet 的技术博客：工具箱实现、浏览器本地计算、AI 应用架构与内容整理，都是可以复用的工程笔记。",
};

export const dynamic = "force-dynamic";

export default function ArticleListPage() {
  const articles = getArticles();
  const tags = allTags();
  const cards: ArticleCard[] = articles.map((article) => ({
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    date: article.date,
    tags: article.tags,
    readingTime: article.readingTime,
  }));
  const totalReading = articles.reduce((sum, article) => sum + article.readingTime, 0);

  return (
    <>
      <PageHeader
        eyebrow="BLOG"
        title="技术博客"
        desc="工具箱实现、浏览器本地计算、AI 应用架构与内容整理。写下来是为了复用，也欢迎直接抄思路。"
        icon={<Icon name="book" size={26} />}
        actions={
          <>
            <span className="tag tag-sun">{articles.length} 篇</span>
            <span className="tag">约 {totalReading} 分钟</span>
            <a
              href="/rss.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm"
              title="订阅 RSS"
            >
              <Icon name="arrow" size={14} className="-rotate-45" />
              RSS
            </a>
          </>
        }
      />

      <div className="shell py-10 md:py-12">
        <ArticleExplorer articles={cards} tags={tags} />
      </div>
    </>
  );
}
