/**
 * 灵感画廊精选提示词（静态内容，12 条，6 个分类）。
 * 卡片的缩略图由 lib/ai/svg.ts 按提示词实时生成，所以和演示模式出图完全一致。
 */

import type { DrawingSizeKey, DrawingStyleKey } from "./svg";

export const GALLERY_CATEGORIES = [
  { key: "all", label: "全部" },
  { key: "abstract", label: "抽象几何" },
  { key: "nature", label: "自然风景" },
  { key: "city", label: "城市建筑" },
  { key: "character", label: "人物角色" },
  { key: "still", label: "静物产品" },
  { key: "scifi", label: "科幻未来" },
] as const;

export type GalleryCategoryKey = (typeof GALLERY_CATEGORIES)[number]["key"];

export type GalleryItem = {
  id: string;
  title: string;
  prompt: string;
  category: Exclude<GalleryCategoryKey, "all">;
  style: DrawingStyleKey;
  size: DrawingSizeKey;
  note: string;
};

export const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: "color-storm",
    title: "色块风暴",
    prompt: "珊瑚红与电光蓝的几何色块在米白纸面上碰撞，粗黑描边，复古海报构图，像一场安静的爆炸",
    category: "abstract",
    style: "flat",
    size: "1:1",
    note: "撞色 + 粗边，适合做封面",
  },
  {
    id: "orbit-planets",
    title: "轨道与行星",
    prompt: "深蓝夜空里三颗星球沿倾斜轨道运行，细线勾勒，中心一颗巨大的暖黄色星球，大量留白",
    category: "abstract",
    style: "line",
    size: "1:1",
    note: "线稿风格，适合当壁纸",
  },
  {
    id: "fog-lighthouse",
    title: "雾中灯塔",
    prompt: "海雾里的灯塔，薄荷绿的海面与柠檬黄的灯光，几何色块拼成的安静夜晚，远处有一点暖光",
    category: "nature",
    style: "flat",
    size: "9:16",
    note: "竖图，适合手机壁纸",
  },
  {
    id: "ridge-sunset",
    title: "山脊日落",
    prompt: "层层叠叠的山脊被落日染成珊瑚色，天空是紫色的分层渐变，极简矢量插画，一只鸟飞过",
    category: "nature",
    style: "vintage",
    size: "16:9",
    note: "套色印刷质感，像旧海报",
  },
  {
    id: "iso-town",
    title: "等距小城",
    prompt: "等距视角下的方块小城，楼房高低错落，薄荷绿与天蓝配色，干净明亮，街道上有几棵树",
    category: "city",
    style: "isometric",
    size: "1:1",
    note: "等距立体，细节丰富",
  },
  {
    id: "midnight-roof",
    title: "午夜天台",
    prompt: "城市天台上的水塔、霓虹灯与晾衣绳，深色背景，几何霓虹色块，赛博但不杂乱",
    category: "city",
    style: "vintage",
    size: "16:9",
    note: "暗色底，颗粒感强",
  },
  {
    id: "profile-silhouette",
    title: "侧脸剪影",
    prompt: "一个人的侧脸剪影由几何色块组成，发丝是流动的线条，紫色与珊瑚色渐变，大面积留白",
    category: "character",
    style: "line",
    size: "9:16",
    note: "线稿人像，情绪安静",
  },
  {
    id: "astronaut-pixel",
    title: "像素宇航员",
    prompt: "穿白色宇航服的宇航员漂浮在几何星云之中，像素风格，暖色调，背景有细小的星星",
    category: "character",
    style: "pixel",
    size: "1:1",
    note: "像素风，适合头像",
  },
  {
    id: "coffee-book",
    title: "咖啡与书",
    prompt: "木桌上的咖啡杯和摊开的书，等距视角，暖黄色调，扁平几何插画，午后光线",
    category: "still",
    style: "isometric",
    size: "1:1",
    note: "静物小品，很耐看",
  },
  {
    id: "vinyl-flowers",
    title: "唱片与花",
    prompt: "复古唱片机旁边一束几何形状的花，套色偏移的印刷质感，柔和的粉色与绿色，安静的室内",
    category: "still",
    style: "vintage",
    size: "1:1",
    note: "复古印刷，颜色柔和",
  },
  {
    id: "pixel-station",
    title: "像素太空站",
    prompt: "像素风格的太空站漂浮在星系之间，深紫色的宇宙，星星点点，远处有一颗蓝色的行星",
    category: "scifi",
    style: "pixel",
    size: "16:9",
    note: "像素横图，游戏感强",
  },
  {
    id: "data-garden",
    title: "数据花园",
    prompt: "线稿风格的数据花园，抽象的花草从等距网格里生长出来，单色线条，大量留白，像技术草图",
    category: "scifi",
    style: "line",
    size: "16:9",
    note: "线条 + 网格，冷静克制",
  },
];
