import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/ui/section-heading";
import { AiNav } from "@/components/ai/ai-nav";
import { GalleryClient, type GalleryCard } from "@/components/ai/gallery-client";
import { GALLERY_ITEMS } from "@/lib/ai/gallery";
import { buildProceduralSvg } from "@/lib/ai/svg";

export const metadata: Metadata = {
  title: "灵感画廊",
  description:
    "12 条精选提示词，覆盖抽象几何、自然风景、城市建筑、人物角色、静物产品与科幻未来。点一下就能带着提示词去生成。",
};

/** 服务端把预览图转成 base64 data URL：比百分号编码小很多，页面体积可控 */
function previewDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

export default function GalleryPage() {
  const items: GalleryCard[] = GALLERY_ITEMS.map((item) => ({
    ...item,
    preview: previewDataUrl(
      buildProceduralSvg({ prompt: item.prompt, style: item.style, size: "1:1" }),
    ),
  }));

  return (
    <div>
      <PageHeader
        eyebrow="PROMPT GALLERY"
        title="灵感画廊"
        desc="不知道怎么描述画面时，从这 12 条提示词开始。点「用它生成」会把提示词、风格和画幅一起带进创建页。"
        icon={<Icon name="image" size={24} />}
        actions={
          <>
            <Link href="/drawing/create" className="btn btn-sm btn-primary">
              <Icon name="brush" size={13} />
              直接去画图
            </Link>
            <Link href="/drawing/creations" className="btn btn-sm">
              <Icon name="heart" size={13} />
              我的创作
            </Link>
          </>
        }
      />
      <AiNav />
      <GalleryClient items={items} />
    </div>
  );
}
