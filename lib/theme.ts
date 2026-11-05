/**
 * 主题注册表：一处定义，服务端渲染、主题切换器、设置页共用。
 * 新增主题：这里加一条 + app/desktop.css 加一段 token 覆盖即可。
 */

export const THEME_COOKIE = "bs_theme";

export type ThemeId = "clear" | "glass" | "minimal" | "tiling" | "paper";

/** skin = 只换颜色/圆角/字体；layout = 还会重排首页布局 */
export type ThemeKind = "skin" | "layout";

export type ThemeDef = {
  id: ThemeId;
  name: string;
  en: string;
  desc: string;
  kind: ThemeKind;
  /** 用于设置页的小色块：壁纸 / 强调色 / 表面色 */
  swatches: [string, string, string];
};

/** 默认主题：纸面工作台 */
export const DEFAULT_THEME: ThemeId = "paper";

export const THEMES: ThemeDef[] = [
  {
    id: "paper",
    name: "纸面工作台",
    en: "Paper Desk",
    desc: "米白纸面 + 图钉便签 + 宋体，温和、有手作感",
    kind: "layout",
    swatches: ["#efe9dc", "#a2573a", "#fbf7ee"],
  },
  {
    id: "clear",
    name: "清爽桌面",
    en: "Clear Desktop",
    desc: "浅色壁纸 + 白色窗口 + 底部 Dock，最好懂、最平衡",
    kind: "skin",
    swatches: ["#dbeafe", "#3b6ef6", "#ffffff"],
  },
  {
    id: "glass",
    name: "毛玻璃桌面",
    en: "Glass Desktop",
    desc: "深色壁纸 + 半透明窗口，最有系统感，适合做主视觉",
    kind: "skin",
    swatches: ["#1b1440", "#8ab4ff", "#2a1e3f"],
  },
  {
    id: "minimal",
    name: "极简工作台",
    en: "Minimal Desk",
    desc: "近白底 + 细边框分栏 + 单一墨绿，最克制、最耐久",
    kind: "skin",
    swatches: ["#fbfbfa", "#0f766e", "#e8e8e4"],
  },
  {
    id: "tiling",
    name: "平铺工作台",
    en: "Tiling Workspace",
    desc: "深色四宫格平铺，工具 / AI / 待办 / 热点各占一格",
    kind: "layout",
    swatches: ["#0f1215", "#ffb454", "#23292f"],
  },
];

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEMES.some((theme) => theme.id === value);
}

export function normalizeTheme(value: string | null | undefined): ThemeId {
  return isThemeId(value) ? value : DEFAULT_THEME;
}

export function themeById(id: ThemeId): ThemeDef {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}
