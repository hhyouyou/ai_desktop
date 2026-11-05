import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/ui/section-heading";
import { AiNav } from "@/components/ai/ai-nav";
import { DrawingCreateClient } from "@/components/ai/drawing-create-client";
import { aiEnvStatus } from "@/lib/ai/config";
import {
  isDrawingSize,
  isDrawingStyle,
  type DrawingSizeKey,
  type DrawingStyleKey,
} from "@/lib/ai/svg";

export const metadata: Metadata = {
  title: "创建图片",
  description:
    "块集画图：输入提示词生成几何插画，五种风格与三种画幅。没有 API Key 时由站内程序化几何引擎出图，不消耗额度。",
};

/** 页面要读取运行时环境变量，不能在建构建时静态化 */
export const dynamic = "force-dynamic";

export default async function DrawingCreatePage({
  searchParams,
}: {
  searchParams: Promise<{ prompt?: string; style?: string; size?: string }>;
}) {
  const params = await searchParams;
  const status = aiEnvStatus();
  // Next 已经对 searchParams 解码过一次，这里只做长度与类型防御
  const prompt = typeof params.prompt === "string" ? params.prompt.slice(0, 500) : "";
  const style: DrawingStyleKey =
    typeof params.style === "string" && isDrawingStyle(params.style) ? params.style : "flat";
  const size: DrawingSizeKey =
    typeof params.size === "string" && isDrawingSize(params.size) ? params.size : "1:1";

  return (
    <div>
      <PageHeader
        eyebrow="DRAWING STUDIO"
        title="创建图片"
        desc="描述画面、选画幅与风格，生成后会先存成预览，点「保存到我的创作」才归档。演示模式下用程序化几何引擎出图。"
        icon={<Icon name="brush" size={24} />}
        actions={
          <>
            <Link href="/drawing/gallery" className="btn btn-sm">
              <Icon name="image" size={13} />
              灵感画廊
            </Link>
            <Link href="/drawing/creations" className="btn btn-sm">
              <Icon name="heart" size={13} />
              我的创作
            </Link>
          </>
        }
      />
      <AiNav />
      <DrawingCreateClient
        initialPrompt={prompt}
        initialStyle={style}
        initialSize={size}
        demo={status.demo}
        imageModel={status.imageModel}
      />
    </div>
  );
}
