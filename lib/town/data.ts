/**
 * 小镇的唯一事实来源：街道、街区、建筑、装饰、色板。
 *
 * 平面结构（48 × 48，坐标 -24..24）：
 *   一条纵贯南北的主街（x = -1.5，宽 5.5），两条横街（z = -7.5 / 9.5），
 *   两条纵巷（x = -16 / 11.5），切出 12 个街区。
 *   主街中段是市集广场（半径 5），西南角是公园，西北与东南是住宅区，东北有仓库。
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
  grass: 0xcfdcb4,
  grassDark: 0xb8cb98,
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

export const STREETS: StreetDef[] = [
  { id: "main", x1: -1.5, z1: -23, x2: -1.5, z2: 23, width: 5.5, kind: "main" },
  { id: "north-cross", x1: -23, z1: -7.5, x2: 23, z2: -7.5, width: 4.2, kind: "cross" },
  { id: "south-cross", x1: -23, z1: 9.5, x2: 23, z2: 9.5, width: 4.2, kind: "cross" },
  { id: "west-lane", x1: -16, z1: -23, x2: -16, z2: 23, width: 3.5, kind: "lane" },
  { id: "east-lane", x1: 11.5, z1: -23, x2: 11.5, z2: 23, width: 3.5, kind: "lane" },
];

/** 市集广场：主街中段的圆形空地 */
export const PLAZA = { x: -1.5, z: 1, radius: 4 } as const;

/** 公园：西南角的绿地 */
export const PARK = { x: -20.5, z: 17.5, w: 5.6, d: 10.4 } as const;

/** 地块半径 */
export const TOWN_SIZE = 24;

/* ------------------------------ 功能建筑 ------------------------------ */

export const BUILDINGS: BuildingDef[] = [
  {
    id: "workshop",
    name: "工坊",
    label: "工具箱",
    href: "/apps",
    desc: "14 件随手可用的小工具，都在浏览器本地算",
    x: -8.3,
    z: -18,
    w: 5.4,
    d: 4.2,
    h: 3.1,
    roof: "gable",
    accent: "sun",
    facing: "east",
    extras: ["chimney", "board"],
  },
  {
    id: "typewriter",
    name: "打字机铺",
    label: "AI 写作",
    href: "/ai/app/writing",
    desc: "标题、摘要、润色、大纲，文字在这里成形",
    x: -7.6,
    z: -12,
    w: 4,
    d: 3.8,
    h: 3.1,
    roof: "gable",
    accent: "blue",
    facing: "east",
    extras: ["chimney"],
  },
  {
    id: "telegraph",
    name: "电报局",
    label: "AI 对话",
    href: "/ai/app/chat",
    desc: "一问一答，消息在镇口来回传送",
    x: 4.8,
    z: -18,
    w: 4.4,
    d: 4,
    h: 3.4,
    roof: "flat",
    accent: "violet",
    facing: "south",
    extras: ["antenna", "lantern"],
  },
  {
    id: "bookshop",
    name: "书店",
    label: "技术博客",
    href: "/article",
    desc: "长文与笔记，适合坐下来慢慢读",
    x: 4.9,
    z: -12,
    w: 4.6,
    d: 4,
    h: 3.4,
    roof: "gable",
    accent: "mint",
    facing: "south",
    extras: ["awning"],
  },
  {
    id: "radio",
    name: "广播站",
    label: "AI 简报",
    href: "/daily-brief",
    desc: "每天一期，把热榜整理成三分钟能听完的要点",
    x: 17,
    z: -18,
    w: 3.8,
    d: 3.8,
    h: 4.6,
    roof: "tower",
    accent: "sky",
    facing: "south",
    extras: ["antenna"],
  },
  {
    id: "gazette",
    name: "报社",
    label: "每日热点",
    href: "/daily-hot",
    desc: "八个平台的头版，汇成一页今天的新闻",
    x: 5.1,
    z: -2,
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
    x: 5.4,
    z: 4.5,
    w: 5.6,
    d: 4.2,
    h: 3.8,
    roof: "pyramid",
    accent: "blue",
    facing: "south",
    extras: ["columns", "flag"],
  },
  {
    id: "observatory",
    name: "天文台",
    label: "待办分析",
    href: "/user/todo/analysis",
    desc: "用望远镜看七天的完成节奏",
    x: -7.4,
    z: -2,
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
    x: -7.3,
    z: 4,
    w: 3.4,
    d: 3.2,
    h: 2.5,
    roof: "pyramid",
    accent: "sun",
    facing: "east",
    extras: ["board"],
  },
  {
    id: "atelier",
    name: "画室",
    label: "视觉创作",
    href: "/drawing/create",
    desc: "文字变图片，画廊与我的创作都在里屋",
    x: 18,
    z: 0,
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
    x: -7.4,
    z: 14,
    w: 3.6,
    d: 3.2,
    h: 2.6,
    roof: "flat",
    accent: "mint",
    facing: "east",
    extras: ["board", "awning"],
  },
  {
    id: "cafe",
    name: "咖啡馆",
    label: "赞赏支持",
    href: "/support",
    desc: "如果小镇帮到你，可以请它喝一杯",
    x: -7.6,
    z: 19.5,
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
    x: 5,
    z: 15,
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
  { id: "house-nw-1", kind: "house", x: -20, z: -20, w: 3.2, d: 3, h: 2.4, accent: "mint", roof: "gable" },
  { id: "house-nw-2", kind: "house", x: -20, z: -15.6, w: 3, d: 3, h: 2.2, accent: "sun", roof: "gable" },
  { id: "house-nw-3", kind: "house", x: -20, z: -11.8, w: 2.8, d: 2.8, h: 2.1, accent: "coral", roof: "gable" },
  { id: "warehouse", kind: "warehouse", x: 18, z: -12.5, w: 5, d: 3.4, h: 3, accent: "sky", roof: "gable" },
  { id: "house-se-1", kind: "house", x: 18, z: 15, w: 3.2, d: 3, h: 2.4, accent: "violet", roof: "gable" },
  { id: "house-se-2", kind: "house", x: 18, z: 20, w: 3, d: 3, h: 2.2, accent: "mint", roof: "gable" },
  { id: "house-se-3", kind: "house", x: 13.6, z: 20, w: 2.8, d: 2.8, h: 2.1, accent: "sun", roof: "gable" },
  { id: "watertower", kind: "watertower", x: 21.5, z: 17, w: 2.6, d: 2.6, h: 5.4, accent: "sky", roof: "flat" },
];

/* ------------------------------ 街景点位 ------------------------------ */

export const LAMPS: [number, number][] = [
  [-4.5, -20.5],
  [-4.5, -12.5],
  [1.5, -16.5],
  [-4.5, 6.2],
  [1.5, -4],
  [-4.5, 13.2],
  [1.5, 7.2],
  [-4.5, 20.5],
  [-12, -9.9],
  [-6, -5.1],
  [3, -9.9],
  [9, -5.1],
  [-12, 11.9],
  [-6, 7.1],
  [3, 11.9],
  [9, 7.1],
];

export const BENCHES: { x: number; z: number; rot: number }[] = [
  { x: -1.5, z: -2.6, rot: 0 },
  { x: -5.1, z: 1, rot: Math.PI / 2 },
  { x: 2.1, z: 1, rot: -Math.PI / 2 },
  { x: -1.5, z: 4.6, rot: Math.PI },
  { x: -22.2, z: 14.2, rot: Math.PI / 2 },
  { x: -17.8, z: 14.2, rot: Math.PI / 2 },
  { x: -22.4, z: 20.6, rot: -Math.PI / 2 },
  { x: -17.6, z: 19.4, rot: 0 },
];

export const PLANTERS: [number, number][] = [
  [-4.5, -2],
  [1.5, -2],
  [-4.5, 4],
  [1.5, 4],
  [-4.5, -10.6],
  [1.5, 12.6],
];

export const STALLS: { x: number; z: number; accent: AccentKey }[] = [
  { x: -0.2, z: -1.4, accent: "coral" },
  { x: 0.4, z: 2.6, accent: "sun" },
  { x: -3.8, z: 3, accent: "mint" },
];

export const PARK_TREES: [number, number, number][] = [
  [-22.6, 13.6, 1],
  [-17.6, 13.2, 0.9],
  [-22.8, 18.8, 1.1],
  [-17.4, 20.8, 0.95],
  [-20.8, 22.4, 1.05],
  [-22.4, 21.2, 0.85],
];

export const STREET_TREES: [number, number, number][] = [
  [-23.2, -4, 0.95],
  [-23.2, 1, 1],
  [-23.2, 6, 0.9],
  [13.4, -14, 1],
  [13.4, -3, 0.9],
  [13.4, 3, 1.05],
  [13.4, 14, 0.95],
  [-23.2, 15, 1],
  [-4.5, -23, 0.9],
  [1.5, -23, 1],
  [-6.4, 23, 0.95],
  [2.4, 23, 1],
];

export function buildingById(id: string): BuildingDef | undefined {
  return BUILDINGS.find((b) => b.id === id);
}
