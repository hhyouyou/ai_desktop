import Link from "next/link";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/ui/section-heading";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "支持与赞赏",
  description: "支持块集 BlockSet 的几种方式：提建议、分享工具、报告问题。",
};

const WAYS = [
  {
    title: "提一个真实需求",
    desc: "你每周都要重复做、但还没有顺手工具有的动作，就是最值得做的下一块积木。",
    icon: "spark" as const,
    accent: "sun" as const,
    action: "写进 GitHub Issue",
    href: "https://github.com",
  },
  {
    title: "报告一个 Bug",
    desc: "浏览器版本、操作步骤、期望结果。这三样齐了，问题基本就能定位。",
    icon: "settings" as const,
    accent: "blue" as const,
    action: "提交问题",
    href: "https://github.com",
  },
  {
    title: "把工具分享出去",
    desc: "比打赏更有用的支持：让需要压缩图片的同事知道这里有个不用注册的工具。",
    icon: "heart" as const,
    accent: "coral" as const,
    action: "复制站点地址",
    href: "/apps",
  },
];

export default function SupportPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Support"
        title="支持块集继续做下去"
        desc="这是一个没有广告、没有会员墙的个人项目。如果它帮你省下过时间，下面任意一种方式都比金钱更直接。"
      />

      <div className="shell py-12 md:py-16">
        <div className="grid gap-4 md:grid-cols-3">
          {WAYS.map((way, index) => (
            <div key={way.title} className="surface flex flex-col p-5">
              <div className="flex items-start justify-between">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-[14px] edge ${
                    {
                      sun: "bg-sun",
                      blue: "bg-blue text-white",
                      coral: "bg-coral text-white",
                    }[way.accent]
                  }`}
                >
                  <Icon name={way.icon} size={20} />
                </span>
                <span className="eyebrow">0{index + 1}</span>
              </div>
              <h2 className="mt-4 text-[17px] font-extrabold">{way.title}</h2>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-ink-soft">{way.desc}</p>
              <Link href={way.href} className="btn btn-sm mt-5 w-full" target={way.href.startsWith("http") ? "_blank" : undefined}>
                {way.action}
                <Icon name="arrow" size={13} />
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <div className="surface-cream p-6">
            <p className="eyebrow">Coffee</p>
            <h2 className="mt-2 text-[20px] font-extrabold">如果一定要打赏</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
              这里暂时没有放收款码。个人站直接挂收款码在部分支付渠道属于违规行为，
              需要走合规的赞赏渠道。等站点正式上线备案后再补上入口。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="tag tag-sun">暂未开放</span>
              <span className="tag">不接广告</span>
              <span className="tag">不做付费墙</span>
            </div>
          </div>

          <div className="surface p-6">
            <p className="eyebrow">Status</p>
            <h2 className="mt-2 text-[20px] font-extrabold">项目状态</h2>
            <ul className="mt-3 space-y-2 text-[13px]">
              <li className="flex items-center justify-between border-b-2 border-dashed border-ink/15 pb-2">
                <span className="text-ink-soft">版本</span>
                <span className="font-extrabold">v0.1 · 本地开发中</span>
              </li>
              <li className="flex items-center justify-between border-b-2 border-dashed border-ink/15 pb-2">
                <span className="text-ink-soft">数据</span>
                <span className="font-extrabold">本机 SQLite</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-ink-soft">AI</span>
                <span className="font-extrabold">演示模式 / 可接自有 Key</span>
              </li>
            </ul>
            <Link href="/about" className="btn btn-sm mt-4 w-full">
              看站点声明
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
