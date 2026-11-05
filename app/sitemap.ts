import type { MetadataRoute } from "next";
import { getArticles } from "@/lib/articles";
import { SITE, TOOLS } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE.url.replace(/\/$/, "");
  const now = new Date();

  const staticRoutes = [
    "",
    "/apps",
    "/ai/app/chat",
    "/ai/app/writing",
    "/ai/app/settings",
    "/drawing/create",
    "/drawing/gallery",
    "/drawing/creations",
    "/daily-hot",
    "/daily-brief",
    "/article",
    "/announcements",
    "/menus",
    "/user/todo",
    "/user/todo/analysis",
    "/scheduled-tasks",
    "/auth/login",
    "/settings",
    "/about",
    "/support",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const toolRoutes = TOOLS.map((tool) => ({
    url: `${base}/apps/${tool.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const articleRoutes = getArticles().map((article) => ({
    url: `${base}/article/${article.slug}`,
    lastModified: new Date(article.date),
    changeFrequency: "yearly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...toolRoutes, ...articleRoutes];
}
