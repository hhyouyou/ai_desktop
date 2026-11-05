import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/ui/section-heading";
import { AiNav } from "@/components/ai/ai-nav";
import { WritingClient } from "@/components/ai/writing-client";
import { aiEnvStatus } from "@/lib/ai/config";

export const metadata: Metadata = {
  title: "AI 写作",
  description:
    "块集 AI 写作：小红书文案、公众号长文、工作邮件与标题改写，四个体裁共用一套流式生成，可一键变成待办。",
};

/** 页面要读取运行时环境变量，不能在建构建时静态化 */
export const dynamic = "force-dynamic";

export default async function WritingPage() {
  const status = aiEnvStatus();

  return (
    <div>
      <PageHeader
        eyebrow="AI WRITING"
        title="AI 写作"
        desc="选体裁、填主题、定语气，右侧直接出成稿。支持一键变成待办，生成结果可以随时复制。"
        icon={<Icon name="pen" size={24} />}
        actions={
          <>
            <Link href="/drawing/create" className="btn btn-sm">
              <Icon name="brush" size={13} />
              去画图
            </Link>
            <span className="tag tag-coral">4 种体裁</span>
            <span className="tag">一键变待办</span>
          </>
        }
      />
      <AiNav />
      <WritingClient demo={status.demo} model={status.model} />
    </div>
  );
}
