/**
 * 小镇的唯一事实来源：街道、街区、建筑、装饰、街景、色板。
 *
 * 平面结构（56 × 56，坐标 -28..28）：
 *   街道全部是直线段，但每条的走向都偏几度、长度不一、有的不贯穿，
 *   因此街区大小不等，看起来不像规划图。
 *   主街中段是市集广场，西南角是公园，西北与东南是住宅区，东北有仓库。
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

/** 门朝哪边：east = 朝 +X（朝主街），south = 朝 +Z（朝镜头） */
export type Facing = "east" | "south";

export type BuildingDef = {
  id: string;
  name: string;
  label: string;
  href: string;
  desc: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  roof: RoofKind;
  accent: AccentKey;
  facing: Facing;
  extras?: ExtraKind[];
};

/** 纸模基础色 */
export const PAPER = {
  wall: 0xfbf6ea,
  wallSide: 0xe9dcc4,
  wallBack: 0xded0b6,
  roof: 0xdfc7a4,
  roofSide: 0xc3a67f,
  trim: 0xa2573a,
  ink: 0x3a2a22,
  ground: 0xe6dac0,
  road: 0xc7bca3,
  sidewalk: 0xf5efe1,
  plaza: 0xddd0b4,
  plazaEdge: 0xbdaa86,
  water: 0xa9c9cf,
  grass: 0xbdd194,
  grassDark: 0xa2b878,
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

/* ------------------------------ 街道 ------------------------------ */

export type StreetKind = "main" | "cross" | "lane";

export type StreetDef = {
  id: string;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  width: number;
  kind: StreetKind;
};

/**
 * 每条街都是直的，但没有一条严格水平/垂直，长度也各不相同：
 * 主街偏 2°，北横街偏 1.2°，南横街偏 1.7°，西纵街只到 z=9 就断了，
 * 另有一条斜巷从公园斜插向东南。
 */
export const STREETS: StreetDef[] = [
  { id: "main", x1: -2.6, z1: -27.5, x2: -0.4, z2: 27.5, width: 5.6, kind: "main" },
  { id: "north-cross", x1: -27.5, z1: -9.6, x2: 27.5, z2: -8.6, width: 4.3, kind: "cross" },
  { id: "south-cross", x1: -27.5, z1: 11.6, x2: 27.5, z2: 12.9, width: 4.1, kind: "cross" },
  { id: "west-lane", x1: -20.4, z1: -27.5, x2: -18.9, z2: 9.2, width: 3.4, kind: "lane" },
  { id: "east-lane", x1: 12.4, z1: -27.5, x2: 13.8, z2: 27.5, width: 3.6, kind: "lane" },
  { id: "mill-lane", x1: -22.4, z1: 13.6, x2: -14.6, z2: 25.4, width: 2.5, kind: "lane" },
];

/** 街区里的泥土小径：直线斜穿空地，打破网格感 */
export const PATHS: { x1: number; z1: number; x2: number; z2: number; width?: number }[] = [
  { x1: -20.8, z1: 14.6, x2: -13.2, z2: 13.2, width: 1.2 },
  { x1: -13.6, z1: -24.4, x2: -6.8, z2: -24.2, width: 1.1 },
  { x1: 17.8, z1: 6, x2: 23.4, z2: 8.4, width: 1.15 },
  { x1: -13, z1: 27, x2: -8, z2: 27.4, width: 1 },
];

/** 市集广场：主街中段的圆形空地 */
export const PLAZA = { x: -1.6, z: 1.2, radius: 5.1 } as const;

/** 公园：西南角的绿地 */
export const PARK = { x: -24.2, z: 20.6, w: 6.4, d: 12.8 } as const;

/** 地块半径 */
export const TOWN_SIZE = 28;

/* ------------------------------ 功能建筑 ------------------------------ */

export const BUILDINGS: BuildingDef[] = [
  {
    id: "workshop",
    name: "工坊",
    label: "工具箱",
    href: "/apps",
    desc: "14 件随手可用的小工具，都在浏览器本地算",
    x: -10.2,
    z: -20.4,
    w: 5.4,
    d: 4.2,
    h: 3.1,
    roof: "gable",
    accent: "sun",
    facing: "east",
    extras: ["chimney", "board"],
  },
  {
    id: "telegraph",
    name: "电报局",
    label: "AI 对话",
    href: "/ai/app/chat",
    desc: "一问一答，消息在镇口来回传送",
    x: 6.2,
    z: -20.4,
    w: 4.4,
    d: 4,
    h: 3.4,
    roof: "flat",
    accent: "violet",
    facing: "south",
    extras: ["antenna", "lantern"],
  },
  {
    id: "radio",
    name: "广播站",
    label: "AI 简报",
    href: "/daily-brief",
    desc: "每天一期，把热榜整理成三分钟能听完的要点",
    x: 21.6,
    z: -19.6,
    w: 3.8,
    d: 3.8,
    h: 4.6,
    roof: "tower",
    accent: "sky",
    facing: "south",
    extras: ["antenna"],
  },
  {
    id: "bookshop",
    name: "书店",
    label: "技术博客",
    href: "/article",
    desc: "长文与笔记，适合坐下来慢慢读",
    x: 21.8,
    z: -11.4,
    w: 4.6,
    d: 4,
    h: 3.4,
    roof: "gable",
    accent: "mint",
    facing: "south",
    extras: ["awning"],
  },
  {
    id: "observatory",
    name: "天文台",
    label: "待办分析",
    href: "/user/todo/analysis",
    desc: "用望远镜看七天的完成节奏",
    x: -24,
    z: -2.4,
    w: 3.6,
    d: 3.6,
    h: 3.4,
    roof: "dome",
    accent: "violet",
    facing: "east",
    extras: ["lantern"],
  },
  {
    id: "kiosk",
    name: "地图亭",
    label: "网址导航",
    href: "/menus",
    desc: "精选站点收藏夹，本质是一块指路牌",
    x: -23.8,
    z: 4.8,
    w: 3.4,
    d: 3.2,
    h: 2.5,
    roof: "pyramid",
    accent: "sun",
    facing: "east",
    extras: ["board"],
  },
  {
    id: "gazette",
    name: "报社",
    label: "每日热点",
    href: "/daily-hot",
    desc: "八个平台的头版，汇成一页今天的新闻",
    x: 6.4,
    z: -1.4,
    w: 5,
    d: 4.4,
    h: 3.8,
    roof: "flat",
    accent: "coral",
    facing: "south",
    extras: ["chimney", "flag"],
  },
  {
    id: "townhall",
    name: "市政厅",
    label: "关于与设置",
    href: "/about",
    desc: "站点说明、外观设置与账号，都在门廊后面",
    x: 6.6,
    z: 6.2,
    w: 5.6,
    d: 4.2,
    h: 3.8,
    roof: "pyramid",
    accent: "blue",
    facing: "south",
    extras: ["columns", "flag"],
  },
  {
    id: "atelier",
    name: "画室",
    label: "视觉创作",
    href: "/drawing/create",
    desc: "文字变图片，画廊与我的创作都在里屋",
    x: 21,
    z: 1.6,
    w: 4.8,
    d: 4.4,
    h: 3.6,
    roof: "gable",
    accent: "coral",
    facing: "south",
    extras: ["lantern", "flag"],
  },
  {
    id: "board",
    name: "任务板",
    label: "待办清单",
    href: "/user/todo",
    desc: "插满纸条的木板，今天要做的事都在这",
    x: -11.4,
    z: 1,
    w: 3.6,
    d: 3.2,
    h: 2.6,
    roof: "flat",
    accent: "mint",
    facing: "east",
    extras: ["board", "awning"],
  },
  {
    id: "typewriter",
    name: "打字机铺",
    label: "AI 写作",
    href: "/ai/app/writing",
    desc: "标题、摘要、润色、大纲，文字在这里成形",
    x: -11.2,
    z: 17.6,
    w: 4,
    d: 3.8,
    h: 3.1,
    roof: "gable",
    accent: "blue",
    facing: "east",
    extras: ["chimney"],
  },
  {
    id: "cafe",
    name: "咖啡馆",
    label: "赞赏支持",
    href: "/support",
    desc: "如果小镇帮到你，可以请它喝一杯",
    x: -10.8,
    z: 24.6,
    w: 4,
    d: 3.6,
    h: 2.8,
    roof: "gable",
    accent: "coral",
    facing: "east",
    extras: ["awning", "lantern"],
  },
  {
    id: "clocktower",
    name: "钟楼",
    label: "已安排",
    href: "/scheduled-tasks",
    desc: "到点会亮的日程，都挂在钟面上",
    x: 6,
    z: 18.4,
    w: 3.2,
    d: 3.2,
    h: 8.2,
    roof: "tower",
    accent: "sun",
    facing: "south",
    extras: ["clock", "flag"],
  },
];

/* ------------------------------ 装饰建筑（不可进入） ------------------------------ */

export type DecorKind = "house" | "warehouse" | "watertower";

export type DecorDef = {
  id: string;
  kind: DecorKind;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  accent: AccentKey;
  roof: RoofKind;
};

export const DECOR: DecorDef[] = [
  { id: "house-nw-1", kind: "house", x: -24.4, z: -24, w: 3.2, d: 3, h: 2.4, accent: "mint", roof: "gable" },
  { id: "house-nw-2", kind: "house", x: -24.4, z: -18.2, w: 3, d: 3, h: 2.2, accent: "sun", roof: "gable" },
  { id: "house-nw-3", kind: "house", x: -24.4, z: -13, w: 2.8, d: 2.8, h: 2.1, accent: "coral", roof: "gable" },
  { id: "warehouse", kind: "warehouse", x: 24.2, z: -25.6, w: 5, d: 3.4, h: 3, accent: "sky", roof: "gable" },
  { id: "house-se-1", kind: "house", x: 24.2, z: 17.4, w: 3.2, d: 3, h: 2.4, accent: "violet", roof: "gable" },
  { id: "house-se-2", kind: "house", x: 24.2, z: 23.4, w: 3, d: 3, h: 2.2, accent: "mint", roof: "gable" },
  { id: "house-se-3", kind: "house", x: 18.4, z: 25.2, w: 2.8, d: 2.8, h: 2.1, accent: "sun", roof: "gable" },
  { id: "watertower", kind: "watertower", x: 26.4, z: 9.6, w: 2.6, d: 2.6, h: 5.4, accent: "sky", roof: "flat" },
];

/* ------------------------------ 街景点位 ------------------------------ */

export const LAMPS: [number, number][] = [
  [-4.9, -23.4],
  [-4.7, -14.6],
  [1.5, -18.6],
  [-4.4, 3.4],
  [1.8, -3.6],
  [-4.2, 14.8],
  [1.9, 7.4],
  [-4.1, 25],
  [-13.4, -6.2],
  [-6.2, -11.6],
  [3.4, -6.2],
  [9.6, -11.6],
  [-13.6, 9.4],
  [3.6, 14.4],
  [-6.2, 14.6],
  [9.8, 14.4],
];

export const BENCHES: { x: number; z: number; rot: number }[] = [
  { x: -1.6, z: -2.6, rot: 0 },
  { x: -5.9, z: 1.2, rot: Math.PI / 2 },
  { x: 2.7, z: 1.2, rot: -Math.PI / 2 },
  { x: -1.6, z: 5, rot: Math.PI },
  { x: -26, z: 15.6, rot: Math.PI / 2 },
  { x: -22.2, z: 15.6, rot: Math.PI / 2 },
  { x: -26.4, z: 23.6, rot: -Math.PI / 2 },
  { x: -22, z: 22.6, rot: 0 },
];

export const PLANTERS: [number, number][] = [
  [-4.9, -2],
  [1.7, -2],
  [-4.9, 4.4],
  [1.7, 4.4],
  [-4.6, -11],
  [1.8, 13.6],
];

export const STALLS: { x: number; z: number; accent: AccentKey }[] = [
  { x: -0.2, z: -1.2, accent: "coral" },
  { x: 0.4, z: 2.6, accent: "sun" },
  { x: -4, z: 3.2, accent: "mint" },
];

export const PARK_TREES: [number, number, number][] = [
  [-26.4, 14.8, 1],
  [-22.4, 14.4, 0.9],
  [-26.6, 20.8, 1.1],
  [-22.2, 23.4, 0.95],
  [-25.2, 26, 1.05],
  [-26.2, 23.2, 0.85],
];

export const STREET_TREES: [number, number, number][] = [
  [-27.2, -4, 1.05],
  [-27.2, 1, 1.1],
  [-27.2, 6.4, 0.95],
  [15.2, -14.6, 1.05],
  [15.4, -3, 0.95],
  [15.2, 4, 1.1],
  [15.4, 15.4, 1],
  [-27.2, 9.4, 1],
  [-5, -27, 0.95],
  [1.6, -27, 1.05],
  [-7, 27, 1],
  [2.6, 27, 1.05],
  [-17.4, -24.8, 1.05],
  [25.4, -20.6, 0.95],
  [25.6, -14.6, 1],
  [17.6, 9.6, 1.05],
  [11.4, 23.6, 0.95],
  [-16.6, 10.4, 1],
];

/* ------------------------------ 生活细节布局 ------------------------------ */

export type PropSpot = { x: number; z: number; s?: number };
export type FlowerSpot = { x: number; z: number; accent: AccentKey };
export type PlacedProp = { x: number; z: number; rot: number; length?: number; accent?: AccentKey };

/** 后院草地：填补街区空地，压住"规划图"的空旷感 */
export const YARDS: { x: number; z: number; w: number; d: number }[] = [
  { x: -10.4, z: -25.6, w: 7.4, d: 3.6 },
  { x: -10.6, z: -14.4, w: 6.4, d: 3.4 },
  { x: 6.4, z: -25.4, w: 6.2, d: 3.6 },
  { x: 21.8, z: -25.2, w: 6.4, d: 3.4 },
  { x: -24.6, z: -7.6, w: 5, d: 4.4 },
  { x: -24.8, z: 10.4, w: 4.6, d: 3.2 },
  { x: -11.2, z: -4.4, w: 6.6, d: 4.6 },
  { x: -11, z: 8.4, w: 6.4, d: 4 },
  { x: 6.4, z: -8.6, w: 6.4, d: 3.4 },
  { x: 21.4, z: -5.6, w: 6, d: 4.2 },
  { x: 21.6, z: 6.8, w: 6.2, d: 4.4 },
  { x: -11.2, z: 12.4, w: 6, d: 3 },
  { x: 6.4, z: 9.6, w: 6, d: 3 },
  { x: 6, z: 24.4, w: 6.4, d: 4 },
  { x: 17.4, z: 20.4, w: 5.6, d: 4.6 },
];

export const BUSHES: PropSpot[] = [
  { x: -13.6, z: -22.6, s: 1.2 },
  { x: -13.4, z: -18.2, s: 0.95 },
  { x: -6.6, z: -22.8, s: 1.1 },
  { x: -7, z: -16.8, s: 1 },
  { x: -13.2, z: -12.4, s: 1.15 },
  { x: -6.8, z: -10.2, s: 0.95 },
  { x: 3.6, z: -22.8, s: 1.1 },
  { x: 9, z: -22.6, s: 1 },
  { x: 3.4, z: -17.6, s: 1.05 },
  { x: 9.2, z: -17.8, s: 0.95 },
  { x: 3.4, z: -11.8, s: 1 },
  { x: 9.2, z: -12.2, s: 1.1 },
  { x: 19.2, z: -22, s: 1.05 },
  { x: 24.2, z: -21.8, s: 0.95 },
  { x: 19, z: -13.6, s: 1.1 },
  { x: 24.6, z: -13.4, s: 1 },
  { x: -26.4, z: -21.4, s: 1.05 },
  { x: -22.2, z: -21.2, s: 0.95 },
  { x: -26.4, z: -15.6, s: 1 },
  { x: -22.2, z: -15.4, s: 1.1 },
  { x: -26.4, z: -10.6, s: 0.95 },
  { x: -26.6, z: -5.4, s: 1.1 },
  { x: -21.8, z: -5.2, s: 0.95 },
  { x: -26.6, z: 2.2, s: 1 },
  { x: -21.6, z: 2.4, s: 1.15 },
  { x: -26.6, z: 8.6, s: 1 },
  { x: -21.8, z: 8.8, s: 0.95 },
  { x: -14.2, z: -2.6, s: 1.05 },
  { x: -8.2, z: -2.4, s: 0.95 },
  { x: -14.2, z: 3.2, s: 1 },
  { x: -8.4, z: 3.4, s: 1.1 },
  { x: -14.4, z: 10.6, s: 0.95 },
  { x: -8.2, z: 10.4, s: 1.05 },
  { x: -14.2, z: 15.4, s: 1 },
  { x: -8.4, z: 15.2, s: 1.15 },
  { x: -14, z: 22.4, s: 1.05 },
  { x: -8, z: 22.6, s: 0.95 },
  { x: 3.4, z: -3.8, s: 1.1 },
  { x: 9.6, z: -3.6, s: 1 },
  { x: 3.6, z: 3.4, s: 0.95 },
  { x: 9.8, z: 3.6, s: 1.05 },
  { x: 3.4, z: 10.6, s: 1 },
  { x: 9.6, z: 10.8, s: 1.1 },
  { x: 18.4, z: -2.6, s: 1.05 },
  { x: 24.4, z: -2.4, s: 0.95 },
  { x: 18.2, z: 4.6, s: 1 },
  { x: 24.6, z: 4.8, s: 1.1 },
  { x: 18.4, z: 12.4, s: 0.95 },
  { x: 24.4, z: 12.6, s: 1.05 },
  { x: 3.6, z: 16.4, s: 1.1 },
  { x: 9.4, z: 16.2, s: 1 },
  { x: 3.6, z: 22.6, s: 0.95 },
  { x: 9.4, z: 22.8, s: 1.05 },
  { x: 18.2, z: 16.6, s: 1 },
  { x: 25.8, z: 20.4, s: 1.1 },
  { x: 20.4, z: 26, s: 0.95 },
];

export const FLOWERS: FlowerSpot[] = [
  { x: -5.8, z: -2.2, accent: "coral" },
  { x: 2.4, z: -2.4, accent: "sun" },
  { x: -5.9, z: 4.6, accent: "violet" },
  { x: 2.5, z: 4.8, accent: "mint" },
  { x: -4.4, z: -11, accent: "sun" },
  { x: 1.8, z: -11.2, accent: "coral" },
  { x: -4.6, z: 13.6, accent: "mint" },
  { x: 1.8, z: 13.8, accent: "violet" },
  { x: -7.4, z: -20.6, accent: "coral" },
  { x: -7.2, z: -18.4, accent: "sun" },
  { x: 3.4, z: -20.6, accent: "violet" },
  { x: 3.6, z: -18.2, accent: "mint" },
  { x: 3.4, z: -1.8, accent: "coral" },
  { x: 3.6, z: 4.2, accent: "sun" },
  { x: -7.4, z: -1.6, accent: "mint" },
  { x: -7.2, z: 4.2, accent: "violet" },
  { x: -7.4, z: 16, accent: "coral" },
  { x: -7.2, z: 23.6, accent: "sun" },
  { x: 3.8, z: 18, accent: "mint" },
  { x: 18.6, z: 1.8, accent: "coral" },
  { x: 24.4, z: 2, accent: "violet" },
  { x: -26.2, z: 13.4, accent: "sun" },
  { x: -22.2, z: 13.6, accent: "coral" },
  { x: -24.6, z: 24, accent: "mint" },
];

export const FENCES: PlacedProp[] = [
  { x: -26.1, z: -22.3, rot: 0, length: 2.2 },
  { x: -22.3, z: -22.3, rot: 0, length: 2.2 },
  { x: -26, z: -16.5, rot: 0, length: 2 },
  { x: -22.4, z: -16.5, rot: 0, length: 2 },
  { x: 22.4, z: 19.1, rot: 0, length: 2.3 },
  { x: 25.9, z: 19.1, rot: 0, length: 2.3 },
  { x: 17, z: 23.6, rot: Math.PI / 2, length: 2.4 },
];

export const BICYCLES: PlacedProp[] = [
  { x: -13.2, z: -19.8, rot: Math.PI / 2 },
  { x: 3.3, z: -12.4, rot: 0 },
  { x: -13, z: 23.4, rot: Math.PI / 2 },
  { x: 9.8, z: 5, rot: Math.PI / 2 },
  { x: 16.4, z: 26.4, rot: 0 },
];

export const CLOTHESLINES: PlacedProp[] = [
  { x: -22.2, z: -19.6, rot: 0, length: 2.8 },
  { x: 22.2, z: 21.2, rot: 0, length: 2.8 },
  { x: -20.4, z: -14.6, rot: 0.3, length: 2.4 },
];

export const BINS: [number, number][] = [
  [-5.2, 5.6],
  [2.2, -4.6],
  [-26, 11.6],
  [-22.6, 25.2],
  [-5.4, -12.6],
  [2.4, 12.4],
  [14.6, 9.4],
];

export const CRATES: PlacedProp[] = [
  { x: 21.4, z: -22.6, rot: 0.32 },
  { x: -14, z: -23.8, rot: -0.2 },
  { x: 23.4, z: 14.2, rot: 0.5 },
];

export const POTS: { x: number; z: number; accent: AccentKey }[] = [
  { x: -7.2, z: -21, accent: "coral" },
  { x: 3.4, z: -21, accent: "sun" },
  { x: -7, z: -11.8, accent: "violet" },
  { x: 3.4, z: -11.8, accent: "mint" },
  { x: -7, z: 26.4, accent: "coral" },
  { x: 3.6, z: 10.4, accent: "sun" },
  { x: 14.4, z: -13.6, accent: "mint" },
];

export const BARRELS: { x: number; z: number }[] = [
  { x: -13.4, z: -21.4 },
  { x: -7.4, z: 26.4 },
  { x: 22.6, z: -18.2 },
];

export const SIGNPOSTS: PlacedProp[] = [
  { x: -5.6, z: -6.4, rot: -0.3 },
  { x: 2.8, z: 14.2, rot: 0.4 },
];

export function buildingById(id: string): BuildingDef | undefined {
  return BUILDINGS.find((b) => b.id === id);
}
