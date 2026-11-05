import type { Metadata } from "next";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/ui/section-heading";
import { cn, formatDate } from "@/lib/utils";
import { listAnnouncements } from "./data";

export const metadata: Metadata = {
  title: "公告",
  description: "块集 BlockSet 的版本更新、功能说明与使用提示。",
};

export const dynamic = "force-dynamic";

export default function AnnouncementsPage() {
  const items = listAnnouncements();
  const pinnedCount = items.filter((item) => item.pinned).length;

  return (
    <>
      <PageHeader
        eyebrow="ANNOUNCEMENTS"
        title="公告"
        desc="版本更新、功能说明和使用提示。置顶内容固定在最前面，其余按发布时间倒序。"
        icon={<Icon name="text" size={26} />}
        actions={
          <>
            <span className="tag tag-sun">{items.length} 条</span>
            <span className="tag">置顶 {pinnedCount} 条</span>
          </>
        }
      />

      <div className="shell py-10 md:py-12">
        <div className="mx-auto max-w-[880px]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] text-ink-soft">
              共 {items.length} 条公告，其中 {pinnedCount} 条置顶。
            </p>
            <span className="tag px-2.5 py-1 text-[10.5px]">{new Date().getFullYear()} 年</span>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[24px] edge border-dashed border-ink/40 bg-cream/50 px-6 py-14 text-center">
              <Icon name="text" size={28} className="text-ink-soft" />
              <p className="mt-3 text-[15px] font-extrabold">还没有公告</p>
              <p className="mt-1.5 text-[12.5px] text-ink-soft">有更新时会第一时间发在这里。</p>
            </div>
          ) : (
            <ol className="relative ml-3 space-y-4 edge-l/20 pl-6 sm:ml-4 sm:pl-8">
              {items.map((item) => (
                <li key={item.id} className="relative">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute -left-[33px] top-5 h-4 w-4 rounded-full edge sm:-left-[41px]",
                      item.pinned ? "bg-coral" : "bg-sun",
                    )}
                  />
                  <article
                    className={cn(
                      "rounded-[22px] edge p-5 shadow-hard-sm",
                      item.pinned ? "bg-cream" : "bg-paper",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {item.pinned ? (
                        <span className="tag tag-coral">置顶</span>
                      ) : (
                        <span className="tag px-2 py-0.5 text-[10px]">更新</span>
                      )}
                      <h2 className="text-[17px] font-extrabold leading-tight">{item.title}</h2>
                      <time
                        className="ml-auto font-[family-name:var(--font-mono)] text-[11px] text-ink-soft"
                        dateTime={new Date(item.createdAt).toISOString()}
                      >
                        {formatDate(item.createdAt, true)}
                      </time>
                    </div>
                    <p className="mt-2.5 whitespace-pre-line text-[13.5px] leading-relaxed text-ink-soft">
                      {item.body}
                    </p>
                  </article>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </>
  );
}
