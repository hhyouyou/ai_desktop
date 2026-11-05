import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { BriefStudio } from "@/components/content/brief-studio";
import { PageHeader } from "@/components/ui/section-heading";
import { getBrief, hasAiKey, isBriefFresh, listBriefs } from "@/lib/brief";
import { getCachedBoards } from "@/lib/hot";
import { localDateKey } from "@/lib/utils";

export const metadata: Metadata = {
  title: "AI 简报",
  description:
    "把 8 个来源的热榜整理成一份可读的中文简报：今日关键词、3 条主线、值得一读、重点新闻（DeepSeek 网页搜索/抓取）与一句话总结。每天首次打开自动生成；没有配置模型时用模板规则生成并标注演示模式。",
};

export const dynamic = "force-dynamic";

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

type SearchParams = { date?: string | string[] };

function pickDate(raw: string | string[] | undefined, fallback: string): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

export default async function DailyBriefPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const today = localDateKey();
  const selectedDate = pickDate(params.date, today);
  const history = listBriefs(24);
  const brief = getBrief(selectedDate);
  const aiConfigured = hasAiKey();
  const weekday = WEEKDAYS[new Date(`${selectedDate}T08:00:00`).getDay()];

  // 今天首次打开（或热榜比简报新）时，客户端自动生成一份，不用手动点
  const latestDataAt = getCachedBoards().reduce(
    (max, board) => Math.max(max, board.fetchedAt),
    0,
  );
  const freshToday = isBriefFresh(brief, latestDataAt);
  const autoGenerate = selectedDate === today && !freshToday;

  return (
    <>
      <PageHeader
        eyebrow="DAILY BRIEF"
        title="AI 简报"
        desc="每天一份：把热榜标题整理成「今日关键词 / 3 条主线 / 值得一读 / 一句话总结」。简报存在本地数据库，可以按日期回看。"
        icon={<Icon name="text" size={26} />}
        actions={
          <>
            <span className="tag tag-sun">
              {selectedDate} · {weekday}
            </span>
            <span className="tag">{history.length} 期</span>
            {selectedDate !== today ? (
              <Link href="/daily-brief" className="btn btn-sm">
                回到今日
              </Link>
            ) : (
              <Link href="/daily-hot" className="btn btn-sm">
                <Icon name="flame" size={14} />
                看热榜
              </Link>
            )}
          </>
        }
      />

      <div className="shell grid gap-6 py-10 md:py-12 lg:grid-cols-[minmax(0,1fr)_286px]">
        <div className="min-w-0">
          <BriefStudio
            key={selectedDate}
            initialBrief={brief?.payload ?? null}
            selectedDate={selectedDate}
            today={today}
            aiConfigured={aiConfigured}
            autoGenerate={autoGenerate}
          />
        </div>

        <aside className="space-y-4">
          <div className="surface-tight p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-extrabold">历史简报</h2>
              <span className="tag px-2 py-0.5 text-[10px]">{history.length} 期</span>
            </div>
            {history.length === 0 ? (
              <p className="mt-3 text-[12px] leading-relaxed text-ink-soft">
                还没有生成过简报。生成后会自动保存到本地数据库，可以按日期回看。
              </p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {history.map((item) => (
                  <li key={item.date}>
                    <Link
                      href={`/daily-brief?date=${item.date}`}
                      className={`flex items-center gap-2 rounded-[12px] px-2.5 py-2 text-[12.5px] transition-colors ${
                        item.date === selectedDate
                          ? "bg-ink text-paper"
                          : "hover:bg-cream"
                      }`}
                    >
                      <span className="font-[family-name:var(--font-mono)] text-[11px]">
                        {item.date}
                      </span>
                      <span className="ml-auto flex items-center gap-1.5">
                        {item.payload.demo ? (
                          <span className="tag px-1.5 py-0 text-[9px]">模板</span>
                        ) : (
                          <span className="tag tag-mint px-1.5 py-0 text-[9px]">AI</span>
                        )}
                        <Icon name="arrow" size={12} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-[20px] edge bg-sky/60 p-4 text-[12px] leading-relaxed">
            <p className="eyebrow mb-1.5">How it works</p>
            输入是 8 个来源热榜的前 5 条。<strong>每天首次打开会自动生成</strong>
            （热榜有更新也会自动补一期，30 分钟内不重复调用）；也可以点按钮手动重排。
            没有配置模型时用模板规则整理并标注演示模式；配置{" "}
            <code className="font-[family-name:var(--font-mono)] text-[11px]">
              BLOCKSET_AI_KEY
            </code>{" "}
            后改为模型生成，并会调用 DeepSeek 网页搜索 / 抓取补「重点新闻」的权威报道简述；结果同样存进本地数据库，可按日期回看。
          </div>
        </aside>
      </div>
    </>
  );
}
