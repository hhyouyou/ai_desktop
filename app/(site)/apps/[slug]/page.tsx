import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import { ToolCard } from "@/components/tool-card";
import { FavoriteButton } from "@/components/tools/favorite-button";
import { ToolRunner } from "@/components/tools/tool-runner";
import { PageHeader, SectionHeading } from "@/components/ui/section-heading";
import { getViewer } from "@/lib/auth";
import { getToolDoc } from "@/lib/tools/content";
import { getFavoriteSlugs } from "@/lib/tools/favorites";
import { getCategory, getTool, TOOLS } from "@/lib/site";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return { title: "工具不存在" };
  return {
    title: tool.title,
    description: `${tool.blurb} 全部在浏览器本地运行，文件不上传。`,
    openGraph: {
      title: `${tool.title} · 块集 BlockSet`,
      description: tool.blurb,
    },
  };
}

export default async function ToolPage({ params }: PageProps) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  const category = getCategory(tool.category);
  const doc = getToolDoc(tool.slug);
  const viewer = await getViewer();
  const favorites = getFavoriteSlugs(viewer.id);
  const favorited = favorites.includes(tool.slug);

  const related = TOOLS.filter((item) => item.category === tool.category && item.slug !== tool.slug);
  const more = (related.length > 0 ? related : TOOLS.filter((item) => item.slug !== tool.slug && item.hot)).slice(0, 4);

  return (
    <div>
      <PageHeader
        eyebrow="TOOLS"
        title={tool.title}
        desc={tool.blurb}
        icon={<Icon name={tool.icon} size={26} />}
        actions={
          <>
            <FavoriteButton slug={tool.slug} initialFavorited={favorited} />
            <Link href="/apps" className="btn btn-sm">
              <Icon name="grid" size={14} />
              全部工具
            </Link>
          </>
        }
      />

      <section className="shell py-8 md:py-12">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="tag tag-sun">{category.label}</span>
          {tool.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full edge-sub bg-cream px-2.5 py-1 text-[11px] font-bold text-ink-soft"
            >
              {tag}
            </span>
          ))}
          {tool.hot ? <span className="tag tag-coral text-[10.5px]">热门</span> : null}
          <span className="tag text-[10.5px]">
            <Icon name="lock" size={11} />
            本地运行
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <ToolRunner slug={tool.slug} />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-[22px] edge bg-cream p-4 shadow-hard-sm">
              <p className="eyebrow">HOW TO</p>
              <h2 className="mt-1 text-[17px] font-extrabold">怎么用</h2>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">{doc.intro}</p>
              <ol className="mt-3 space-y-2">
                {doc.steps.map((step, index) => (
                  <li key={step} className="flex gap-2 text-[12.5px] leading-relaxed">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full edge-2 bg-sun text-[10px] font-extrabold">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <ul className="mt-3 space-y-1.5 border-t-2 border-dashed border-ink/15 pt-3">
                {doc.tips.map((tip) => (
                  <li key={tip} className="flex gap-2 text-[11.5px] leading-relaxed text-ink-soft">
                    <Icon name="spark" size={11} className="mt-1 shrink-0 text-coral" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[22px] edge bg-sun/30 p-4">
              <p className="text-[13px] font-extrabold">文件不上传</p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-soft">
                这个工具的计算与文件处理都在你的浏览器里完成，关闭页面后数据即释放。刷新页面会清空当前内容。
              </p>
            </div>

            <div className="rounded-[22px] edge bg-paper p-4 shadow-hard-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="eyebrow">RELATED</p>
                <span className="tag tag-sun text-[10px]">{category.label}</span>
              </div>
              <h2 className="mt-1 text-[17px] font-extrabold">同分类工具</h2>
              {related.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {related.map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={`/apps/${item.slug}`}
                        className="group flex items-center gap-2 rounded-[12px] edge-sub bg-cream/60 px-2.5 py-2 transition-colors hover:bg-sun/40"
                      >
                        <Icon name={item.icon} size={14} />
                        <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold">{item.title}</span>
                        <Icon
                          name="arrow"
                          size={12}
                          className="text-ink-soft transition-transform group-hover:translate-x-0.5"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[12px] text-ink-soft">同类工具还在准备中，可以先去全部分类看看。</p>
              )}
            </div>
          </aside>
        </div>

        <div className="mt-12">
          <SectionHeading eyebrow="MORE" title="继续看看" href="/apps" linkLabel={`全部 ${TOOLS.length} 款`} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {more.map((item) => (
              <ToolCard key={item.slug} tool={item} compact />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
