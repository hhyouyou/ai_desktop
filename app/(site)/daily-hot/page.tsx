import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { HotBoardPanel } from "@/components/content/hot-board";
import { PageHeader } from "@/components/ui/section-heading";
import { getCachedBoards, HOT_SOURCES } from "@/lib/hot";
import { hotApiConfigured } from "@/lib/hot-fetch";
import { localDateKey } from "@/lib/utils";

export const metadata: Metadata = {
  title: "每日热点",
  description:
    "微博、知乎、百度、抖音、B 站、GitHub、掘金、36 氪 8 个平台的热榜聚合，按来源切换，支持手动刷新，抓取失败自动回退缓存与示例数据。",
};

export const dynamic = "force-dynamic";

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export default function DailyHotPage() {
  const boards = getCachedBoards();
  const configured = hotApiConfigured();
  const today = localDateKey();
  const weekday = WEEKDAYS[new Date().getDay()];
  const totalItems = boards.reduce((sum, board) => sum + board.items.length, 0);
  const liveSources = boards.filter((board) => board.live).length;

  return (
    <>
      <PageHeader
        eyebrow="DAILY HOT"
        title="每日热点"
        desc="把分散在各平台的热榜收进同一页。默认读本地缓存，抓取失败不会影响打开；没有配置数据源时使用明确标注的示例数据。"
        icon={<Icon name="flame" size={26} />}
        actions={
          <>
            <span className="tag tag-sun">
              {today} · {weekday}
            </span>
            <span className="tag">
              {totalItems} 条 · 实时 {liveSources}/{boards.length}
            </span>
            <Link href="/daily-brief" className="btn btn-sm">
              <Icon name="text" size={14} />
              生成简报
            </Link>
          </>
        }
      />

      <div className="shell py-10 md:py-12">
        <HotBoardPanel
          sources={HOT_SOURCES}
          initialBoards={boards}
          configured={configured}
          today={today}
        />
      </div>
    </>
  );
}
