import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/ui/section-heading";
import { AiNav } from "@/components/ai/ai-nav";
import { ChatClient } from "@/components/ai/chat-client";
import { aiEnvStatus } from "@/lib/ai/config";
import { listMessages, listThreads } from "@/lib/ai/store";

export const metadata: Metadata = {
  title: "AI 对话",
  description:
    "块集 AI 对话：流式回复、多轮上下文、会话保存与重新生成。支持任意 OpenAI 兼容接口，没有 API Key 时进入演示模式。",
};

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string }>;
}) {
  const viewer = await getViewer();
  const { thread: threadParam } = await searchParams;
  const threads = listThreads(viewer.id);
  const activeThread = threads.find((thread) => thread.id === threadParam) ?? threads[0] ?? null;
  const messages = activeThread ? listMessages(activeThread.id) : [];
  const status = aiEnvStatus();

  return (
    <div>
      <PageHeader
        eyebrow="AI CHAT"
        title="AI 对话"
        desc="流式回复、多轮上下文与会话保存。支持任意 OpenAI 兼容接口；没有 Key 时进入演示模式，交互流程照样完整。"
        icon={<Icon name="spark" size={24} />}
        actions={
          <>
            <span className="tag tag-coral">流式输出</span>
            <span className="tag">会话自动保存</span>
            <span className="tag tag-mint">最近 40 条上下文</span>
          </>
        }
      />
      <AiNav />
      <ChatClient
        initialThreads={threads}
        initialActiveId={activeThread?.id ?? null}
        initialMessages={messages}
        demo={status.demo}
        model={status.model}
      />
    </div>
  );
}
