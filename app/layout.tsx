import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import "./themes.css";
import { SITE } from "@/lib/site";
import { THEME_COOKIE, normalizeTheme } from "@/lib/theme";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.fullName} · 在线桌面 · 工具箱、AI 助手与每日热点`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [...SITE.keywords],
  applicationName: SITE.fullName,
  authors: [{ name: SITE.author }],
  openGraph: {
    type: "website",
    title: SITE.fullName,
    description: SITE.description,
    siteName: SITE.fullName,
    locale: "zh_CN",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#efe9dc",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const store = await cookies();
  const theme = normalizeTheme(store.get(THEME_COOKIE)?.value);

  return (
    <html lang="zh-CN" data-theme={theme}>
      <body className="min-h-screen bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
