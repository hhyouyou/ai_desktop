import Link from "next/link";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * 演示模式徽标：没有 API Key 时必须显著可见，并引导去设置页配置。
 * 真实连接时显示模型名，避免用户误以为在用演示内容。
 */
export function DemoBadge({
  demo,
  model,
  className,
}: {
  demo: boolean;
  model?: string;
  className?: string;
}) {
  if (!demo) {
    return (
      <span className={cn("tag tag-mint gap-1.5", className)} title="已配置 API Key，正在调用真实模型">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-ink" />
        真实模型
        {model ? <span className="hidden sm:inline"> · {model}</span> : null}
      </span>
    );
  }
  return (
    <Link
      href="/ai/app/settings"
      className={cn("tag tag-sun gap-1.5 hover:-translate-y-0.5 transition-transform", className)}
      title="当前没有可用的 API Key，所有 AI 功能使用内置演示内容。点此去配置。"
    >
      <Icon name="spark" size={11} />
      演示模式
      <span className="text-[10px] font-bold underline decoration-ink/40 underline-offset-2">去配置</span>
    </Link>
  );
}

/** 演示模式说明条，放在工作区显著位置 */
export function DemoNotice({ demo, model }: { demo: boolean; model: string }) {
  if (!demo) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[14px] edge-2 bg-sun/70 px-3 py-2 text-[12px] leading-snug">
      <span className="flex h-5 w-5 items-center justify-center rounded-full edge-2 bg-paper">
        <Icon name="spark" size={11} />
      </span>
      <span className="font-extrabold">演示模式运行中</span>
      <span className="text-ink-soft">
        未检测到 API Key，当前结果来自内置模板，不会请求外部接口。
      </span>
      <Link
        href="/ai/app/settings"
        className="ml-auto shrink-0 font-extrabold underline decoration-[3px] decoration-coral underline-offset-2"
      >
        配置模型
      </Link>
      <span className="hidden text-[11px] text-ink-soft sm:inline">（演示内容由内置模板生成）</span>
    </div>
  );
}
