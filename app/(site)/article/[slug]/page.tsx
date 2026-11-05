import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import { getArticle, getArticles } from "@/lib/articles";

type Params = { slug: string };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "文章不存在" };
  return {
    title: article.title,
    description: article.summary,
    alternates: { canonical: `/article/${article.slug}` },
  };
}

export default async function ArticleDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const articles = getArticles();
  const index = articles.findIndex((item) => item.slug === article.slug);
  const newer = index > 0 ? articles[index - 1] : null;
  const older = index >= 0 && index < articles.length - 1 ? articles[index + 1] : null;
  const related = articles
    .filter((item) => item.slug !== article.slug)
    .map((item) => ({
      article: item,
      overlap: item.tags.filter((tag) => article.tags.includes(tag)).length,
    }))
    .sort((a, b) => b.overlap - a.overlap || (a.article.date < b.article.date ? 1 : -1))
    .slice(0, 3)
    .map((entry) => entry.article);

  return (
    <>
      <header className="edge-b bg-cream">
        <div className="shell py-9 md:py-11">
          <nav aria-label="面包屑" className="flex flex-wrap items-center gap-1.5 text-[12px] text-ink-soft">
            <Link href="/" className="hover:text-ink hover:underline">
              首页
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/article" className="hover:text-ink hover:underline">
              技术博客
            </Link>
            <span aria-hidden="true">/</span>
            <span className="max-w-[240px] truncate text-ink">{article.title}</span>
          </nav>

          <h1 className="display-lg mt-4 max-w-[900px]">{article.title}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="tag tag-sun">{article.date}</span>
            <span className="tag">约 {article.readingTime} 分钟</span>
            {article.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>

          <p className="mt-4 max-w-[760px] text-[14px] leading-relaxed text-ink-soft">
            {article.summary}
          </p>
        </div>
      </header>

      <div className="shell grid gap-8 py-10 md:py-12 lg:grid-cols-[minmax(0,780px)_240px] lg:justify-center">
        <div className="min-w-0">
          <article className="rounded-[26px] edge bg-paper p-6 shadow-hard sm:p-8 md:p-10">
            <div className="prose-blockset" dangerouslySetInnerHTML={{ __html: article.html }} />
          </article>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {newer ? (
              <Link
                href={`/article/${newer.slug}`}
                className="hover-lift group rounded-[20px] edge bg-paper p-4 shadow-hard-sm"
              >
                <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">
                  上一篇 · 更新
                </span>
                <span className="mt-1.5 line-clamp-2 block text-[13.5px] font-extrabold leading-snug">
                  {newer.title}
                </span>
              </Link>
            ) : (
              <div className="rounded-[20px] edge border-dashed border-ink/30 p-4 text-[12px] text-ink-soft">
                已经是最新一篇了。
              </div>
            )}

            {older ? (
              <Link
                href={`/article/${older.slug}`}
                className="hover-lift group rounded-[20px] edge bg-paper p-4 shadow-hard-sm"
              >
                <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">
                  下一篇 · 更早
                </span>
                <span className="mt-1.5 line-clamp-2 block text-[13.5px] font-extrabold leading-snug">
                  {older.title}
                </span>
              </Link>
            ) : (
              <div className="rounded-[20px] edge border-dashed border-ink/30 p-4 text-[12px] text-ink-soft">
                已经是最早一篇了。
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link href="/article" className="btn">
              <Icon name="arrow" size={15} className="rotate-180" />
              返回列表
            </Link>
            <a href="/rss.xml" target="_blank" rel="noopener noreferrer" className="btn btn-sm">
              <Icon name="arrow" size={13} className="-rotate-45" />
              RSS 订阅
            </a>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="surface-tight p-4">
            <p className="eyebrow">Article</p>
            <dl className="mt-2 space-y-1.5 text-[12px]">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-ink-soft">发布日期</dt>
                <dd className="font-bold">{article.date}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-ink-soft">阅读时长</dt>
                <dd className="font-bold">约 {article.readingTime} 分钟</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-ink-soft">标签</dt>
                <dd className="font-bold">{article.tags.join(" / ") || "—"}</dd>
              </div>
            </dl>
          </div>

          {related.length > 0 ? (
            <div className="surface-tight p-4">
              <p className="eyebrow">Related</p>
              <h2 className="mt-1 text-[14px] font-extrabold">相关阅读</h2>
              <ul className="mt-2 divide-y-2 divide-dashed divide-ink/10">
                {related.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={`/article/${item.slug}`}
                      className="group block py-2.5 text-[12.5px] font-bold leading-snug hover:underline hover:decoration-sun hover:decoration-[2px] hover:underline-offset-2"
                    >
                      {item.title}
                      <span className="mt-0.5 block font-[family-name:var(--font-mono)] text-[10px] font-normal text-ink-soft">
                        {item.date} · {item.readingTime} 分钟
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-[20px] edge bg-sun p-4 text-[12px] leading-relaxed">
            <p className="font-extrabold">订阅更新</p>
            <p className="mt-1 text-ink/80">
              本站提供 RSS 2.0 订阅，全文输出，不依赖任何第三方平台。
            </p>
            <a href="/rss.xml" target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ink mt-3">
              <Icon name="arrow" size={13} className="-rotate-45" />
              打开 RSS
            </a>
          </div>
        </aside>
      </div>
    </>
  );
}
