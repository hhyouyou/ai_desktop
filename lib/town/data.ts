/**
 * 小镇的唯一事实来源：街道、街区、地点（主楼 + 附属）、装饰、色板。
 *
 * 平面结构（64 × 64，坐标 -32..32）：
 *   街道全部是直线段，但每条走向都偏几度、长度不一、有的不贯穿。
 *   每个「地点」占 10–14 米见方，主楼之外还带附属建筑与户外设施。
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
  grass: 0xc2d49c,
  grassDark: 0xa6bb80,
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
  { id: "main", x1: -3.4, z1: -31.5, x2: -0.6, z2: 31.5, width: 5.8, kind: "main" },
  { id: "north-cross", x1: -31.5, z1: -10.6, x2: 31.5, z2: -9.4, width: 4.3, kind: "cross" },
  { id: "south-cross", x1: -31.5, z1: 11.6, x2: 31.5, z2: 12.9, width: 4.1, kind: "cross" },
  { id: "west-lane", x1: -22.6, z1: -31.5, x2: -21.2, z2: 11.2, width: 3.4, kind: "lane" },
  { id: "east-lane", x1: 13.4, z1: -31.5, x2: 14.8, z2: 31.5, width: 3.6, kind: "lane" },
  { id: "mill-lane", x1: -25.6, z1: 14.4, x2: -17.2, z2: 27.4, width: 2.5, kind: "lane" },
];

export const PATHS: { x1: number; z1: number; x2: number; z2: number; width?: number }[] = [
  { x1: -21.8, z1: 16.2, x2: -13.4, z2: 14.8, width: 1.2 },
  { x1: -18.6, z1: -29.4, x2: -8.2, z2: -29.2, width: 1.1 },
  { x1: 20.4, z1: 6.6, x2: 27.4, z2: 9.4, width: 1.15 },
  { x1: -18, z1: 30.4, x2: -11, z2: 30.8, width: 1 },
];

export const PLAZA = { x: -2, z: 1.2, radius: 5.3 } as const;

export const PARK = { x: -27.4, z: 22.6, w: 8.6, d: 16.4 } as const;

export const POND = { x: -29.6, z: 18.2, rx: 2.2, rz: 1.7 } as const;

export const GAZEBO = { x: -25, z: 26.4, radius: 1.8 } as const;

export const TOWN_SIZE = 32;

/* ------------------------------ 功能建筑 ------------------------------ */

export const BUILDINGS: BuildingDef[] = [
  {
    id: "workshop",
    name: "工坊",
    label: "工具箱",
    href: "/apps",
    desc: "14 件随手可用的小工具，都在浏览器本地算",
    x: -12,
    z: -25,
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
    x: -12,
    z: -16,
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
    x: 6,
    z: -25,
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
    x: 6,
    z: -16,
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
    x: 24,
    z: -24,
    w: 3.8,
    d: 3.8,
    h: 4.6,
    roof: "tower",
    accent: "sky",
    facing: "south",
    extras: ["antenna"],
  },
  {
    id: "observatory",
    name: "天文台",
    label: "待办分析",
    href: "/user/todo/analysis",
    desc: "用望远镜看七天的完成节奏",
    x: -27,
    z: -4,
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
    x: -27,
    z: 5,
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
    x: 6,
    z: -2,
    w: 5.2,
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
    x: 6,
    z: 8,
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
    x: 24,
    z: 2,
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
    x: -12,
    z: 0,
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
    x: -12,
    z: 20,
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
    x: 7,
    z: 20,
    w: 3.2,
    d: 3.2,
    h: 8.2,
    roof: "tower",
    accent: "sun",
    facing: "south",
    extras: ["clock", "flag"],
  },
];

/* ------------------------------ 地点附属物 ------------------------------ */

export type AnnexKind =
  | "shed"
  | "stall"
  | "fence"
  | "table"
  | "parasol"
  | "bench"
  | "planter"
  | "rack"
  | "chalkboard"
  | "barrels"
  | "well"
  | "lamp";

export type AnnexDef = {
  kind: AnnexKind;
  x: number;
  z: number;
  rot?: number;
  length?: number;
  accent?: AccentKey;
};

/** 一个地点 = 主楼 + 这些附属物。目前先做三个院落示范。 */
export type SiteDef = {
  id: string;
  annexes: AnnexDef[];
};

export const SITES: SiteDef[] = [
  {
    id: "cafe",
    annexes: [
      { kind: "fence", x: -8.4, z: 21.2, rot: 0, length: 3.4 },
      { kind: "fence", x: -6.7, z: 22.7, rot: Math.PI / 2, length: 3.2 },
      { kind: "table", x: -7.8, z: 21 },
      { kind: "table", x: -7.6, z: 23 },
      { kind: "table", x: -9.8, z: 23.2 },
      { kind: "parasol", x: -7.8, z: 21, accent: "coral" },
      { kind: "parasol", x: -9.8, z: 23.2, accent: "sun" },
      { kind: "chalkboard", x: -10.4, z: 22.4, rot: -0.4 },
      { kind: "planter", x: -8.8, z: 19.4, accent: "mint" },
      { kind: "lamp", x: -6.6, z: 19.8 },
    ],
  },
  {
    id: "gazette",
    annexes: [
      { kind: "shed", x: 10.6, z: -3.2, rot: 0, accent: "coral" },
      { kind: "fence", x: 2.6, z: 1.2, rot: 0, length: 4 },
      { kind: "fence", x: 9.4, z: 1.2, rot: 0, length: 4 },
      { kind: "fence", x: 11.7, z: -1.2, rot: Math.PI / 2, length: 4.4 },
      { kind: "rack", x: 3.2, z: -0.4, rot: Math.PI / 2 },
      { kind: "barrels", x: 11.2, z: -6.4, rot: 0.3 },
      { kind: "well", x: 2.8, z: 2.2 },
      { kind: "lamp", x: 2.2, z: 3.2 },
    ],
  },
  {
    id: "bookshop",
    annexes: [
      { kind: "stall", x: 10.6, z: -17.6, rot: 0, accent: "mint" },
      { kind: "bench", x: 2.6, z: -13.8, rot: Math.PI / 2 },
      { kind: "bench", x: 2.6, z: -18.4, rot: Math.PI / 2 },
      { kind: "planter", x: 2.2, z: -16.2, accent: "violet" },
      { kind: "lamp", x: 10.8, z: -13.6 },
      { kind: "barrels", x: 11, z: -19.8, rot: -0.2 },
    ],
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
  { id: "house-nw-1", kind: "house", x: -28.4, z: -27.6, w: 3.2, d: 3, h: 2.4, accent: "mint", roof: "gable" },
  { id: "house-nw-2", kind: "house", x: -28.4, z: -21.2, w: 3, d: 3, h: 2.2, accent: "sun", roof: "gable" },
  { id: "house-nw-3", kind: "house", x: -28.4, z: -15.4, w: 2.8, d: 2.8, h: 2.1, accent: "coral", roof: "gable" },
  { id: "warehouse", kind: "warehouse", x: 25.4, z: -14.4, w: 5, d: 3.4, h: 3, accent: "sky", roof: "gable" },
  { id: "house-se-1", kind: "house", x: 27.2, z: 19.4, w: 3.2, d: 3, h: 2.4, accent: "violet", roof: "gable" },
  { id: "house-se-2", kind: "house", x: 27.2, z: 25.4, w: 3, d: 3, h: 2.2, accent: "mint", roof: "gable" },
  { id: "house-se-3", kind: "house", x: 21.2, z: 28.2, w: 2.8, d: 2.8, h: 2.1, accent: "sun", roof: "gable" },
  { id: "watertower", kind: "watertower", x: 29.6, z: 11.2, w: 2.6, d: 2.6, h: 5.4, accent: "sky", roof: "flat" },
];

/* ------------------------------ 街景点位 ------------------------------ */

export const LAMPS: [number, number][] = [
  [-5.4, -27.4],
  [-5.2, -17.6],
  [1.4, -22.4],
  [-5, 2.4],
  [1.7, -4.6],
  [-4.8, 16.4],
  [1.8, 7.4],
  [-4.6, 28.4],
  [-15.4, -7.4],
  [-7.4, -12.6],
  [3.4, -7.4],
  [10.4, -12.6],
  [-15.6, 10.4],
  [3.6, 16.4],
  [-7.4, 15.6],
  [10.8, 16.4],
];

export const BENCHES: { x: number; z: number; rot: number }[] = [
  { x: -2, z: -2.8, rot: 0 },
  { x: -6.4, z: 1.2, rot: Math.PI / 2 },
  { x: 2.8, z: 1.2, rot: -Math.PI / 2 },
  { x: -2, z: 5.2, rot: Math.PI },
  { x: -30.2, z: 17.4, rot: 0.6 },
  { x: -26.2, z: 15.8, rot: -0.4 },
  { x: -26.4, z: 29.4, rot: Math.PI },
  { x: -22.4, z: 24.6, rot: -1.2 },
];

export const PLANTERS: [number, number][] = [
  [-5.2, -2.2],
  [1.8, -2.2],
  [-5.2, 4.6],
  [1.8, 4.6],
  [-5, -12],
  [1.8, 15.4],
];

export const STALLS: { x: number; z: number; accent: AccentKey }[] = [
  { x: -0.2, z: -1.2, accent: "coral" },
  { x: 0.4, z: 2.6, accent: "sun" },
  { x: -4.2, z: 3.2, accent: "mint" },
];

export const PARK_TREES: [number, number, number][] = [
  [-31.4, 15.4, 1.05],
  [-31.6, 24.6, 1.1],
  [-30, 30, 0.95],
  [-24.6, 30.6, 1],
  [-22.2, 27.4, 0.9],
  [-22.2, 20.4, 1.05],
  [-23.4, 15.6, 0.95],
  [-27.6, 15.2, 1],
];

export const STREET_TREES: [number, number, number][] = [
  [-31.4, -6, 1.05],
  [-31.4, 1, 1.1],
  [-31.4, 7.4, 0.95],
  [16.6, -18.6, 1.05],
  [16.8, -4, 0.95],
  [16.6, 5, 1.1],
  [16.8, 18.4, 1],
  [-31.4, 11.4, 1],
  [-6, -31, 0.95],
  [1.6, -31, 1.05],
  [-8, 31, 1],
  [2.6, 31, 1.05],
  [-19.6, -28.6, 1.05],
  [28.4, -21.6, 0.95],
  [28.6, -9.6, 1],
  [19.4, 12.6, 1.05],
  [12.4, 27.6, 0.95],
  [-17.6, 12.4, 1],
  [28.8, 27, 0.95],
  [-19.4, -18.6, 1],
  [-19.6, -2.6, 0.9],
  [12.2, -27.6, 1],
];

/* ------------------------------ 生活细节布局 ------------------------------ */

export type PropSpot = { x: number; z: number; s?: number };
export type FlowerSpot = { x: number; z: number; accent: AccentKey };
export type PlacedProp = { x: number; z: number; rot: number; length?: number; accent?: AccentKey };

export const YARDS: { x: number; z: number; w: number; d: number }[] = [
  { x: -12, z: -30.4, w: 7.4, d: 3 },
  { x: 6.4, z: -30.2, w: 6.4, d: 3.2 },
  { x: 24, z: -29.8, w: 6.2, d: 3.4 },
  { x: -27.4, z: -8.8, w: 5, d: 3.4 },
  { x: -27.4, z: 9.4, w: 4.6, d: 3.2 },
  { x: -12, z: -8.4, w: 6.6, d: 4.2 },
  { x: -12, z: 6.4, w: 6.4, d: 4 },
  { x: 6.4, z: -9, w: 6.4, d: 3.2 },
  { x: 6.4, z: 3.2, w: 6, d: 3.6 },
  { x: 24, z: -8.6, w: 6, d: 4.2 },
  { x: 24, z: 8.4, w: 6.2, d: 4.4 },
  { x: -12, z: 12.6, w: 6, d: 3 },
  { x: -12, z: 28, w: 6.4, d: 3.6 },
  { x: 7, z: 27.4, w: 6, d: 4 },
  { x: 22.6, z: 24, w: 5.6, d: 4.6 },
];

export const BUSHES: PropSpot[] = [
  { x: -15.8, z: -27.4, s: 1.2 },
  { x: -15.6, z: -22.6, s: 0.95 },
  { x: -8.2, z: -27.6, s: 1.1 },
  { x: -8.4, z: -21.4, s: 1 },
  { x: -15.4, z: -18.4, s: 1.15 },
  { x: -8.4, z: -13.2, s: 0.95 },
  { x: 2.4, z: -27.6, s: 1.1 },
  { x: 9.8, z: -27.4, s: 1 },
  { x: 2.2, z: -22.4, s: 1.05 },
  { x: 10, z: -22.2, s: 0.95 },
  { x: 2.2, z: -18.6, s: 1 },
  { x: 10, z: -18.4, s: 1.1 },
  { x: 20.4, z: -27.6, s: 1.05 },
  { x: 27.6, z: -27.4, s: 0.95 },
  { x: 20.2, z: -19.6, s: 1.1 },
  { x: 28.6, z: -18.4, s: 1 },
  { x: -30.4, z: -25.4, s: 1.05 },
  { x: -25.4, z: -25.2, s: 0.95 },
  { x: -30.4, z: -19.4, s: 1 },
  { x: -25.4, z: -19.2, s: 1.1 },
  { x: -30.4, z: -13.4, s: 0.95 },
  { x: -30.6, z: -6.4, s: 1.1 },
  { x: -24.2, z: -6.2, s: 0.95 },
  { x: -30.6, z: 3.2, s: 1 },
  { x: -24.2, z: 3.4, s: 1.15 },
  { x: -30.6, z: 8.6, s: 1 },
  { x: -24.2, z: 8.8, s: 0.95 },
  { x: -15.8, z: -4.6, s: 1.05 },
  { x: -8.2, z: -4.4, s: 0.95 },
  { x: -15.8, z: 3.2, s: 1 },
  { x: -8.4, z: 3.4, s: 1.1 },
  { x: -15.8, z: 10.4, s: 0.95 },
  { x: -8.2, z: 10.6, s: 1.05 },
  { x: -15.6, z: 18.4, s: 1 },
  { x: -8.4, z: 26.6, s: 1.15 },
  { x: 2.2, z: -4.4, s: 1.1 },
  { x: 10, z: -4.2, s: 1 },
  { x: 2.4, z: 3.4, s: 0.95 },
  { x: 10.2, z: 3.6, s: 1.05 },
  { x: 2.2, z: 12.6, s: 1 },
  { x: 10, z: 12.8, s: 1.1 },
  { x: 20.4, z: -4.2, s: 1.05 },
  { x: 27.6, z: -4, s: 0.95 },
  { x: 20.2, z: 5.4, s: 1 },
  { x: 28.6, z: 5.6, s: 1.1 },
  { x: 20.4, z: 13.4, s: 0.95 },
  { x: 27.4, z: 14.4, s: 1.05 },
  { x: 2.6, z: 18.4, s: 1.1 },
  { x: 11, z: 18.2, s: 1 },
  { x: 2.6, z: 25.6, s: 0.95 },
  { x: 11, z: 25.8, s: 1.05 },
  { x: 20.4, z: 19.6, s: 1 },
  { x: 29.2, z: 23.4, s: 1.1 },
  { x: 16.4, z: 29.4, s: 0.95 },
];

export const FLOWERS: FlowerSpot[] = [
  { x: -6.4, z: -2.2, accent: "coral" },
  { x: 2.6, z: -2.4, accent: "sun" },
  { x: -6.4, z: 4.8, accent: "violet" },
  { x: 2.6, z: 5, accent: "mint" },
  { x: -4.6, z: -12.4, accent: "sun" },
  { x: 1.8, z: -12.6, accent: "coral" },
  { x: -4.8, z: 15.6, accent: "mint" },
  { x: 1.8, z: 15.8, accent: "violet" },
  { x: -9.2, z: -25.2, accent: "coral" },
  { x: -9, z: -22.8, accent: "sun" },
  { x: 3.4, z: -25.2, accent: "violet" },
  { x: 3.6, z: -22.8, accent: "mint" },
  { x: 3, z: -1.8, accent: "coral" },
  { x: 3.2, z: 4.2, accent: "sun" },
  { x: -9.4, z: -1.6, accent: "mint" },
  { x: -9.2, z: 4.4, accent: "violet" },
  { x: -9.4, z: 17.4, accent: "coral" },
  { x: -8.8, z: 25.6, accent: "sun" },
  { x: 4.2, z: 22, accent: "mint" },
  { x: 21, z: 2.2, accent: "coral" },
  { x: 28, z: 2.4, accent: "violet" },
  { x: -30.4, z: 14.6, accent: "sun" },
  { x: -24.6, z: 14.2, accent: "coral" },
  { x: -28.4, z: 29.4, accent: "mint" },
  { x: 12.6, z: -14.4, accent: "sun" },
  { x: 12.8, z: 24.6, accent: "coral" },
];

export const FENCES: PlacedProp[] = [
  { x: -30.1, z: -25.9, rot: 0, length: 2.2 },
  { x: -26.3, z: -25.9, rot: 0, length: 2.2 },
  { x: -30, z: -19.5, rot: 0, length: 2 },
  { x: -26.4, z: -19.5, rot: 0, length: 2 },
  { x: 25.4, z: 21.1, rot: 0, length: 2.3 },
  { x: 29.4, z: 21.1, rot: 0, length: 2.3 },
  { x: 19.8, z: 26.6, rot: Math.PI / 2, length: 2.4 },
];

export const BICYCLES: PlacedProp[] = [
  { x: -15.6, z: -24.4, rot: Math.PI / 2 },
  { x: 11.4, z: -14.4, rot: 0 },
  { x: -15.4, z: 22.4, rot: Math.PI / 2 },
  { x: 10.4, z: 6, rot: Math.PI / 2 },
  { x: 19.4, z: 29, rot: 0 },
];

export const CLOTHESLINES: PlacedProp[] = [
  { x: -26.4, z: -22.6, rot: 0, length: 2.8 },
  { x: 25.2, z: 23.2, rot: 0, length: 2.8 },
  { x: -24.4, z: -17.6, rot: 0.3, length: 2.4 },
];

export const BINS: [number, number][] = [
  [-5.6, 5.8],
  [2.4, -5.6],
  [-30, 12.6],
  [-25.8, 28.4],
  [-5.8, -14.4],
  [2.6, 13.4],
  [16.6, 10.4],
];

export const CRATES: PlacedProp[] = [
  { x: 22.4, z: -25.4, rot: 0.32 },
  { x: -16, z: -28.6, rot: -0.2 },
  { x: 26.4, z: 16.4, rot: 0.5 },
];

export const POTS: { x: number; z: number; accent: AccentKey }[] = [
  { x: -9.4, z: -26, accent: "coral" },
  { x: 3.4, z: -26, accent: "sun" },
  { x: -9.2, z: -14.6, accent: "violet" },
  { x: 3.4, z: -14.6, accent: "mint" },
  { x: -9, z: 28.6, accent: "coral" },
  { x: 3.8, z: 12.6, accent: "sun" },
  { x: 17.4, z: -16.4, accent: "mint" },
];

export const BARRELS: { x: number; z: number }[] = [
  { x: -15.8, z: -25.8 },
  { x: -9, z: 29.4 },
  { x: 28.4, z: -21 },
];

export const SIGNPOSTS: PlacedProp[] = [
  { x: -6.2, z: -7.6, rot: -0.3 },
  { x: 3, z: 17.4, rot: 0.4 },
];

export const PARK_GATES: [number, number][] = [
  [-22.9, 15.2],
  [-22.9, 29.8],
];

export function buildingById(id: string): BuildingDef | undefined {
  return BUILDINGS.find((b) => b.id === id);
}
