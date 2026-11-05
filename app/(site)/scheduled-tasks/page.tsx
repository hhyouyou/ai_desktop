import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/ui/section-heading";
import { ScheduleBoard } from "@/components/user/schedule-board";
import { getViewer } from "@/lib/auth";
import { listSchedules } from "@/lib/schedules";

export const metadata: Metadata = {
  title: "已安排",
  description: "块集 BlockSet 已安排：把将来要做的事排进时间轴，展示计划、到期高亮与下次运行时间。",
};

export default async function ScheduledTasksPage() {
  const viewer = await getViewer();
  const schedules = listSchedules(viewer.id);
  const serverNow = Date.now();

  return (
    <>
      <PageHeader
        eyebrow="SCHEDULE"
        title="已安排"
        icon={<Icon name="clock" size={26} />}
        desc="把将来要做的事排进时间轴：到点后高亮提醒，重复计划自动推算下次运行。"
        actions={
          <>
            <Link href="/user/todo" className="btn btn-sm">
              <Icon name="check" size={14} />
              待办清单
            </Link>
            <Link href="/settings" className="btn btn-sm btn-ink">
              <Icon name="settings" size={14} />
              设置
            </Link>
          </>
        }
      />

      <div className="shell space-y-5 py-8 md:py-10">
        <div className="surface-cream flex flex-wrap items-start gap-3 p-4 md:p-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] edge-2 bg-sun">
            <Icon name="clock" size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-extrabold">这里是计划清单，不做自动执行</p>
            <p className="mt-1 max-w-[760px] text-[12.5px] leading-relaxed text-ink-soft">
              个人站没有后台常驻进程，无法在到点时自动跑任务。页面会在计划到期时高亮提醒，
              由你自己决定什么时候处理；重复计划只用于推算下次运行时间。
            </p>
          </div>
        </div>

        <ScheduleBoard initialSchedules={schedules} serverNow={serverNow} />
      </div>
    </>
  );
}
