import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { getViewer } from "@/lib/auth";

export default async function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getViewer();

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:edge focus:border-ink focus:bg-sun focus:px-4 focus:py-2 focus:font-bold"
      >
        跳到主要内容
      </a>
      <SiteHeader viewerName={viewer.name} anonymous={viewer.anonymous} />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
