import Link from "next/link";
import { Icon, Logo } from "@/components/icons";
import { PageHeader, SectionHeading } from "@/components/ui/section-heading";
import { ACCENT_TILE } from "@/lib/accent";
import { MODULES, SITE, TOOLS } from "@/lib/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "关于块集",
  description: "块集 BlockSet 是一个原创的在线工具箱与 AI 助手站点，说明它的设计原则、技术栈与数据边界。",
};

const PRINCIPLES = [
  {
    title: "能本地算的，绝不上传",
    desc: "图片压缩、JSON 格式化、MD5、密码生成全部在浏览器里完成。服务器看不到你的文件，也不该看到。",
    accent: "coral" as const,
    icon: "lock" as const,
  },
  {
    title: "一个地方，一件事",
    desc: "每个工具只解决一个问题，界面只保留必要输入。不弹广告，不做会员墙，不要求注册才能用。",
    accent: "sun" as const,
    icon: "grid" as const,
  },
  {
    title: "没有 Key 也要体面",
    desc: "AI 模块在未配置接口时进入演示模式：界面完整可走通，结果明确标注为演示，而不是甩一个报错。",
    accent: "mint" as const,
    icon: "spark" as const,
  },
  {
    title: "数据要说清楚",
    desc: "哪些是实时数据、哪些是示例数据，界面上必须写明白。演示数据不会伪装成真实热榜。",
    accent: "blue" as const,
    icon: "book" as const,
  },
];

const STACK = [
  { name: "Next.js 16", desc: "App Router + Turbopack，服务端组件与路由处理器" },
  { name: "React 19", desc: "客户端交互与流式渲染" },
  { name: "TypeScript strict", desc: "全量类型约束，无 any" },
  { name: "Tailwind CSS v4", desc: "设计令牌 + 手写几何组件类" },
  { name: "SQLite / better-sqlite3", desc: "单文件数据库，待办、会话、创作记录" },
  { name: "OpenAI 兼容协议", desc: "对话、写作、画图统一走一套接口" },
];

export default function AboutPage() {
  return (
    <div>
      <PageHeader
        eyebrow="About"
        title="关于块集"
        desc={`${SITE.name}是一个把日常小动作收进同一处的工具站。没有融资故事，只有一堆「这事我每周都要做一遍」的重复劳动。`}
        icon={<Logo size={30} />}
      />

      <div className="shell py-12 md:py-16">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="surface p-6 md:p-8">
            <p className="eyebrow">Origin</p>
            <h2 className="display-lg mt-2">它为什么存在</h2>
            <div className="prose-blockset mt-4">
              <p>
                起点很小：每周都要把同一张截图压到 200KB 以内，发到不同的群里。后来发现这样的动作有一串——
                格式化一段 JSON、生成一个 Wi-Fi 二维码、算一次房贷月供、把长图切成九宫格。
              </p>
              <p>
                这些事单独看都很小，但分散在七八个网站里，每个都有自己的广告、登录和会员墙。
                于是有了 {SITE.name}：<strong>一个地方，一件事，一次点击</strong>。
              </p>
              <blockquote>
                工具的最高评价不是「功能强大」，而是「下次我还会打开它」。
              </blockquote>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                { value: TOOLS.length, label: "款工具", accent: "sun" as const },
                { value: "100%", label: "本地计算", accent: "mint" as const },
                { value: MODULES.length, label: "个模块", accent: "sky" as const },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-[18px] edge px-4 py-3 shadow-hard-sm ${ACCENT_TILE[item.accent]}`}
                >
                  <p className="font-[family-name:var(--font-display)] text-[24px] leading-none">
                    {item.value}
                  </p>
                  <p className="mt-1 text-[11.5px] font-bold opacity-80">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-cream p-6 md:p-8">
            <p className="eyebrow">Notice</p>
            <h2 className="mt-2 text-[20px] font-extrabold">站点声明</h2>
            <ul className="mt-4 space-y-3 text-[13.5px] leading-relaxed text-ink-soft">
              <li className="flex gap-2">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-coral" />
                <span>
                  本站是<strong className="text-ink">原创独立项目</strong>，与 TTKit 或任何第三方工具箱站点
                  无隶属、无合作关系，未使用其代码、素材或文案。
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue" />
                <span>
                  热点与简报模块在未接入数据源时使用<strong className="text-ink">示例数据</strong>，
                  仅用于演示界面与交互，不代表真实新闻。
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-mint" />
                <span>
                  AI 模块在未配置接口时运行在<strong className="text-ink">演示模式</strong>，
                  输出内容为预置示例，不可用于事实判断。
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet" />
                <span>
                  用户的待办、会话与创作记录存储在本机 SQLite（或你部署的服务器），
                  不上传到第三方；匿名访客无需注册即可使用。
                </span>
              </li>
            </ul>
            <p className="mt-5 rounded-[14px] border-2 border-dashed border-ink/30 bg-paper/70 p-3 text-[12px] text-ink-soft">
              正式对外上线前，请替换为你的主体信息，并完成 ICP 备案与生成式 AI 相关合规要求。
              详见仓库内 <code className="font-[family-name:var(--font-mono)]">docs/RISK.md</code>。
            </p>
          </div>
        </div>
      </div>

      <section className="shell pb-14">
        <SectionHeading eyebrow="Principles" title="四条设计原则" />
        <div className="grid gap-4 md:grid-cols-2">
          {PRINCIPLES.map((item) => (
            <div key={item.title} className="surface p-5">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-[12px] edge ${ACCENT_TILE[item.accent]}`}
                >
                  <Icon name={item.icon} size={19} />
                </span>
                <h3 className="text-[16px] font-extrabold">{item.title}</h3>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="shell pb-14">
        <SectionHeading eyebrow="Stack" title="技术栈" desc="没有隐藏的服务，所有模块都在这套栈上。" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STACK.map((item) => (
            <div key={item.name} className="surface-tight p-4">
              <p className="text-[14px] font-extrabold">{item.name}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="shell pb-16">
        <SectionHeading eyebrow="Modules" title="站点里有什么" href="/apps" linkLabel="去工具箱" />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((mod) => (
            <Link key={mod.title} href={mod.href} className="surface-tight hover-lift flex items-center gap-3 p-4">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-[12px] border-[2px] border-ink ${ACCENT_TILE[mod.accent]}`}
              >
                <Icon name={mod.icon} size={18} />
              </span>
              <span>
                <span className="block text-[14px] font-extrabold">{mod.title}</span>
                <span className="block text-[12px] text-ink-soft">{mod.meta}</span>
              </span>
              <Icon name="arrow" size={15} className="ml-auto text-ink-soft" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
