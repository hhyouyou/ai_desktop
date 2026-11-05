import Link from "next/link";
import { Logo } from "@/components/icons";
import { FOOTER_COLUMNS, SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="site-footer mt-24 edge-t bg-cream">
      <div className="shell py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <Logo size={40} />
              <span className="flex flex-col leading-none">
                <span className="font-[family-name:var(--font-display)] text-[21px]">
                  {SITE.name}
                </span>
                <span className="eyebrow mt-1 text-[9px]">{SITE.nameEn}</span>
              </span>
            </Link>
            <p className="mt-4 max-w-[280px] text-[13.5px] leading-relaxed text-ink-soft">
              {SITE.tagline}。工具在浏览器本地运行，文件不上传服务器。
            </p>
            <p className="mt-4 inline-flex rotate-[-1.5deg] edge-2 bg-sun px-3 py-1 text-[11.5px] font-extrabold">
              {SITE.author} · 独立作品
            </p>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.12em]">
                {col.title}
              </h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[13.5px] text-ink-soft transition-colors hover:text-ink hover:underline hover:decoration-sun hover:decoration-[3px] hover:underline-offset-2"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t-2 border-dashed border-ink/30 pt-6 text-[12px] text-ink-soft md:flex-row md:items-center md:justify-between">
          <p>
            © {SITE.year} {SITE.fullName}. 保留所有权利。
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-[11px]">
              本站为原创独立项目，与 TTKit 及任何第三方站点无关。
            </span>
            <span className="tag tag-sun text-[10px]">Next.js</span>
            <span className="tag text-[10px]">SQLite</span>
            {SITE.icp ? (
              <span className="text-[11px]">{SITE.icp}</span>
            ) : (
              <span className="text-[11px]">备案号：待备案</span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
