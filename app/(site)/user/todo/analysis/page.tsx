import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { EmptyState, PageHeader, Stat } from "@/components/ui/section-heading";
import {
  CompletionRing,
  DailyBars,
  PriorityBars,
  WeekdayBars,
  formatHoursLabel,
} from "@/components/user/todo-charts";
import { getViewer } from "@/lib/auth";
import { analyzeTodos } from "@/lib/todos";

export const metadata: Metadata = {
  title: "待办分析",
  description: "从完成率、近 7 天节奏、优先级分布与连续完成天数看待办数据，全部图表手写 SVG 渲染。",
};

export default async function TodoAnalysisPage() {
  const viewer = await getViewer();
  const analysis = analyzeTodos(viewer.id);

  return (
    <>
      <PageHeader
        eyebrow="TODO ANALYSIS"
        title="待办分析"
        icon={<Icon name="calc" size={26} />}
        desc="只看你自己的数据：完成率、最近 7 天的节奏、优先级分布和连续完成天数。"
        actions={
          <Link href="/user/todo" className="btn btn-sm">
            <Icon name="arrow" size={14} />
            返回待办
          </Link>
        }
      />

      <div className="shell space-y-5 py-8 md:space-y-6 md:py-10">
        {!analysis.hasData ? (
          <EmptyState
            icon={<Icon name="calc" size={32} />}
            title="还没有可以分析的数据"
            desc="先创建几条待办并完成它们，这里会自动生成完成率、每日节奏和优先级分布图。"
            action={
              <Link href="/user/todo" className="btn btn-primary">
                <Icon name="plus" size={16} />
                去创建第一条待办
              </Link>
            }
          />
        ) : (
          <>
            <section className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="surface p-5 md:p-6">
                <p className="eyebrow mb-2">COMPLETION</p>
                <h2 className="text-[18px] font-extrabold">整体完成率</h2>
                <p className="mt-1 text-[12.5px] text-ink-soft">
                  已完成 {analysis.done} 条 / 共 {analysis.total} 条
                </p>
                <div className="mt-4">
                  <CompletionRing
                    rate={analysis.completionRate}
                    done={analysis.done}
                    total={analysis.total}
                  />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-[12px] font-bold">
                  <span className="flex items-center gap-2 rounded-[12px] edge-2 bg-sun px-2.5 py-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-mint" aria-hidden="true" />
                    已完成 {analysis.done}
                  </span>
                  <span className="flex items-center gap-2 rounded-[12px] edge-2 bg-cream px-2.5 py-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-ink/30" aria-hidden="true" />
                    未完成 {analysis.open}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <Stat value={analysis.done} label="已完成" accent="mint" />
                  <Stat value={analysis.open} label="未完成" accent="coral" />
                  <Stat value={analysis.overdue} label="已逾期" accent="sun" />
                  <Stat value={`${analysis.streakDays} 天`} label="连续完成" accent="violet" />
                </div>
                <div className="surface-cream p-4">
                  <p className="eyebrow mb-1">PACE</p>
                  <p className="text-[14px] font-extrabold">
                    平均完成耗时：
                    {analysis.avgCompletionHours === null
                      ? "暂无完成记录"
                      : formatHoursLabel(analysis.avgCompletionHours)}
                  </p>
                  <p className="mt-1 text-[12px] text-ink-soft">
                    从创建到勾选完成的时间差平均值。
                    {analysis.bestWeekday
                      ? ` 最常完成任务的一天是${analysis.bestWeekday.label}。`
                      : ""}
                  </p>
                </div>
              </div>
            </section>

            <section className="surface p-5 md:p-6">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="eyebrow mb-1.5">LAST 7 DAYS</p>
                  <h2 className="text-[18px] font-extrabold">近 7 天每日新增与完成</h2>
                </div>
                <p className="text-[12px] text-ink-soft">按本地时区统计，今天在最右侧</p>
              </div>
              <DailyBars days={analysis.days} />
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="surface p-5 md:p-6">
                <p className="eyebrow mb-1.5">PRIORITY</p>
                <h2 className="mb-4 text-[18px] font-extrabold">优先级分布</h2>
                <PriorityBars buckets={analysis.priority} />
              </div>
              <div className="surface p-5 md:p-6">
                <p className="eyebrow mb-1.5">WEEKDAY</p>
                <h2 className="mb-4 text-[18px] font-extrabold">完成任务的工作日分布</h2>
                <WeekdayBars buckets={analysis.weekday} />
              </div>
            </section>

            <section className="surface-cream p-5 md:p-6">
              <p className="eyebrow mb-1.5">INSIGHTS</p>
              <h2 className="mb-4 text-[18px] font-extrabold">从数据里读到的几件事</h2>
              <ol className="space-y-2.5">
                {analysis.insights.map((insight, index) => (
                  <li
                    key={insight}
                    className="flex items-start gap-3 rounded-[16px] edge-2 bg-paper px-3.5 py-3"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full edge-2 bg-sun font-[family-name:var(--font-mono)] text-[11px] font-bold">
                      {index + 1}
                    </span>
                    <span className="text-[13.5px] font-semibold leading-relaxed">{insight}</span>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}
      </div>
    </>
  );
}
