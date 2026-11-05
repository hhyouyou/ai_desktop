import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

export type Article = {
  slug: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
  readingTime: number;
  html: string;
  plain: string;
};

const ARTICLES_DIR = path.join(process.cwd(), "content", "articles");

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!match) return { data: {}, body: raw };
  const data: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    value = value.replace(/^["']|["']$/g, "");
    data[key] = value;
  }
  return { data, body: raw.slice(match[0].length) };
}

function parseTags(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((t) => t.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function readingMinutes(text: string): number {
  const cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const words = (text.match(/[A-Za-z0-9_]+/g) || []).length;
  return Math.max(1, Math.round(cjk / 350 + words / 200));
}

marked.setOptions({ gfm: true, breaks: false });

function loadAll(): Article[] {
  if (!fs.existsSync(ARTICLES_DIR)) return [];
  const files = fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".md"));
  const articles = files.map((file) => {
    const raw = fs.readFileSync(path.join(ARTICLES_DIR, file), "utf8");
    const { data, body } = parseFrontmatter(raw);
    const slug = file.replace(/\.md$/, "");
    const html = marked.parse(body) as string;
    const plain = body
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/[#>*_`\-|]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return {
      slug,
      title: data.title || slug,
      summary: data.summary || plain.slice(0, 80),
      date: data.date || "2026-01-01",
      tags: parseTags(data.tags),
      readingTime: readingMinutes(plain),
      html,
      plain,
    };
  });
  return articles.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getArticles(): Article[] {
  return loadAll();
}

export function getArticle(slug: string): Article | undefined {
  return loadAll().find((a) => a.slug === slug);
}

export function getLatestArticles(limit = 3): Article[] {
  return loadAll().slice(0, limit);
}

export function allTags(): { tag: string; count: number }[] {
  const map = new Map<string, number>();
  for (const article of loadAll()) {
    for (const tag of article.tags) map.set(tag, (map.get(tag) || 0) + 1);
  }
  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}
