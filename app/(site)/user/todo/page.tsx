import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/ui/section-heading";
import { TodoBoard } from "@/components/user/todo-board";
import { getViewer } from "@/lib/auth";
import { listTodos } from "@/lib/todos";
import { localDateKey } from "@/lib/utils";

export const metadata: Metadata = {
  title: "待办清单",
  description: "块集 BlockSet 待办清单：快速记录、按优先级整理、勾选完成，并查看完成率与节奏分析。",
};

export default async function TodoPage() {
  const viewer = await getViewer();
  const todos = listTodos(viewer.id, "all");

  return (
    <>
      <PageHeader
        eyebrow="TODO"
        title="待办清单"
        icon={<Icon name="check" size={26} />}
        desc={
          viewer.anonymous
            ? "当前是匿名身份，数据保存在本机服务器上；注册邮箱后可以保留全部内容并换设备登录。"
            : `已登录为 ${viewer.name}。把要做的事写下来，一条一条划掉。`
        }
        actions={
          <>
            <Link href="/user/todo/analysis" className="btn btn-sm">
              <Icon name="calc" size={14} />
              待办分析
            </Link>
            <Link href="/settings" className="btn btn-sm btn-ink">
              <Icon name="settings" size={14} />
              设置
            </Link>
          </>
        }
      />
      <div className="shell py-8 md:py-10">
        <TodoBoard initialTodos={todos} today={localDateKey()} />
      </div>
    </>
  );
}
