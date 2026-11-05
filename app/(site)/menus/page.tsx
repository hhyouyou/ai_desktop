import type { Metadata } from "next";
import { Icon } from "@/components/icons";
import { MenuDirectory } from "@/components/content/menu-directory";
import { MENU_GROUPS, MENU_TOTAL } from "@/components/content/menu-data";
import { PageHeader } from "@/components/ui/section-heading";

export const metadata: Metadata = {
  title: "网址导航",
  description:
    "块集精选网址导航：开发工具、设计资源、学习阅读与效率服务，20 多个常用站点按场景分组，支持关键词搜索。",
};

export const dynamic = "force-static";

export default function MenusPage() {
  return (
    <>
      <PageHeader
        eyebrow="BOOKMARKS"
        title="网址导航"
        desc="常用站点按场景分好组：查文档、找素材、读长文、处理日常杂事。支持按名称、描述或域名搜索。"
        icon={<Icon name="book" size={26} />}
        actions={
          <>
            <span className="tag tag-sun">{MENU_TOTAL} 个站点</span>
            <span className="tag">{MENU_GROUPS.length} 个分组</span>
          </>
        }
      />

      <div className="shell py-10 md:py-12">
        <MenuDirectory groups={MENU_GROUPS} total={MENU_TOTAL} />
      </div>
    </>
  );
}
