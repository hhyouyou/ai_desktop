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
  { id: "main", x1: -4.25, z1: -39.37, x2: -0.75, z2: 39.38, width: 7.25, kind: "main" },
  { id: "north-cross", x1: -39.37, z1: -13.25, x2: 39.38, z2: -11.75, width: 5.38, kind: "cross" },
  { id: "south-cross", x1: -39.37, z1: 14.5, x2: 39.38, z2: 16.13, width: 5.13, kind: "cross" },
  { id: "west-lane", x1: -28.25, z1: -39.37, x2: -26.5, z2: 14, width: 4.25, kind: "lane" },
  { id: "east-lane", x1: 16.75, z1: -39.37, x2: 18.5, z2: 39.38, width: 4.5, kind: "lane" },
  { id: "mill-lane", x1: -32, z1: 18, x2: -21.5, z2: 34.25, width: 3.13, kind: "lane" },
];

export const PATHS: { x1: number; z1: number; x2: number; z2: number; width?: number }[] = [
  { x1: -27.25, z1: 20.25, x2: -16.75, z2: 18.5, width: 1.5 },
  { x1: -23.25, z1: -36.75, x2: -10.25, z2: -36.5, width: 1.38 },
  { x1: 25.5, z1: 8.25, x2: 34.25, z2: 11.75, width: 1.44 },
  { x1: -22.5, z1: 38, x2: -13.75, z2: 38.5, width: 1.25 },
];

export const PLAZA = { x: -4, z: 1.5, radius: 6.6 } as const;

export const PARK = { x: -33.2, z: 27.4, w: 11.4, d: 20.8 } as const;

export const POND = { x: -35.2, z: 22.4, rx: 2.8, rz: 2.15 } as const;

export const GAZEBO = { x: -30.4, z: 32, radius: 2.4 } as const;

export const TOWN_SIZE = 40;

/* ------------------------------ 功能建筑 ------------------------------ */

export const BUILDINGS: BuildingDef[] = [
  {
    id: "workshop",
    name: "工坊",
    label: "工具箱",
    href: "/apps",
    desc: "14 件随手可用的小工具，都在浏览器本地算",
    x: -18.75,
    z: -31.25,
    w: 8.37,
    d: 6.51,
    h: 4.85,
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
    x: -15,
    z: -20,
    w: 6.2,
    d: 5.89,
    h: 4.85,
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
    x: 7.5,
    z: -31.25,
    w: 6.82,
    d: 6.2,
    h: 5.31,
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
    x: 7.5,
    z: -20,
    w: 7.13,
    d: 6.2,
    h: 5.31,
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
    x: 30,
    z: -30,
    w: 5.89,
    d: 5.89,
    h: 7.19,
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
    x: -33.75,
    z: -5,
    w: 5.58,
    d: 5.58,
    h: 5.31,
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
    x: -33.75,
    z: 6.25,
    w: 5.27,
    d: 4.96,
    h: 3.91,
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
    x: 30,
    z: 2.5,
    w: 8.06,
    d: 6.82,
    h: 5.94,
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
    x: 7.5,
    z: -1,
    w: 8.68,
    d: 6.51,
    h: 5.94,
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
    x: 26,
    z: 21,
    w: 7.44,
    d: 6.82,
    h: 5.62,
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
    x: -15,
    z: 0,
    w: 5.58,
    d: 4.96,
    h: 4.06,
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
    x: -15,
    z: 25,
    w: 6.2,
    d: 5.58,
    h: 4.38,
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
    x: 8.75,
    z: 25,
    w: 4.96,
    d: 4.96,
    h: 12.81,
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
  | "lamp"
  /* 工坊 */
  | "pad"
  | "workbench"
  | "lumber"
  | "anvil"
  | "cart"
  | "shelf"
  | "grindstone"
  /* 市政厅 */
  | "paving"
  | "plinth"
  | "topiary"
  | "flagpole"
  | "notice"
  | "monument";

export type AnnexDef = {
  kind: AnnexKind;
  x: number;
  z: number;
  rot?: number;
  length?: number;
  /** pad 用：场地的宽与进深 */
  w?: number;
  d?: number;
  accent?: AccentKey;
};

/** 一个地点 = 主楼 + 这些附属物。目前先做三个院落示范。 */
export type SiteDef = {
  id: string;
  annexes: AnnexDef[];
};

export const SITES: SiteDef[] = [
  {
    id: "workshop",
    annexes: [
      // 夯土场院：主楼东侧那一大片，干活的院子
      { kind: "pad", x: -10.4, z: -31.2, w: 8, d: 6.5 },
      // 院角的料棚，把西半边撑起来
      { kind: "shed", x: -13.5, z: -28.4, rot: 0, accent: "sun" },
      { kind: "lumber", x: -10.2, z: -28.2, rot: 0.02 },
      { kind: "workbench", x: -9.2, z: -32.5, rot: 0 },
      { kind: "shelf", x: -6.9, z: -29.6, rot: -Math.PI / 2 },
      { kind: "cart", x: -7.4, z: -34, rot: 1.2 },
      { kind: "anvil", x: -11.6, z: -33.9, rot: 0.1 },
      { kind: "grindstone", x: -8.2, z: -34, rot: 0 },
      { kind: "lamp", x: -6.6, z: -31.2 },
    ],
  },
  {
    id: "townhall",
    annexes: [
      // 报社搬走之后，整块地归市政厅：广场 10 × 9.2
      { kind: "paving", x: 7.9, z: 7.2, w: 10, d: 9.2 },
      { kind: "plinth", x: 7.5, z: 2.85, w: 7.6, d: 1.5 },
      // 门口两棵
      { kind: "topiary", x: 6, z: 4.1 },
      { kind: "topiary", x: 9, z: 4.1 },
      // 四角
      { kind: "topiary", x: 3.6, z: 3.4 },
      { kind: "topiary", x: 12.2, z: 3.4 },
      { kind: "topiary", x: 3.6, z: 11.2 },
      { kind: "topiary", x: 12.2, z: 11.2 },
      // 旗杆与公告栏
      { kind: "flagpole", x: 4.6, z: 7.4, accent: "blue" },
      { kind: "flagpole", x: 10.4, z: 7.4, accent: "coral" },
      { kind: "notice", x: 3.4, z: 7.4, rot: Math.PI / 2 },
      // 广场中心的纪念柱
      { kind: "monument", x: 7.9, z: 7.2 },
      // 长椅
      { kind: "bench", x: 6, z: 10.4, rot: 0 },
      { kind: "bench", x: 9, z: 10.4, rot: 0 },
    ],
  },
  {
    id: "cafe",
    annexes: [
      { kind: "fence", x: -8.6, z: 28.6, rot: 0, length: 4.6 },
      { kind: "fence", x: -6.6, z: 26.2, rot: Math.PI / 2, length: 4.8 },
      { kind: "table", x: -8.6, z: 23.6 },
      { kind: "table", x: -8.4, z: 27.2 },
      { kind: "table", x: -10.7, z: 26.9 },
      { kind: "parasol", x: -8.6, z: 23.6, accent: "coral" },
      { kind: "parasol", x: -10.7, z: 26.9, accent: "sun" },
      { kind: "chalkboard", x: -11.3, z: 28.1, rot: -0.4 },
      { kind: "planter", x: -9.2, z: 21.9, accent: "mint" },
      { kind: "lamp", x: -6.4, z: 22.4 },
    ],
  },
  {
    id: "gazette",
    annexes: [
      // 报社搬到东侧独立街区，印刷车间在楼西头
      { kind: "shed", x: 24, z: 1.5, rot: 0, accent: "coral" },
      { kind: "fence", x: 27.4, z: 6.6, rot: 0, length: 4 },
      { kind: "fence", x: 32.6, z: 6.6, rot: 0, length: 4 },
      { kind: "fence", x: 35.2, z: 3.2, rot: Math.PI / 2, length: 5.4 },
      { kind: "rack", x: 26.6, z: 7.6, rot: Math.PI / 2 },
      { kind: "barrels", x: 36.2, z: 7.4, rot: 0.3 },
      { kind: "well", x: 33.2, z: 8.2 },
      { kind: "lamp", x: 25.2, z: 8.4 },
    ],
  },
  {
    id: "bookshop",
    annexes: [
      { kind: "stall", x: 13, z: -21.5, rot: 0, accent: "mint" },
      { kind: "bench", x: 4.2, z: -18.4, rot: Math.PI / 2 },
      { kind: "bench", x: 4.2, z: -22.4, rot: Math.PI / 2 },
      { kind: "planter", x: 3.9, z: -20.4, accent: "violet" },
      { kind: "lamp", x: 13.2, z: -17.4 },
      { kind: "barrels", x: 13.4, z: -24.2, rot: -0.2 },
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
  { id: "house-nw-1", kind: "house", x: -35.5, z: -34.5, w: 4.96, d: 4.65, h: 3, accent: "mint", roof: "gable" },
  { id: "house-nw-2", kind: "house", x: -35.5, z: -26.5, w: 4.65, d: 4.65, h: 2.75, accent: "sun", roof: "gable" },
  { id: "house-nw-3", kind: "house", x: -35.5, z: -19.25, w: 4.34, d: 4.34, h: 2.63, accent: "coral", roof: "gable" },
  { id: "warehouse", kind: "warehouse", x: 31.75, z: -18, w: 7.75, d: 5.27, h: 3.75, accent: "sky", roof: "gable" },
  { id: "house-se-1", kind: "house", x: 34, z: 24.25, w: 4.96, d: 4.65, h: 3, accent: "violet", roof: "gable" },
  { id: "house-se-2", kind: "house", x: 34, z: 31.75, w: 4.65, d: 4.65, h: 2.75, accent: "mint", roof: "gable" },
  { id: "house-se-3", kind: "house", x: 26.5, z: 35.25, w: 4.34, d: 4.34, h: 2.63, accent: "sun", roof: "gable" },
  { id: "watertower", kind: "watertower", x: 37, z: 14, w: 4.03, d: 4.03, h: 6.75, accent: "sky", roof: "flat" },
];

/* ------------------------------ 街景点位 ------------------------------ */

export const LAMPS: [number, number][] = [
  [-6.75, -34.25],
  [-6.5, -22],
  [1.75, -28],
  [-6.25, 3],
  [2.13, -5.75],
  [-6, 20.5],
  [2.25, 9.25],
  [-5.75, 35.5],
  [-19.25, -9.25],
  [-9.25, -15.75],
  [2.6, -9.25],
  [13, -15.75],
  [-19.5, 13],
  [4.5, 20.5],
  [-9.25, 19.5],
  [13.5, 20.5],
];

export const BENCHES: { x: number; z: number; rot: number }[] = [
  { x: -2.5, z: -3.5, rot: 0 },
  { x: -8, z: 1.5, rot: Math.PI / 2 },
  { x: -4, z: 8.6, rot: 0 },
  { x: -2.5, z: 6.5, rot: Math.PI },
  { x: -37.75, z: 21.75, rot: 0.6 },
  { x: -32.75, z: 19.75, rot: -0.4 },
  { x: -33, z: 36.75, rot: Math.PI },
  { x: -28, z: 30.75, rot: -1.2 },
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
  { x: -0.25, z: -1.5, accent: "coral" },
  { x: 0.5, z: 3.25, accent: "sun" },
  { x: -5.25, z: 4, accent: "mint" },
];

export const PARK_TREES: [number, number, number][] = [
  [-38.2, 19.6, 1.05],
  [-38.2, 30.5, 1.1],
  [-37.5, 37.5, 0.95],
  [-30.75, 37.0, 1],
  [-27.75, 34.25, 0.9],
  [-27.75, 25.5, 1.05],
  [-29.25, 19.5, 0.95],
  [-34.5, 19, 1],
];

export const STREET_TREES: [number, number, number][] = [
  [-39.25, -7.5, 1.05],
  [-39.25, 1.25, 1.1],
  [-39.25, 9.25, 0.95],
  [20.75, -23.25, 1.05],
  [21, -5, 0.95],
  [20.75, 6.25, 1.1],
  [21, 23, 1],
  [-39.25, 14.25, 1],
  [-7.5, -38.75, 0.95],
  [2, -38.75, 1.05],
  [-10, 38.75, 1],
  [3.25, 38.75, 1.05],
  [-24.5, -35.75, 1.05],
  [35.5, -27, 0.95],
  [35.75, -12, 1],
  [24.25, 15.75, 1.05],
  [15.5, 34.5, 0.95],
  [-22, 15.5, 1],
  [38.2, 36.6, 0.95],
  [-24.25, -23.25, 1],
  [-24.5, -3.25, 0.9],
  [15.25, -34.5, 1],
];

/* ------------------------------ 生活细节布局 ------------------------------ */

export type PropSpot = { x: number; z: number; s?: number };
export type FlowerSpot = { x: number; z: number; accent: AccentKey };
export type PlacedProp = { x: number; z: number; rot: number; length?: number; accent?: AccentKey };

export const YARDS: { x: number; z: number; w: number; d: number }[] = [
  { x: -18.5, z: -36.6, w: 8, d: 2.8 },
  { x: 7.5, z: -36.8, w: 7, d: 2.6 },
  { x: 30, z: -36.4, w: 5.5, d: 3 },
  { x: -15, z: -10.5, w: 7.5, d: 11 },
  { x: -15, z: 10.5, w: 7.5, d: 9.5 },
  { x: -34.5, z: 0.6, w: 6.5, d: 5 },
  { x: -34, z: 12, w: 7.5, d: 5.5 },
  { x: 7.5, z: -8, w: 8, d: 6 },
  { x: 7.5, z: -25.5, w: 7, d: 4.2 },
  { x: 36, z: 2, w: 5, d: 9 },
  { x: 8.75, z: 31.5, w: 7, d: 6 },
];

export const BUSHES: PropSpot[] = [
  { x: -23.5, z: -34.5, s: 1.2 },
  { x: -23.25, z: -26.75, s: 0.95 },
  { x: -10.25, z: -34.5, s: 1.1 },
  { x: -10.25, z: -22.5, s: 1 },
  { x: -19.25, z: -23, s: 1.15 },
  { x: -10.5, z: -16.5, s: 0.95 },
  { x: 3, z: -34.5, s: 1.1 },
  { x: 12.25, z: -34.25, s: 1 },
  { x: 2.75, z: -28, s: 1.05 },
  { x: 12.5, z: -27.75, s: 0.95 },
  { x: 2.75, z: -23.25, s: 1 },
  { x: 12.5, z: -23, s: 1.1 },
  { x: 25.5, z: -34.5, s: 1.05 },
  { x: 34.5, z: -34.25, s: 0.95 },
  { x: 25.25, z: -24.5, s: 1.1 },
  { x: 35.75, z: -23, s: 1 },
  { x: -38, z: -31.75, s: 1.05 },
  { x: -31.75, z: -31.5, s: 0.95 },
  { x: -38.4, z: -21.6, s: 1 },
  { x: -31.75, z: -24, s: 1.1 },
  { x: -38, z: -16.75, s: 0.95 },
  { x: -38.25, z: -8, s: 1.1 },
  { x: -30.25, z: -7.75, s: 0.95 },
  { x: -38.25, z: 4, s: 1 },
  { x: -30.25, z: 4.25, s: 1.15 },
  { x: -38.25, z: 10.75, s: 1 },
  { x: -30.25, z: 11, s: 0.95 },
  { x: -19.75, z: -5.75, s: 1.05 },
  { x: -10.25, z: -5.5, s: 0.95 },
  { x: -19.75, z: 4, s: 1 },
  { x: -10.5, z: 4.25, s: 1.1 },
  { x: -19.75, z: 13, s: 0.95 },
  { x: -10.25, z: 13.25, s: 1.05 },
  { x: -19.5, z: 23, s: 1 },
  { x: -10.5, z: 33.25, s: 1.15 },
  { x: 2.75, z: -5.5, s: 1.1 },
  { x: 12.5, z: -5.25, s: 1 },
  { x: 2.3, z: 6.6, s: 0.95 },
  { x: 12.75, z: 4.5, s: 1.05 },
  { x: 2.75, z: 15.75, s: 1 },
  { x: 12.5, z: 16, s: 1.1 },
  { x: 25.5, z: -5.25, s: 1.05 },
  { x: 34.5, z: -5, s: 0.95 },
  { x: 25.25, z: 6.75, s: 1 },
  { x: 35.75, z: 7, s: 1.1 },
  { x: 25.5, z: 16.75, s: 0.95 },
  { x: 34.25, z: 18, s: 1.05 },
  { x: 3.25, z: 23, s: 1.1 },
  { x: 13.75, z: 22.75, s: 1 },
  { x: 3.25, z: 32, s: 0.95 },
  { x: 13.75, z: 32.25, s: 1.05 },
  { x: 20.4, z: 27.5, s: 1 },
  { x: 37.4, z: 27.6, s: 1.1 },
  { x: 20.5, z: 36.75, s: 0.95 },
];

export const FLOWERS: FlowerSpot[] = [
  { x: -8, z: -2.75, accent: "coral" },
  { x: 2.3, z: -6.4, accent: "sun" },
  { x: -8, z: 6, accent: "violet" },
  { x: 3.25, z: 6.25, accent: "mint" },
  { x: -5.75, z: -15.5, accent: "sun" },
  { x: 2.25, z: -15.75, accent: "coral" },
  { x: -6, z: 19.5, accent: "mint" },
  { x: 2.25, z: 19.75, accent: "violet" },
  { x: -11.5, z: -31.5, accent: "coral" },
  { x: -11.25, z: -28.5, accent: "sun" },
  { x: 2.6, z: -31.5, accent: "violet" },
  { x: 2.6, z: -28.5, accent: "mint" },
  { x: 12.6, z: -3.6, accent: "coral" },
  { x: 13.2, z: 1.5, accent: "sun" },
  { x: -11.75, z: -2, accent: "mint" },
  { x: -11.5, z: 5.5, accent: "violet" },
  { x: -11.75, z: 21.75, accent: "coral" },
  { x: -11, z: 32, accent: "sun" },
  { x: 5.25, z: 27.5, accent: "mint" },
  { x: 24.4, z: 2.75, accent: "coral" },
  { x: 35, z: 3, accent: "violet" },
  { x: -38, z: 18.25, accent: "sun" },
  { x: -30.75, z: 17.75, accent: "coral" },
  { x: -35.5, z: 36.75, accent: "mint" },
  { x: 15.75, z: -18, accent: "sun" },
  { x: 16, z: 30.75, accent: "coral" },
];

export const FENCES: PlacedProp[] = [
  { x: -36.9, z: -31.3, rot: 0, length: 1.9 },
  { x: -34.1, z: -31.3, rot: 0, length: 1.9 },
  { x: -36.9, z: -23.3, rot: 0, length: 1.9 },
  { x: -34.1, z: -23.3, rot: 0, length: 1.9 },
  { x: 32.6, z: 27.4, rot: 0, length: 1.9 },
  { x: 35.4, z: 27.4, rot: 0, length: 1.9 },
  { x: 29.5, z: 35.25, rot: Math.PI / 2, length: 2.4 },
];

export const BICYCLES: PlacedProp[] = [
  { x: -12.8, z: -26.5, rot: Math.PI / 2 },
  { x: 14.25, z: -18, rot: 0 },
  { x: -19.25, z: 28, rot: Math.PI / 2 },
  { x: 13, z: 7.5, rot: Math.PI / 2 },
  { x: 31.6, z: 34, rot: 0 },
];

export const CLOTHESLINES: PlacedProp[] = [
  { x: -30.8, z: -29.6, rot: 0, length: 2.8 },
  { x: 31.5, z: 29, rot: 0, length: 2.8 },
  { x: -30.5, z: -22, rot: 0.3, length: 2.4 },
];

export const BINS: [number, number][] = [
  [-7, 7.25],
  [3, -7],
  [-37.5, 15.75],
  [-32.25, 35.5],
  [-7.25, -18],
  [3.25, 16.75],
  [20.75, 13],
];

export const CRATES: PlacedProp[] = [
  { x: 24.2, z: -30.2, rot: 0.32 },
  { x: -20, z: -35.75, rot: -0.2 },
  { x: 33, z: 20.5, rot: 0.5 },
];

export const POTS: { x: number; z: number; accent: AccentKey }[] = [
  { x: -11.75, z: -32.5, accent: "coral" },
  { x: 2.55, z: -32.5, accent: "sun" },
  { x: -11.5, z: -18.25, accent: "violet" },
  { x: 2.55, z: -18.25, accent: "mint" },
  { x: -11.25, z: 35.75, accent: "coral" },
  { x: 4.75, z: 15.75, accent: "sun" },
  { x: 21.75, z: -20.5, accent: "mint" },
];

export const BARRELS: { x: number; z: number }[] = [
  { x: -8.2, z: -26.4 },
  { x: -11.25, z: 36.75 },
  { x: 35.5, z: -26.25 },
];

export const SIGNPOSTS: PlacedProp[] = [
  { x: -7.75, z: -9.5, rot: -0.3 },
  { x: 3.75, z: 21.75, rot: 0.4 },
];

export const PARK_GATES: [number, number][] = [
  [-28.62, 19],
  [-28.62, 37.25],
];

export function buildingById(id: string): BuildingDef | undefined {
  return BUILDINGS.find((b) => b.id === id);
}
