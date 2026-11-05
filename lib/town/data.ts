/**
 * 小镇的唯一事实来源：建筑定义、纸模色板、坐标布局。
 * 每栋建筑对应站点的一个入口，改这里就能改小镇。
 */

export type RoofKind = "gable" | "flat" | "pyramid" | "dome" | "tower";

export type AccentKey = "coral" | "sun" | "blue" | "mint" | "violet" | "sky";

export type ExtraKind =
  | "chimney"
  | "awning"
  | "antenna"
  | "clock"
  | "flag"
  | "board"
  | "columns"
  | "tank"
  | "lantern";

export type BuildingDef = {
  id: string;
  /** 建筑名，如「工坊」 */
  name: string;
  /** 对应的功能名，如「工具箱」 */
  label: string;
  /** 进入后跳转的路由 */
  href: string;
  /** 悬停时的一句话 */
  desc: string;
  /** 平面坐标（x 向右，z 向前），单位约等于米 */
  x: number;
  z: number;
  /** 占地宽（X）与深（Z） */
  w: number;
  d: number;
  /** 墙高 */
  h: number;
  roof: RoofKind;
  accent: AccentKey;
  extras?: ExtraKind[];
};

/** 纸模基础色：米白纸面 + 陶土描边 */
export const PAPER = {
  wall: 0xfbf6ea,
  wallSide: 0xe9dcc4,
  wallBack: 0xded0b6,
  roof: 0xdfc7a4,
  roofSide: 0xc3a67f,
  trim: 0xa2573a,
  ink: 0x3a2a22,
  ground: 0xeee3cc,
  road: 0xe8dbc2,
  plaza: 0xe9dcc4,
  plazaEdge: 0xc9b08a,
  water: 0xbcd6d8,
  leaf: 0x8aa96e,
  leafDark: 0x627f4c,
  trunk: 0x9b7a56,
  window: 0xfff8e6,
  glass: 0xcfdfe0,
} as const;

export const ACCENT: Record<AccentKey, { base: number; soft: number; ink: number }> = {
  coral: { base: 0xd9603c, soft: 0xf3c4b0, ink: 0x8c3a22 },
  sun: { base: 0xe0a23a, soft: 0xf5d99b, ink: 0x855a15 },
  blue: { base: 0x4666c4, soft: 0xbdcbf0, ink: 0x263a75 },
  mint: { base: 0x3d9e7d, soft: 0xb5e0cf, ink: 0x1f5c47 },
  violet: { base: 0x7b63c4, soft: 0xcdc2ec, ink: 0x453378 },
  sky: { base: 0x4f9dc4, soft: 0xbcdcee, ink: 0x2a5c77 },
};

/**
 * 小镇布局：中心是广场，四个方向按功能气质分区。
 * -X 工具 / -Z 信息 / +X 创作 / +Z 生活
 * 坐标刻意留出 6 米以上的间距，等距投影下才不会视觉重叠。
 */
export const BUILDINGS: BuildingDef[] = [
  {
    id: "workshop",
    name: "工坊",
    label: "工具箱",
    href: "/apps",
    desc: "14 件随手可用的小工具，都在浏览器本地算",
    x: -11.5,
    z: -3,
    w: 5.4,
    d: 4.2,
    h: 3.1,
    roof: "gable",
    accent: "sun",
    extras: ["chimney", "board"],
  },
  {
    id: "gazette",
    name: "报社",
    label: "每日热点",
    href: "/daily-hot",
    desc: "八个平台的头版，汇成一页今天的新闻",
    x: -4.5,
    z: -11.5,
    w: 5,
    d: 4.4,
    h: 3.8,
    roof: "flat",
    accent: "coral",
    extras: ["chimney", "flag"],
  },
  {
    id: "radio",
    name: "广播站",
    label: "AI 简报",
    href: "/daily-brief",
    desc: "每天一期，把热榜整理成三分钟能听完的要点",
    x: 3.5,
    z: -11.5,
    w: 3.8,
    d: 3.8,
    h: 4.6,
    roof: "tower",
    accent: "sky",
    extras: ["antenna"],
  },
  {
    id: "bookshop",
    name: "书店",
    label: "技术博客",
    href: "/article",
    desc: "长文与笔记，适合坐下来慢慢读",
    x: 12,
    z: -7.5,
    w: 4.6,
    d: 4,
    h: 3.4,
    roof: "gable",
    accent: "mint",
    extras: ["awning"],
  },
  {
    id: "kiosk",
    name: "地图亭",
    label: "网址导航",
    href: "/menus",
    desc: "精选站点收藏夹，本质是一块指路牌",
    x: -14,
    z: 3.5,
    w: 3.4,
    d: 3.2,
    h: 2.5,
    roof: "pyramid",
    accent: "sun",
    extras: ["board"],
  },
  {
    id: "telegraph",
    name: "电报局",
    label: "AI 对话",
    href: "/ai/app/chat",
    desc: "一问一答，消息在镇口来回传送",
    x: 12,
    z: -1,
    w: 4.4,
    d: 4,
    h: 3.4,
    roof: "flat",
    accent: "violet",
    extras: ["antenna", "lantern"],
  },
  {
    id: "typewriter",
    name: "打字机铺",
    label: "AI 写作",
    href: "/ai/app/writing",
    desc: "标题、摘要、润色、大纲，文字在这里成形",
    x: 13.5,
    z: 6,
    w: 4,
    d: 3.8,
    h: 3.1,
    roof: "gable",
    accent: "blue",
    extras: ["chimney"],
  },
  {
    id: "atelier",
    name: "画室",
    label: "视觉创作",
    href: "/drawing/create",
    desc: "文字变图片，画廊与我的创作都在里屋",
    x: 8.5,
    z: 10,
    w: 4.8,
    d: 4.4,
    h: 3.6,
    roof: "gable",
    accent: "coral",
    extras: ["lantern", "flag"],
  },
  {
    id: "board",
    name: "任务板",
    label: "待办清单",
    href: "/user/todo",
    desc: "插满纸条的木板，今天要做的事都在这",
    x: -5,
    z: 10,
    w: 3.6,
    d: 3.2,
    h: 2.6,
    roof: "flat",
    accent: "mint",
    extras: ["board", "awning"],
  },
  {
    id: "observatory",
    name: "天文台",
    label: "待办分析",
    href: "/user/todo/analysis",
    desc: "用望远镜看七天的完成节奏",
    x: -11,
    z: 8,
    w: 3.6,
    d: 3.6,
    h: 3.4,
    roof: "dome",
    accent: "violet",
    extras: ["lantern"],
  },
  {
    id: "clocktower",
    name: "钟楼",
    label: "已安排",
    href: "/scheduled-tasks",
    desc: "到点会亮的日程，都挂在钟面上",
    x: 0,
    z: 14.5,
    w: 3.2,
    d: 3.2,
    h: 8.2,
    roof: "tower",
    accent: "sun",
    extras: ["clock", "flag"],
  },
  {
    id: "townhall",
    name: "市政厅",
    label: "关于与设置",
    href: "/about",
    desc: "站点说明、外观设置与账号，都在门廊后面",
    x: 4,
    z: 12.5,
    w: 5.6,
    d: 4.2,
    h: 3.8,
    roof: "pyramid",
    accent: "blue",
    extras: ["columns", "flag"],
  },
  {
    id: "cafe",
    name: "咖啡馆",
    label: "赞赏支持",
    href: "/support",
    desc: "如果小镇帮到你，可以请它喝一杯",
    x: -9.5,
    z: 13.5,
    w: 4,
    d: 3.6,
    h: 2.8,
    roof: "gable",
    accent: "coral",
    extras: ["awning", "lantern"],
  },
];

/** 小镇地面半径（正方形边长的一半） */
export const TOWN_SIZE = 17;

/** 广场半径 */
export const PLAZA_RADIUS = 3.4;

export function buildingById(id: string): BuildingDef | undefined {
  return BUILDINGS.find((b) => b.id === id);
}
