import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { Icon } from "@/components/icons";
import { PageHeader, Stat } from "@/components/ui/section-heading";
import { AiNav } from "@/components/ai/ai-nav";
import { CreationsClient } from "@/components/ai/creations-client";
import { listDrawings } from "@/lib/ai/store";

export const metadata: Metadata = {
  title: "我的创作",
  description:
    "查看和管理你保存过的 AI 画图作品：查看大图、复制提示词、用同一提示词再生成，或删除不要的记录。",
};

export default async function CreationsPage() {
  const viewer = await getViewer();
  const drawings = listDrawings(viewer.id, true);
  const savedCount = drawings.filter((drawing) => drawing.status === "done").length;
  const previewCount = drawings.length - savedCount;
  const proceduralCount = drawings.filter(
    (drawing) => drawing.model === "blockset-geometric-v1",
  ).length;

  return (
    <div>
      <PageHeader
        eyebrow="MY CREATIONS"
        title="我的创作"
        desc="按访客隔离保存，不需要登录。刚生成还没保存的预览也会出现在这里，点「保存」才会长期保留。"
        icon={<Icon name="heart" size={24} />}
        actions={
          <>
            <Link href="/drawing/create" className="btn btn-sm btn-primary">
              <Icon name="brush" size={13} />
              再画一张
            </Link>
            <Link href="/drawing/gallery" className="btn btn-sm">
              <Icon name="image" size={13} />
              灵感画廊
            </Link>
          </>
        }
      />
      <AiNav />

      <section className="shell pt-5">
        <div className="grid max-w-[620px] grid-cols-3 gap-3">
          <Stat value={savedCount} label="张已保存" accent="violet" />
          <Stat value={previewCount} label="张待保存" accent="sun" />
          <Stat value={proceduralCount} label="张程序化生成" accent="mint" />
        </div>
      </section>

      <CreationsClient initialDrawings={drawings} />
    </div>
  );
}
