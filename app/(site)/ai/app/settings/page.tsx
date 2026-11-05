import type { Metadata } from "next";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/ui/section-heading";
import { AiNav } from "@/components/ai/ai-nav";
import { SettingsClient } from "@/components/ai/settings-client";
import { aiEnvStatus } from "@/lib/ai/config";

export const metadata: Metadata = {
  title: "模型设置",
  description:
    "配置块集 AI 的接口地址、API Key、对话模型与画图模型。Key 只保存在本地浏览器，服务端可用环境变量兜底。",
};

/** 页面要读取运行时环境变量，不能在建构建时静态化 */
export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const status = aiEnvStatus();

  return (
    <div>
      <PageHeader
        eyebrow="AI SETTINGS"
        title="模型设置"
        desc="接口地址、API Key、模型名都在这里配。不填也能用——所有 AI 功能会进入演示模式，并明确标注。"
        icon={<Icon name="settings" size={24} />}
        actions={
          <>
            <span className="tag tag-violet">本地保存</span>
            <span className="tag">支持 OpenAI 兼容接口</span>
          </>
        }
      />
      <AiNav />
      <SettingsClient status={status} />
    </div>
  );
}
