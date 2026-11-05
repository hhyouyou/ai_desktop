/**
 * 站点唯一事实来源：导航、工具注册表、模块定义、文案。
 * 所有页面从这读取，避免各处硬编码。
 */

export const SITE = {
  name: "块集",
  nameEn: "BlockSet",
  fullName: "块集 BlockSet",
  tagline: "在线桌面：工具、AI、待办、热点，一屏收好",
  description:
    "块集 BlockSet 是一个在线桌面：图片压缩、JSON 格式化、二维码等即开即用的小工具，可切换模型的 AI 对话与历史记录，待办规划，以及聚合的多平台热点，都在同一屏完成。",
  url: "http://localhost:4310",
  author: "块集实验室",
  email: "",
  icp: "",
  year: 2026,
  keywords: [
    "在线工具",
    "图片压缩",
    "JSON 格式化",
    "二维码生成",
    "AI 对话",
    "每日热点",
    "待办清单",
  ],
} as const;

export type NavItem = {
  label: string;
  href: string;
  desc: string;
  icon: IconKey;
  badge?: string;
};

export type NavGroup = {
  label: string;
  href: string;
  items: NavItem[];
};

export type IconKey =
  | "grid"
  | "spark"
  | "brush"
  | "flame"
  | "check"
  | "pen"
  | "calc"
  | "lock"
  | "house"
  | "clock"
  | "qr"
  | "braces"
  | "hash"
  | "code"
  | "compress"
  | "crop"
  | "palette"
  | "diff"
  | "text"
  | "arrow"
  | "search"
  | "user"
  | "menu"
  | "close"
  | "copy"
  | "download"
  | "upload"
  | "trash"
  | "plus"
  | "settings"
  | "book"
  | "heart"
  | "image";

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "工具箱",
    href: "/apps",
    items: [
      { label: "全部工具", href: "/apps", desc: "14 款即开即用的小工具", icon: "grid" },
      { label: "网址导航", href: "/menus", desc: "精选站点收藏夹", icon: "book" },
    ],
  },
  {
    label: "AI",
    href: "/ai/app/chat",
    items: [
      { label: "AI 对话", href: "/ai/app/chat", desc: "流式对话与多轮上下文", icon: "spark" },
      { label: "AI 写作", href: "/ai/app/writing", desc: "标题、摘要、润色、大纲", icon: "pen" },
      { label: "模型设置", href: "/ai/app/settings", desc: "接口地址、模型与密钥", icon: "settings" },
    ],
  },
  {
    label: "画图",
    href: "/drawing/create",
    items: [
      { label: "创建图片", href: "/drawing/create", desc: "文字生成图片", icon: "brush" },
      { label: "灵感画廊", href: "/drawing/gallery", desc: "社区风格提示词", icon: "image" },
      { label: "我的创作", href: "/drawing/creations", desc: "历史生成记录", icon: "heart" },
    ],
  },
  {
    label: "内容",
    href: "/daily-hot",
    items: [
      { label: "每日热点", href: "/daily-hot", desc: "多平台热榜聚合", icon: "flame" },
      { label: "AI 简报", href: "/daily-brief", desc: "自动汇总今日要点", icon: "text" },
      { label: "技术博客", href: "/article", desc: "长文与笔记", icon: "book" },
    ],
  },
  {
    label: "效率",
    href: "/user/todo",
    items: [
      { label: "待办清单", href: "/user/todo", desc: "今天要做的事", icon: "check" },
      { label: "待办分析", href: "/user/todo/analysis", desc: "完成率与节奏", icon: "calc" },
      { label: "已安排", href: "/scheduled-tasks", desc: "定时提醒与计划任务", icon: "clock" },
    ],
  },
];

export const TOOL_CATEGORIES = [
  { key: "freq", label: "常用工具", desc: "高频生活计算与安全辅助，打开就能用", accent: "sun" },
  { key: "dev", label: "开发人员", desc: "格式化、编码与效率工具，减少重复操作", accent: "blue" },
  { key: "image", label: "图像处理", desc: "压缩、裁剪与切图，全在浏览器本地完成", accent: "coral" },
  { key: "text", label: "文本处理", desc: "对比、统计与整理，让文字更清楚", accent: "mint" },
] as const;

export type ToolCategoryKey = (typeof TOOL_CATEGORIES)[number]["key"];

export type Tool = {
  slug: string;
  title: string;
  blurb: string;
  category: ToolCategoryKey;
  icon: IconKey;
  hot?: boolean;
  local: boolean;
  tags: string[];
};

export const TOOLS: Tool[] = [
  {
    slug: "calculator",
    title: "计算器",
    blurb: "支持括号、百分比、幂运算与键盘输入的安全表达式计算器。",
    category: "freq",
    icon: "calc",
    local: true,
    tags: ["表达式", "键盘"],
  },
  {
    slug: "gen-password",
    title: "密码生成器",
    blurb: "用浏览器密码学随机源批量生成强密码，并实时估算随机熵。",
    category: "freq",
    icon: "lock",
    hot: true,
    local: true,
    tags: ["安全", "熵"],
  },
  {
    slug: "mortgage-calculator",
    title: "房贷计算器",
    blurb: "等额本息与等额本金，月供、利息总额和还款节奏一眼看清。",
    category: "freq",
    icon: "house",
    local: true,
    tags: ["月供", "利息"],
  },
  {
    slug: "timestamp",
    title: "时间戳转换",
    blurb: "时间戳与日期互转，支持秒/毫秒、时区切换与批量转换。",
    category: "freq",
    icon: "clock",
    local: true,
    tags: ["Unix", "时区"],
  },
  {
    slug: "qrcode",
    title: "二维码生成",
    blurb: "文本、网址、Wi-Fi 与名片二维码，可调尺寸、纠错级别与配色。",
    category: "dev",
    icon: "qr",
    hot: true,
    local: true,
    tags: ["Wi-Fi", "名片"],
  },
  {
    slug: "json-reader",
    title: "JSON 格式化",
    blurb: "格式化、校验并折叠浏览复杂 JSON，支持压缩与树形视图。",
    category: "dev",
    icon: "braces",
    hot: true,
    local: true,
    tags: ["格式化", "校验"],
  },
  {
    slug: "md5",
    title: "MD5 计算",
    blurb: "本地计算文本与文件摘要，支持批量处理与完整性校验。",
    category: "dev",
    icon: "hash",
    local: true,
    tags: ["摘要", "文件"],
  },
  {
    slug: "base64",
    title: "Base64 编解码",
    blurb: "文本与文件的 Base64 编解码，支持 URL Safe 与图片预览。",
    category: "dev",
    icon: "code",
    local: true,
    tags: ["编码", "图片"],
  },
  {
    slug: "image-compression",
    title: "图片压缩",
    blurb: "在浏览器本地压缩图片，尽量保留清晰度，同时显著减小体积。",
    category: "image",
    icon: "compress",
    hot: true,
    local: true,
    tags: ["本地", "WebP"],
  },
  {
    slug: "image-cropper",
    title: "图片裁剪",
    blurb: "按比例或像素精准裁剪，可旋转拉直后导出。",
    category: "image",
    icon: "crop",
    local: true,
    tags: ["裁剪", "旋转"],
  },
  {
    slug: "nine-grid",
    title: "九宫格切图",
    blurb: "一键把图片切成 3×3 九宫格，按顺序打包下载。",
    category: "image",
    icon: "grid",
    local: true,
    tags: ["朋友圈", "切图"],
  },
  {
    slug: "color-picker",
    title: "颜色工具",
    blurb: "取色、调色与配色生成，一键复制 HEX / RGB / HSL。",
    category: "image",
    icon: "palette",
    local: true,
    tags: ["HEX", "配色"],
  },
  {
    slug: "text-diff",
    title: "文本对比",
    blurb: "逐行 diff，高亮新增、删除与修改，支持忽略空白。",
    category: "text",
    icon: "diff",
    local: true,
    tags: ["diff", "逐行"],
  },
  {
    slug: "word-counter",
    title: "字数统计",
    blurb: "中英文字数、字符、段落与预计阅读时长，实时统计。",
    category: "text",
    icon: "text",
    local: true,
    tags: ["统计", "阅读时长"],
  },
];

export const MODULES: {
  title: string;
  desc: string;
  href: string;
  icon: IconKey;
  accent: "sun" | "blue" | "coral" | "mint" | "violet" | "sky";
  meta: string;
}[] = [
  {
    title: "实用工具",
    desc: "把高频、琐碎、重复的操作，做成打开即用的小工具。全部在浏览器本地计算，不上传文件。",
    href: "/apps",
    icon: "grid",
    accent: "sun",
    meta: "14 款",
  },
  {
    title: "AI 助手",
    desc: "对话、写作与模板，把模型能力接进日常工作流；支持任意 OpenAI 兼容接口。",
    href: "/ai/app/chat",
    icon: "spark",
    accent: "coral",
    meta: "3 个入口",
  },
  {
    title: "视觉创作",
    desc: "文字生成图片、提示词画廊与创作管理，让灵感从描述走到成品。",
    href: "/drawing/create",
    icon: "brush",
    accent: "violet",
    meta: "画图",
  },
  {
    title: "信息聚合",
    desc: "多平台热榜与 AI 简报，把分散的信息汇成一页可读的今日要点。",
    href: "/daily-hot",
    icon: "flame",
    accent: "blue",
    meta: "8 个来源",
  },
  {
    title: "个人管理",
    desc: "待办、完成率分析与定时任务，把计划变成可以追踪的行动。",
    href: "/user/todo",
    icon: "check",
    accent: "mint",
    meta: "待办",
  },
  {
    title: "内容表达",
    desc: "通过长文、简报与 RSS，把学习过程整理成可复用的内容。",
    href: "/article",
    icon: "pen",
    accent: "sky",
    meta: "博客",
  },
];

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export function toolsInCategory(key: ToolCategoryKey): Tool[] {
  return TOOLS.filter((t) => t.category === key);
}

export function getCategory(key: ToolCategoryKey) {
  return TOOL_CATEGORIES.find((c) => c.key === key)!;
}

/** 顶栏展示的一级入口 */
export const PRIMARY_NAV = NAV_GROUPS.map((g) => ({ label: g.label, href: g.href }));

/** 页脚栏目 */
export const FOOTER_COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "工具与 AI",
    links: [
      { label: "全部工具", href: "/apps" },
      { label: "网址导航", href: "/menus" },
      { label: "AI 对话", href: "/ai/app/chat" },
      { label: "AI 写作", href: "/ai/app/writing" },
      { label: "创建图片", href: "/drawing/create" },
    ],
  },
  {
    title: "效率与内容",
    links: [
      { label: "待办清单", href: "/user/todo" },
      { label: "已安排", href: "/scheduled-tasks" },
      { label: "每日热点", href: "/daily-hot" },
      { label: "AI 简报", href: "/daily-brief" },
      { label: "技术博客", href: "/article" },
    ],
  },
  {
    title: "关于与支持",
    links: [
      { label: "关于块集", href: "/about" },
      { label: "赞赏支持", href: "/support" },
      { label: "公告", href: "/announcements" },
      { label: "RSS 订阅", href: "/rss.xml" },
    ],
  },
];
