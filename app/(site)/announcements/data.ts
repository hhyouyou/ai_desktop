/**
 * 公告数据访问（页面与 /api/announcements 共用）。
 * 表为空时自动写入 2-3 条种子公告，保证首次打开不是空白页。
 */
import { db } from "@/lib/db";
import { uid } from "@/lib/utils";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: number;
};

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  pinned: number;
  created_at: number;
};

type SeedAnnouncement = {
  title: string;
  body: string;
  pinned: boolean;
};

const SEED_ANNOUNCEMENTS: SeedAnnouncement[] = [
  {
    title: "块集 v0.1 上线",
    body: `工具箱、AI 助手、视觉创作、每日热点、AI 简报、技术博客与待办清单，已经收进同一套界面。
当前版本先把基础体验做稳：14 款本地工具、3 个 AI 入口、8 个热点来源，全部中文界面。
使用中遇到问题或有想补的工具，欢迎通过底部联系方式反馈。`,
    pinned: true,
  },
  {
    title: "全部工具默认在浏览器本地计算",
    body: `图片压缩、裁剪、九宫格、JSON 格式化、Base64、MD5、二维码、密码生成等工具都在浏览器内完成，文件和文本不会上传到服务器。
只有 AI 对话、简报生成这类需要模型能力的功能，才会把必要内容发送到你自己配置的接口。
断网状态下，本地工具依然可用。`,
    pinned: false,
  },
  {
    title: "每日热点与 AI 简报开放",
    body: `每日热点聚合微博、知乎、百度、抖音、B 站、GitHub、掘金与 36 氪 8 个来源，支持按来源切换和手动刷新。
AI 简报会把热榜整理成「今日关键词 / 3 条主线 / 值得一读 / 一句话总结」；没有配置模型时用模板规则生成，并在页面上标注演示模式。
简报保存在本地数据库，可以按日期回看。`,
    pinned: false,
  },
];

/** 表为空时写入种子公告（幂等） */
export function seedAnnouncements(): void {
  const row = db.prepare("SELECT COUNT(*) AS count FROM announcements").get() as { count: number };
  if (row.count > 0) return;

  const now = Date.now();
  const insert = db.prepare(
    "INSERT INTO announcements (id, title, body, pinned, created_at) VALUES (?, ?, ?, ?, ?)",
  );
  db.transaction(() => {
    SEED_ANNOUNCEMENTS.forEach((item, index) => {
      insert.run(uid("ann"), item.title, item.body, item.pinned ? 1 : 0, now - index * 2 * 86_400_000);
    });
  })();
}

export function listAnnouncements(): Announcement[] {
  seedAnnouncements();
  const rows = db
    .prepare(
      "SELECT id, title, body, pinned, created_at FROM announcements ORDER BY pinned DESC, created_at DESC",
    )
    .all() as AnnouncementRow[];
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    pinned: row.pinned === 1,
    createdAt: row.created_at,
  }));
}
