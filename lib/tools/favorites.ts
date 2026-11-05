/** 收藏读写的服务端辅助（只能在服务端模块 / 路由处理器里用）。 */

import { db } from "@/lib/db";

export type FavoriteRow = { tool_slug: string; created_at: number };

export function getFavoriteSlugs(userId: string): string[] {
  const rows = db
    .prepare("SELECT tool_slug FROM favorites WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as FavoriteRow[];
  return rows.map((row) => row.tool_slug);
}

export function isFavorite(userId: string, slug: string): boolean {
  const row = db
    .prepare("SELECT 1 AS hit FROM favorites WHERE user_id = ? AND tool_slug = ?")
    .get(userId, slug) as { hit: number } | undefined;
  return Boolean(row);
}

/** 切换收藏状态，返回切换后的结果 */
export function toggleFavorite(userId: string, slug: string): boolean {
  const favorited = isFavorite(userId, slug);
  if (favorited) {
    db.prepare("DELETE FROM favorites WHERE user_id = ? AND tool_slug = ?").run(userId, slug);
    return false;
  }
  db.prepare(
    "INSERT INTO favorites (user_id, tool_slug, created_at) VALUES (?, ?, ?) ON CONFLICT(user_id, tool_slug) DO NOTHING",
  ).run(userId, slug, Date.now());
  return true;
}
