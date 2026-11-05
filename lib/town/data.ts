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
  /** 中心线控制点，Catmull-Rom 会把它变成微微弯曲的路 */
  points: [number, number][];
  width: number;
  kind: StreetKind;
};

export const STREETS: StreetDef[] = [
  {
    id: "main",
    points: [
      [-1.5, -23.5],
      [-2.9, -13],
      [-1.2, -2],
      [-0.6, 7],
      [-2.4, 16],
      [-1.4, 23.5],
    ],
    width: 5.5,
    kind: "main",
  },
  {
    id: "north-cross",
    points: [
      [-23.5, -7.5],
      [-16, -7.1],
      [-8, -7.4],
      [0, -6.9],
      [8, -7.3],
      [16, -7],
      [23.5, -7.5],
    ],
    width: 4.2,
    kind: "cross",
  },
  {
    id: "south-cross",
    points: [
      [-23.5, 9.5],
      [-16, 9.1],
      [-8, 9.8],
      [0, 9.2],
      [8, 9.7],
      [16, 9.2],
      [23.5, 9.8],
    ],
    width: 4.2,
    kind: "cross",
  },
  {
    id: "west-lane",
    points: [
      [-16, -23.5],
      [-16.4, -14],
      [-15.8, -4],
      [-16.3, 5],
      [-16, 15],
      [-16.2, 23.5],
    ],
    width: 3.5,
    kind: "lane",
  },
  {
    id: "east-lane",
    points: [
      [11.5, -23.5],
      [11.1, -14],
      [11.8, -4],
      [11.3, 5],
      [11.7, 15],
      [11.4, 23.5],
    ],
    width: 3.5,
    kind: "lane",
  },
];

/** 街区里的泥土小径：斜着穿过空地，打破网格感 */
export const PATHS: { id: string; points: [number, number][]; width?: number }[] = [
  {
    id: "park-to-main",
    points: [
      [-17.6, 12.4],
      [-14.4, 14],
      [-10.6, 15.2],
      [-7.4, 16.4],
      [-5.6, 18.6],
    ],
    width: 1.15,
  },
  {
    id: "workshop-back",
    points: [
      [-13.4, -20.4],
      [-11.2, -21.6],
      [-8.4, -21.2],
      [-5.6, -20],
    ],
    width: 1,
  },
  {
    id: "atelier-yard",
    points: [
      [13.2, 3.4],
      [15.4, 5.6],
      [17.2, 8.2],
      [18.6, 11],
    ],
    width: 1.05,
  },
  {
    id: "cafe-lane",
    points: [
      [-6.2, 20.8],
      [-3.6, 21.6],
      [-0.4, 22.4],
    ],
    width: 1,
  },
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
  [-23.2, -4, 1.1],
  [-23.2, 1, 1.15],
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
  [-10.8, -21.6, 1.2],
  [17.6, -21.4, 0.95],
  [-21.8, 2.6, 1],
  [-21.8, -3.4, 0.9],
  [17.4, 4.2, 1.05],
  [20.8, -2.2, 0.95],
  [5.2, 20.8, 1],
  [-13.4, 20.4, 0.95],
];

export function buildingById(id: string): BuildingDef | undefined {
  return BUILDINGS.find((b) => b.id === id);
}

/* ------------------------------ 生活细节布局 ------------------------------ */

export type PropSpot = { x: number; z: number; s?: number };
export type FlowerSpot = { x: number; z: number; accent: AccentKey };
export type PlacedProp = { x: number; z: number; rot: number; length?: number; accent?: AccentKey };

/** 后院草地：填补街区空地，压住"规划图"的空旷感 */
export const YARDS: { x: number; z: number; w: number; d: number }[] = [
  { x: -10.2, z: -21.5, w: 6, d: 2.5 },
  { x: 17, z: -21.3, w: 5, d: 2.5 },
  { x: -21.6, z: 3.4, w: 3.4, d: 6.6 },
  { x: -21.6, z: -3, w: 3.4, d: 3 },
  { x: 17.6, z: 4.4, w: 4.6, d: 3 },
  { x: 21.8, z: -2, w: 2.8, d: 3 },
  { x: 5, z: 20.6, w: 5, d: 3.6 },
  { x: -12.6, z: 20.4, w: 3, d: 3 },
];

/** 灌木：贴墙、街角、街区空地，撑起绿量 */
export const BUSHES: PropSpot[] = [
  { x: -11.9, z: -19.9, s: 1.1 },
  { x: -11.7, z: -16.1, s: 0.85 },
  { x: -5.3, z: -20.6, s: 1 },
  { x: -9.9, z: -14.2, s: 0.8 },
  { x: -5.2, z: -12.4, s: 0.9 },
  { x: -9.8, z: -3.8, s: 1 },
  { x: -5.1, z: -0.6, s: 0.85 },
  { x: -9.6, z: 6, s: 0.9 },
  { x: -5.2, z: 5.2, s: 0.8 },
  { x: -9.8, z: 15.8, s: 1 },
  { x: -5.2, z: 14.4, s: 0.85 },
  { x: -9.9, z: 21.4, s: 0.95 },
  { x: -5.3, z: 20.2, s: 0.8 },
  { x: 2.2, z: -20.2, s: 0.9 },
  { x: 7.6, z: -19.8, s: 1 },
  { x: 2.2, z: -16.6, s: 0.8 },
  { x: 2.2, z: -13.8, s: 0.9 },
  { x: 7.6, z: -13.6, s: 1 },
  { x: 2.2, z: -3.8, s: 0.85 },
  { x: 7.9, z: -3.6, s: 1 },
  { x: 2.2, z: 0.6, s: 0.9 },
  { x: 8.4, z: 2.2, s: 0.85 },
  { x: 2.4, z: 7, s: 1 },
  { x: 15, z: -1.8, s: 0.9 },
  { x: 20.8, z: -2.2, s: 1 },
  { x: 15.2, z: 2.4, s: 0.85 },
  { x: 14.8, z: -19.9, s: 1 },
  { x: 19.6, z: -19.7, s: 0.9 },
  { x: 14.9, z: -14, s: 0.85 },
  { x: 21.2, z: -13.8, s: 0.95 },
  { x: -21.9, z: -21.8, s: 1 },
  { x: -18.1, z: -21.8, s: 0.85 },
  { x: -21.9, z: -17.2, s: 0.9 },
  { x: -18.1, z: -17.2, s: 1 },
  { x: -21.9, z: -13.4, s: 0.85 },
  { x: 16.2, z: 16.8, s: 1 },
  { x: 19.9, z: 17, s: 0.9 },
  { x: 16.2, z: 21.8, s: 0.85 },
  { x: 22.9, z: 19, s: 0.95 },
];

/** 花丛：广场边缘、门口、交通岛 */
export const FLOWERS: FlowerSpot[] = [
  { x: -4.6, z: -2.4, accent: "coral" },
  { x: 1.4, z: -2.6, accent: "sun" },
  { x: -4.8, z: 4.2, accent: "violet" },
  { x: 1.6, z: 4.4, accent: "mint" },
  { x: -3.4, z: -9.6, accent: "sun" },
  { x: 0.6, z: -9.8, accent: "coral" },
  { x: -3.6, z: 11.6, accent: "mint" },
  { x: 0.8, z: 11.8, accent: "violet" },
  { x: -5.8, z: -18.2, accent: "coral" },
  { x: -5.6, z: -12.2, accent: "sun" },
  { x: 2.4, z: -18.2, accent: "violet" },
  { x: 2.6, z: -12.2, accent: "mint" },
  { x: 2.6, z: -2.2, accent: "coral" },
  { x: 2.8, z: 4.6, accent: "sun" },
  { x: -5.8, z: -2.2, accent: "mint" },
  { x: -5.6, z: 4.4, accent: "violet" },
  { x: -5.8, z: 14.2, accent: "coral" },
  { x: -6, z: 19.8, accent: "sun" },
  { x: 3.4, z: 15.2, accent: "mint" },
  { x: 15.2, z: 0.4, accent: "coral" },
  { x: 20.8, z: 0.6, accent: "violet" },
  { x: -22.4, z: 13, accent: "sun" },
  { x: -18, z: 13.2, accent: "coral" },
  { x: -21, z: 19.6, accent: "mint" },
];

/** 住宅前院篱笆（留出中间门洞） */
export const FENCES: PlacedProp[] = [
  { x: -21.9, z: -18.1, rot: 0, length: 2.1 },
  { x: -18.1, z: -18.1, rot: 0, length: 2.1 },
  { x: -21.8, z: -13.9, rot: 0, length: 1.9 },
  { x: -18.2, z: -13.9, rot: 0, length: 1.9 },
  { x: 16.3, z: 17.7, rot: 0, length: 2.3 },
  { x: 19.7, z: 17.7, rot: 0, length: 2.3 },
  { x: 12.2, z: 17.2, rot: Math.PI / 2, length: 2.4 },
];

export const BICYCLES: PlacedProp[] = [
  { x: -11.2, z: -17.4, rot: Math.PI / 2 },
  { x: 2.3, z: -10.4, rot: 0 },
  { x: -10.3, z: 18.6, rot: Math.PI / 2 },
  { x: 8.5, z: 3.4, rot: Math.PI / 2 },
  { x: 13.4, z: 21.2, rot: 0 },
];

export const CLOTHESLINES: PlacedProp[] = [
  { x: -17.4, z: -17.6, rot: 0, length: 2.6 },
  { x: 16.6, z: 18.8, rot: 0, length: 2.6 },
  { x: -16.2, z: -13.2, rot: 0.3, length: 2.4 },
];

export const BINS: [number, number][] = [
  [-3.8, 5.8],
  [1.2, -3.8],
  [-18.8, 11.6],
  [-16.4, 21.2],
  [-4.9, -10.6],
  [2.3, 10.8],
  [13.6, 12.4],
];

export const CRATES: PlacedProp[] = [
  { x: 15.2, z: -10.2, rot: 0.32 },
  { x: -11.6, z: -21, rot: -0.2 },
  { x: 20.4, z: 14.6, rot: 0.5 },
];

export const POTS: { x: number; z: number; accent: AccentKey }[] = [
  { x: -5.2, z: -19.4, accent: "coral" },
  { x: 2.4, z: -19.2, accent: "sun" },
  { x: -5, z: -13.4, accent: "violet" },
  { x: 2.4, z: -13.4, accent: "mint" },
  { x: -6.2, z: 21.2, accent: "coral" },
  { x: 2.8, z: 7, accent: "sun" },
  { x: 12.4, z: -8.4, accent: "mint" },
];

export const BARRELS: { x: number; z: number }[] = [
  { x: -10.9, z: -18.6 },
  { x: -6.2, z: 22 },
  { x: 20.6, z: -11.6 },
];

/** 路口路标 */
export const SIGNPOSTS: PlacedProp[] = [
  { x: -4.9, z: -5, rot: -0.3 },
  { x: 2.6, z: 11.4, rot: 0.4 },
];
