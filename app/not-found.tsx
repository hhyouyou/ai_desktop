import Link from "next/link";
import { Icon } from "@/components/icons";

export default function NotFound() {
  return (
    <div className="relative overflow-hidden">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" />
      <div className="shell relative flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
        <div className="relative mb-8 h-40 w-40">
          <div className="absolute inset-0 rotate-12 rounded-[32px] edge bg-coral shadow-hard" />
          <div className="absolute inset-4 -rotate-6 rounded-[26px] edge bg-sun shadow-hard" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-[family-name:var(--font-display)] text-[52px] leading-none">404</span>
          </div>
          <div className="absolute -right-6 -top-3 rotate-6 rounded-full edge bg-mint px-3 py-1 text-[11px] font-extrabold shadow-hard-sm">
            走丢了
          </div>
        </div>

        <h1 className="display-lg">这块积木不存在</h1>
        <p className="mt-3 max-w-[420px] text-[14px] leading-relaxed text-ink-soft">
          链接可能拼错了，或者这个工具还没做出来。回工具箱看看，14 块积木都在原地。
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link href="/apps" className="btn btn-primary">
            <Icon name="grid" size={16} />
            去工具箱
          </Link>
          <Link href="/" className="btn">
            回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
