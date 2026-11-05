import type { Metadata } from "next";
import { Icon } from "@/components/icons";
import { ToolsBrowser } from "@/components/tools/tools-browser";
import { PageHeader } from "@/components/ui/section-heading";
import { getViewer } from "@/lib/auth";
import { TOOLS } from "@/lib/site";
import { getFavoriteSlugs } from "@/lib/tools/favorites";

export const metadata: Metadata = {
  title: "在线工具箱",
  description:
    "块集在线工具箱：图片压缩、JSON 格式化、二维码生成、密码生成、文本对比等 14 款即开即用的工具，全部在浏览器本地运行，文件不上传。",
};

const REASONS = [
  {
    icon: "lock" as const,
    title: "文件不出本机",
    desc: "图片压缩、裁剪、切图和 MD5 校验都在浏览器里读取文件，不会上传到服务器。",
    accent: "mint",
  },
  {
    icon: "spark" as const,
    title: "打开就能算",
    desc: "没有排队和上传等待，输入内容立即得到结果，适合频繁的小任务。",
    accent: "sun",
  },
  {
    icon: "grid" as const,
    title: "移动端也能用",
    desc: "页面按手机屏幕重新排版，键盘、滑杆和下载按钮都保持可用。",
    accent: "sky",
  },
];

export default async function AppsPage() {
  const viewer = await getViewer();
  const favorites = getFavoriteSlugs(viewer.id).filter((slug) => TOOLS.some((tool) => tool.slug === slug));

  return (
    <div>
      <PageHeader
        eyebrow="TOOLS"
        title="在线工具箱，让小问题轻松解决"
        desc={`${TOOLS.length} 款即开即用的小工具：图片压缩、JSON 格式化、二维码、密码生成、房贷计算……全部在浏览器本地完成，文件不上传。`}
        icon={<Icon name="grid" size={26} />}
        actions={
          <>
            <span className="tag tag-sun">{TOOLS.length} 款工具</span>
            <span className="tag">无需注册</span>
            <span className="tag">本地运行</span>
          </>
        }
      />

      <section className="shell py-8 md:py-12">
        <ToolsBrowser tools={TOOLS} initialFavorites={favorites} />
      </section>

      <section className="shell pb-14 md:pb-16">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">WHY LOCAL</p>
            <h2 className="display-lg mt-1">为什么都在本地算</h2>
          </div>
          <p className="max-w-[440px] text-[13px] leading-relaxed text-ink-soft">
            工具箱里没有「上传中」这一步：浏览器直接读取你选的文件、在你的设备上完成计算，再把结果交给你。
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {REASONS.map((reason) => (
            <div key={reason.title} className="rounded-[24px] edge bg-cream p-5">
              <span
                className={
                  reason.accent === "mint"
                    ? "flex h-11 w-11 items-center justify-center rounded-[14px] edge bg-mint"
                    : reason.accent === "sun"
                      ? "flex h-11 w-11 items-center justify-center rounded-[14px] edge bg-sun"
                      : "flex h-11 w-11 items-center justify-center rounded-[14px] edge bg-sky"
                }
              >
                <Icon name={reason.icon} size={19} />
              </span>
              <h3 className="mt-4 text-[16px] font-extrabold">{reason.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">{reason.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
