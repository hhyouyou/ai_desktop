/**
 * 程序化几何 SVG 引擎 —— AI 画图「演示模式」的生成器。
 *
 * 设计目标：不写「占位图」字样，而是根据提示词 hash 生成一张真正有构图、
 * 有配色、有层次的几何海报，让没有 API Key 的用户也能看到完整的产品体验。
 *
 * 特性：
 * - 完全确定性：同样的 prompt + style + size + seed 一定得到同一张图；
 * - 同构：只依赖纯 TS，浏览器里也能直接调用（灵感画廊的缩略图就是它算的）；
 * - 五种风格：扁平几何 / 等距 / 线稿 / 复古印刷 / 像素；
 * - 七种构图：方块城市、轨道、山脊、包豪斯网格、拱门、散点、编织。
 *
 * 不依赖任何第三方库，也不使用 node 专有 API。
 */

/* -------------------------------------------------------------------------- */
/*                                  类型与常量                                  */
/* -------------------------------------------------------------------------- */

export const DRAWING_STYLES = [
  { key: "flat", label: "扁平几何", desc: "粗描边 + 硬色块", accent: "coral" },
  { key: "isometric", label: "等距", desc: "斜 30° 立方体堆叠", accent: "blue" },
  { key: "line", label: "线稿", desc: "单色描边 · 留白", accent: "ink" },
  { key: "vintage", label: "复古印刷", desc: "套色偏移 + 网点", accent: "sun" },
  { key: "pixel", label: "像素", desc: "32 格方块像素", accent: "mint" },
] as const;

export type DrawingStyleKey = (typeof DRAWING_STYLES)[number]["key"];

export const DRAWING_SIZES = [
  { key: "1:1", label: "1:1", hint: "方形", width: 1024, height: 1024, ratio: 1 },
  { key: "16:9", label: "16:9", hint: "横图", width: 1440, height: 810, ratio: 16 / 9 },
  { key: "9:16", label: "9:16", hint: "竖图", width: 864, height: 1536, ratio: 9 / 16 },
] as const;

export type DrawingSizeKey = (typeof DRAWING_SIZES)[number]["key"];

export function isDrawingStyle(value: string): value is DrawingStyleKey {
  return DRAWING_STYLES.some((item) => item.key === value);
}

export function isDrawingSize(value: string): value is DrawingSizeKey {
  return DRAWING_SIZES.some((item) => item.key === value);
}

export function getDrawingStyle(key: DrawingStyleKey): (typeof DRAWING_STYLES)[number] {
  return DRAWING_STYLES.find((item) => item.key === key) ?? DRAWING_STYLES[0];
}

export function getDrawingSize(key: DrawingSizeKey): (typeof DRAWING_SIZES)[number] {
  return DRAWING_SIZES.find((item) => item.key === key) ?? DRAWING_SIZES[0];
}

/* -------------------------------------------------------------------------- */
/*                                  配色与色板                                  */
/* -------------------------------------------------------------------------- */

type Palette = {
  bg: string;
  ink: string;
  colors: readonly [string, string, string, string];
  dark: boolean;
};

const PALETTES: readonly Palette[] = [
  { bg: "#FFF6E8", ink: "#14110F", colors: ["#FF5A36", "#FFC93C", "#2F5BFF", "#00C48C"], dark: false },
  { bg: "#EAF2FF", ink: "#101A3D", colors: ["#2F5BFF", "#7FD1FF", "#FFC93C", "#FF5A36"], dark: false },
  { bg: "#14110F", ink: "#FFFCF5", colors: ["#FFC93C", "#FF5A36", "#7FD1FF", "#9B6BFF"], dark: true },
  { bg: "#F4EFE3", ink: "#14110F", colors: ["#00C48C", "#FF5A36", "#14110F", "#FFC93C"], dark: false },
  { bg: "#FFE9E4", ink: "#2B140E", colors: ["#FF5A36", "#9B6BFF", "#FFC93C", "#00C48C"], dark: false },
  { bg: "#E8FBF3", ink: "#0C2A20", colors: ["#00C48C", "#2F5BFF", "#FFC93C", "#FF5A36"], dark: false },
  { bg: "#F1E9FF", ink: "#1F1338", colors: ["#9B6BFF", "#FF8FB1", "#7FD1FF", "#FFC93C"], dark: false },
  { bg: "#0F1B3D", ink: "#FFFCF5", colors: ["#7FD1FF", "#FFC93C", "#FF5A36", "#00C48C"], dark: true },
  { bg: "#FFF8D9", ink: "#241C05", colors: ["#FFC93C", "#FF5A36", "#2F5BFF", "#14110F"], dark: false },
  { bg: "#1B2B24", ink: "#F7F1E6", colors: ["#00C48C", "#FFC93C", "#FF8FB1", "#FFFCF5"], dark: true },
];

const VINTAGE_PALETTES = [0, 3, 4, 8] as const;
const BRAND_ACCENTS = ["#FF5A36", "#FFC93C", "#2F5BFF", "#00C48C", "#9B6BFF", "#7FD1FF"] as const;

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((ch) => `${ch}${ch}`)
          .join("")
      : clean.padEnd(6, "0").slice(0, 6);
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((value) => clampByte(value).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** amt 为正变亮、为负变暗，取值 -1 ~ 1 */
export function shade(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  const target = amt >= 0 ? 255 : 0;
  const t = Math.abs(amt);
  return rgbToHex(r + (target - r) * t, g + (target - g) * t, b + (target - b) * t);
}

/** 两色线性混合，t = 0 取 a，t = 1 取 b */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.round(alpha * 100) / 100})`;
}

/* -------------------------------------------------------------------------- */
/*                               随机数与种子                                   */
/* -------------------------------------------------------------------------- */

/** FNV-1a 32 位哈希：提示词 → 稳定的整数种子 */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* -------------------------------------------------------------------------- */
/*                                  绘制上下文                                  */
/* -------------------------------------------------------------------------- */

type Scene = { defs: string[]; body: string };

type Ctx = {
  rnd: () => number;
  W: number;
  H: number;
  M: number;
  pal: Palette;
  ink: string;
  style: DrawingStyleKey;
  idp: string;
  /** 区间随机 */
  r: (min: number, max: number) => number;
  /** 整数随机（含两端） */
  ri: (min: number, max: number) => number;
  pick: <T>(list: readonly T[]) => T;
  chance: (p: number) => boolean;
  /** 形状填充：线稿风格下统一返回 none */
  fill: (color: string) => string;
  /** 线稿风格下用排线填充，其它风格直接用颜色 */
  hatchFill: (color: string) => string;
  /** 始终实色（用于小圆点、鸟类等细节） */
  solid: (color: string) => string;
  /** 描边宽度：线稿风格自动变细 */
  sw: (base: number) => number;
};

function createCtx(
  W: number,
  H: number,
  style: DrawingStyleKey,
  rnd: () => number,
  idp: string,
): Ctx {
  const M = Math.min(W, H);
  let pal: Palette;
  if (style === "line") {
    const accent = BRAND_ACCENTS[Math.floor(rnd() * BRAND_ACCENTS.length)];
    pal = { bg: "#FFFCF5", ink: "#14110F", colors: [accent, "#14110F", accent, "#58514A"], dark: false };
  } else if (style === "vintage") {
    pal = PALETTES[VINTAGE_PALETTES[Math.floor(rnd() * VINTAGE_PALETTES.length)]];
  } else {
    pal = PALETTES[Math.floor(rnd() * PALETTES.length)];
  }

  const r = (min: number, max: number) => min + rnd() * (max - min);
  const ri = (min: number, max: number) => Math.floor(r(min, max + 1));
  return {
    rnd,
    W,
    H,
    M,
    pal,
    ink: pal.ink,
    style,
    idp,
    r,
    ri,
    pick: <T,>(list: readonly T[]): T => list[Math.floor(rnd() * list.length)],
    chance: (p: number) => rnd() < p,
    fill: (color: string) => (style === "line" ? "none" : color),
    hatchFill: (color: string) => (style === "line" ? `url(#${idp}_hatch)` : color),
    solid: (color: string) => color,
    sw: (base: number) => (style === "line" ? Math.max(2, base * 0.52) : base),
  };
}

/* -------------------------------------------------------------------------- */
/*                                  绘制小工具                                  */
/* -------------------------------------------------------------------------- */

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 数字保留一位小数，控制 SVG 体积 */
function n(value: number): string {
  return String(Math.round(value * 10) / 10);
}

function circle(cx: number, cy: number, r: number, attrs: string): string {
  return `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" ${attrs}/>`;
}

function rect(x: number, y: number, w: number, h: number, attrs: string): string {
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" ${attrs}/>`;
}

function bird(ctx: Ctx, x: number, y: number, size: number): string {
  return `<path d="M ${n(x)} ${n(y)} q ${n(size * 0.5)} ${n(-size * 0.56)} ${n(size)} 0 q ${n(size * 0.5)} ${n(-size * 0.56)} ${n(size)} 0" fill="none" stroke="${ctx.ink}" stroke-width="${n(ctx.sw(3.6))}" stroke-linecap="round" opacity="0.72"/>`;
}

function ridgePath(
  W: number,
  H: number,
  baseY: number,
  amp: number,
  waves: number,
  phase: number,
  steps: number,
): string {
  let d = `M 0 ${n(H)} L 0 ${n(baseY + Math.sin(phase) * amp)}`;
  for (let i = 1; i <= steps; i += 1) {
    const x = (W * i) / steps;
    const y = baseY + Math.sin(phase + (i / steps) * Math.PI * 2 * waves) * amp;
    d += ` L ${n(x)} ${n(y)}`;
  }
  d += ` L ${n(W)} ${n(H)} Z`;
  return d;
}

/* -------------------------------------------------------------------------- */
/*                                   构图一：方块城市                            */
/* -------------------------------------------------------------------------- */

function sceneBlocks(ctx: Ctx): Scene {
  const { W, H, M } = ctx;
  const defs: string[] = [];
  const parts: string[] = [];
  const margin = M * 0.075;
  const baseY = H * 0.87;

  // 底部的柔光
  parts.push(circle(W * 0.2, H * 0.16, M * 0.52, `fill="${rgba(ctx.pal.colors[0], 0.1)}"`));

  // 太阳
  const sunR = M * ctx.r(0.13, 0.19);
  const sunX = W * ctx.r(0.16, 0.44);
  const sunY = H * ctx.r(0.2, 0.3);
  parts.push(
    circle(
      sunX,
      sunY,
      sunR,
      `fill="${ctx.fill(ctx.pick(ctx.pal.colors))}" stroke="${ctx.ink}" stroke-width="${n(ctx.sw(6))}"`,
    ),
  );

  // 远处的水平参考线
  for (let i = 0; i < 3; i += 1) {
    const y = H * (0.36 + i * 0.13);
    parts.push(
      `<line x1="${n(margin)}" y1="${n(y)}" x2="${n(W - margin)}" y2="${n(y)}" stroke="${ctx.ink}" stroke-width="${n(ctx.sw(2))}" opacity="0.16"/>`,
    );
  }

  // 一排向右升高的方块
  const count = ctx.ri(6, 9);
  const gap = M * 0.024;
  const step = (W - margin * 2) / count;
  const shadow = M * 0.014;
  const offset = ctx.ri(0, 3);
  for (let i = 0; i < count; i += 1) {
    const bw = step - gap;
    const t = count <= 1 ? 1 : i / (count - 1);
    const bh = H * (0.16 + 0.4 * t) * ctx.r(0.92, 1.06);
    const x = margin + i * step + gap / 2;
    const y = baseY - bh;
    const color = ctx.pal.colors[(i + offset) % 4];
    const radius = Math.min(bw, bh) * 0.16;

    if (ctx.style !== "line") {
      parts.push(
        rect(x + shadow, y + shadow, bw, bh, `rx="${n(radius)}" fill="${ctx.ink}" opacity="0.9"`),
      );
    }
    parts.push(
      rect(
        x,
        y,
        bw,
        bh,
        `rx="${n(radius)}" fill="${ctx.fill(color)}" stroke="${ctx.ink}" stroke-width="${n(ctx.sw(7))}"`,
      ),
    );

    // 小窗户，让方块看起来像建筑
    if (bw > M * 0.05) {
      const cols = bw > M * 0.09 ? 2 : 1;
      const cell = Math.min(bw / (cols + 1), M * 0.05);
      const maxRows = Math.min(3, Math.floor((bh - cell * 1.2) / (cell * 1.7)));
      const winFill = ctx.style === "line" ? "none" : rgba(ctx.pal.dark ? "#FFFFFF" : ctx.pal.ink, 0.18);
      for (let wy = 0; wy < maxRows; wy += 1) {
        for (let wx = 0; wx < cols; wx += 1) {
          const px = x + bw / 2 - (cols * cell * 1.55) / 2 + wx * cell * 1.55;
          const py = y + bh * 0.18 + wy * cell * 1.7;
          parts.push(
            rect(
              px,
              py,
              cell,
              cell,
              `rx="${n(cell * 0.3)}" fill="${winFill}" stroke="${ctx.style === "line" ? ctx.ink : "none"}" stroke-width="${n(cell * 0.12)}"`,
            ),
          );
        }
      }
    }
  }

  // 地面
  parts.push(
    `<line x1="${n(margin * 0.6)}" y1="${n(baseY)}" x2="${n(W - margin * 0.6)}" y2="${n(baseY)}" stroke="${ctx.ink}" stroke-width="${n(ctx.sw(5))}" stroke-linecap="round"/>`,
  );

  // 漂浮的小圆点与鸟
  const floaters = ctx.ri(3, 6);
  for (let i = 0; i < floaters; i += 1) {
    const r = M * ctx.r(0.008, 0.022);
    const x = ctx.r(margin, W - margin);
    const y = ctx.r(H * 0.12, H * 0.42);
    parts.push(
      circle(x, y, r, `fill="${ctx.solid(ctx.pal.colors[(i + 1) % 4])}" stroke="${ctx.ink}" stroke-width="${n(ctx.sw(2.4))}"/>`),
    );
  }
  const birdCount = ctx.ri(1, 3);
  for (let i = 0; i < birdCount; i += 1) {
    parts.push(bird(ctx, ctx.r(W * 0.45, W * 0.86), ctx.r(H * 0.14, H * 0.3), M * ctx.r(0.02, 0.032)));
  }

  return { defs, body: parts.join("") };
}

/* -------------------------------------------------------------------------- */
/*                                   构图二：轨道                                */
/* -------------------------------------------------------------------------- */

function sceneOrbit(ctx: Ctx): Scene {
  const { W, H, M } = ctx;
  const parts: string[] = [];
  const defs: string[] = [];
  const cx = W * ctx.r(0.45, 0.55);
  const cy = H * ctx.r(0.47, 0.55);
  const coreR = M * ctx.r(0.15, 0.21);
  const colors = ctx.pal.colors;

  // 背景的大色块
  const bgShape = ctx.ri(0, 2);
  if (bgShape === 0) {
    parts.push(circle(W, 0, M * 0.42, `fill="${ctx.fill(colors[ctx.ri(0, 3)])}" opacity="0.92"`));
  } else if (bgShape === 1) {
    parts.push(rect(0, H * 0.72, W, H * 0.28, `fill="${ctx.fill(colors[ctx.ri(0, 3)])}"`));
  } else {
    parts.push(circle(W * 0.08, H * 0.92, M * 0.34, `fill="${ctx.fill(colors[ctx.ri(0, 3)])}" opacity="0.9"`));
  }

  // 斜向色带
  const band = ctx.pick(colors);
  parts.push(
    `<g transform="rotate(${n(ctx.r(-24, -10))} ${n(cx)} ${n(cy)})" opacity="${ctx.style === "line" ? 0 : 0.16}">${rect(-W * 0.3, cy - M * 0.035, W * 1.7, M * 0.07, `fill="${ctx.solid(band)}"`)}</g>`,
  );

  // 倾斜的轨道与卫星
  const ringCount = ctx.ri(2, 3);
  for (let i = 0; i < ringCount; i += 1) {
    const rx = coreR * (1.65 + i * 0.62);
    const ry = rx * ctx.r(0.36, 0.52);
    const angle = ctx.r(-52, 52);
    const t = ctx.r(0.15, 0.85) * Math.PI * 2;
    const dotR = M * ctx.r(0.014, 0.03);
    const dotX = cx + Math.cos(t) * rx;
    const dotY = cy + Math.sin(t) * ry;
    parts.push(
      `<g transform="rotate(${n(angle)} ${n(cx)} ${n(cy)})">` +
        `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="none" stroke="${ctx.ink}" stroke-width="${n(ctx.sw(5))}" opacity="0.5"/>` +
        circle(dotX, dotY, dotR, `fill="${ctx.solid(colors[(i + 1) % 4])}" stroke="${ctx.ink}" stroke-width="${n(ctx.sw(3))}"`) +
        `</g>`,
    );
  }

  // 主星体
  const coreColor = colors[ctx.ri(0, 3)];
  parts.push(
    circle(
      cx,
      cy,
      coreR,
      `fill="${ctx.hatchFill(coreColor)}" stroke="${ctx.ink}" stroke-width="${n(ctx.sw(8))}"`,
    ),
  );
  if (ctx.style !== "line") {
    // 星球上的一弯高光
    parts.push(
      circle(cx - coreR * 0.28, cy - coreR * 0.32, coreR * 0.52, `fill="${rgba("#FFFFFF", 0.18)}"`),
    );
  }

  // 点阵
  const dots = ctx.ri(12, 20);
  for (let i = 0; i < dots; i += 1) {
    const x = ctx.r(M * 0.05, W - M * 0.05);
    const y = ctx.r(M * 0.05, H - M * 0.05);
    if (Math.hypot(x - cx, y - cy) < coreR * 1.2) continue;
    parts.push(
      circle(x, y, M * ctx.r(0.004, 0.01), `fill="${ctx.solid(ctx.ink)}" opacity="${n(ctx.r(0.25, 0.6))}"`),
    );
  }

  // 十字星
  const starX = W * ctx.r(0.14, 0.86);
  const starY = H * ctx.r(0.12, 0.36);
  const starLen = M * ctx.r(0.016, 0.03);
  parts.push(
    `<g stroke="${ctx.ink}" stroke-width="${n(ctx.sw(3))}" stroke-linecap="round"><line x1="${n(starX - starLen)}" y1="${n(starY)}" x2="${n(starX + starLen)}" y2="${n(starY)}"/><line x1="${n(starX)}" y1="${n(starY - starLen)}" x2="${n(starX)}" y2="${n(starY + starLen)}"/></g>`,
  );

  return { defs, body: parts.join("") };
}

/* -------------------------------------------------------------------------- */
/*                                   构图三：山脊                                */
/* -------------------------------------------------------------------------- */

function sceneRidges(ctx: Ctx): Scene {
  const { W, H, M } = ctx;
  const parts: string[] = [];
  const defs: string[] = [];
  const colors = ctx.pal.colors;

  // 太阳
  const sunX = W * ctx.r(0.28, 0.72);
  const sunY = H * ctx.r(0.2, 0.3);
  const sunR = M * ctx.r(0.11, 0.16);
  parts.push(
    circle(
      sunX,
      sunY,
      sunR,
      `fill="${ctx.hatchFill(ctx.pick(colors))}" stroke="${ctx.ink}" stroke-width="${n(ctx.sw(6))}"`,
    ),
  );

  // 山脊分层
  const layers = ctx.ri(3, 5);
  const start = H * 0.56;
  const span = H * 0.86 - start;
  const offset = ctx.ri(0, 3);
  for (let i = 0; i < layers; i += 1) {
    const baseY = start + (span * i) / Math.max(1, layers - 1);
    const amp = H * ctx.r(0.018, 0.05) * (1 - (i / layers) * 0.35);
    const waves = ctx.r(1.1, 2.4);
    const d = ridgePath(W, H, baseY, amp, waves, ctx.r(0, Math.PI * 2), 36);
    const color = colors[(i + offset) % 4];
    parts.push(
      `<path d="${d}" fill="${ctx.fill(color)}" stroke="${ctx.ink}" stroke-width="${n(ctx.sw(6))}" stroke-linejoin="round"/>`,
    );
  }

  // 鸟
  const birds = ctx.ri(2, 4);
  for (let i = 0; i < birds; i += 1) {
    parts.push(bird(ctx, ctx.r(W * 0.12, W * 0.88), ctx.r(H * 0.12, H * 0.42), M * ctx.r(0.018, 0.03)));
  }

  return { defs, body: parts.join("") };
}

/* -------------------------------------------------------------------------- */
/*                                 构图四：包豪斯网格                             */
/* -------------------------------------------------------------------------- */

function sceneBauhaus(ctx: Ctx): Scene {
  const { W, H, M } = ctx;
  const defs: string[] = [];
  const parts: string[] = [];
  const margin = M * 0.065;
  const gap = M * 0.02;
  const cols = W > H * 1.25 ? 4 : 3;
  const rows = H > W * 1.25 ? 4 : 3;
  const tw = (W - margin * 2 - gap * (cols - 1)) / cols;
  const th = (H - margin * 2 - gap * (rows - 1)) / rows;
  const colors = ctx.pal.colors;
  const offset = ctx.ri(0, 3);
  const sw = ctx.sw(6);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const index = row * cols + col;
      const x = margin + col * (tw + gap);
      const y = margin + row * (th + gap);
      const clipId = `${ctx.idp}_t${index}`;
      defs.push(
        `<clipPath id="${clipId}">${rect(x, y, tw, th, `rx="${n(M * 0.012)}"`)}</clipPath>`,
      );
      const color = colors[(offset + index) % 4];
      const shape = ctx.ri(0, 7);
      const inner: string[] = [];
      const attrs = `fill="${ctx.fill(color)}" stroke="${ctx.ink}" stroke-width="${n(sw)}"`;

      if (shape === 0) {
        inner.push(circle(x + tw / 2, y + th / 2, Math.min(tw, th) * 0.44, attrs));
      } else if (shape === 1) {
        inner.push(circle(x, y, tw * 1.04, attrs));
      } else if (shape === 2) {
        inner.push(circle(x + tw / 2, y + th * 0.98, tw * 0.56, attrs));
      } else if (shape === 3) {
        inner.push(
          `<polygon points="${n(x)},${n(y)} ${n(x + tw)},${n(y)} ${n(x)},${n(y + th)}" ${attrs}/>`,
        );
      } else if (shape === 4) {
        inner.push(
          circle(x + tw / 2, y + th / 2, Math.min(tw, th) * 0.34, `fill="none" stroke="${ctx.ink}" stroke-width="${n(sw * 2.2)}"`),
        );
      } else if (shape === 5) {
        const bar = th * ctx.r(0.16, 0.26);
        for (let i = 0; i < 3; i += 1) {
          inner.push(
            rect(x + tw * 0.12, y + th * 0.22 + i * bar * 1.9, tw * 0.76, bar, `fill="${ctx.hatchFill(color)}" stroke="${ctx.ink}" stroke-width="${n(ctx.sw(3))}"`),
          );
        }
      } else if (shape === 6) {
        const size = Math.min(tw, th) * ctx.r(0.3, 0.52);
        inner.push(
          rect(x + (tw - size) / 2, y + (th - size) / 2, size, size, `rx="${n(M * 0.008)}" fill="${ctx.hatchFill(color)}" stroke="${ctx.ink}" stroke-width="${n(sw)}"`),
        );
      } else {
        // 留白格，让整体呼吸
        inner.push(rect(x, y, tw, th, `fill="${ctx.pal.dark ? rgba("#FFFFFF", 0.05) : rgba(ctx.ink, 0.04)}"`));
      }
      parts.push(`<g clip-path="url(#${clipId})">${inner.join("")}</g>`);
    }
  }

  return { defs, body: parts.join("") };
}

/* -------------------------------------------------------------------------- */
/*                                  构图五：拱门                                 */
/* -------------------------------------------------------------------------- */

function sceneArches(ctx: Ctx): Scene {
  const { W, H, M } = ctx;
  const parts: string[] = [];
  const defs: string[] = [];
  const colors = ctx.pal.colors;
  const bottom = H * 0.88;
  const cx = W * (0.5 + ctx.r(-0.04, 0.04));
  const count = ctx.ri(5, 7);
  const outerHalf = Math.min(W * 0.34, M * 0.4);
  const offset = ctx.ri(0, 3);

  // 地面与投影
  parts.push(
    `<line x1="0" y1="${n(bottom)}" x2="${n(W)}" y2="${n(bottom)}" stroke="${ctx.ink}" stroke-width="${n(ctx.sw(5))}"/>`,
  );
  parts.push(
    `<ellipse cx="${n(cx)}" cy="${n(bottom + M * 0.01)}" rx="${n(outerHalf * 1.05)}" ry="${n(M * 0.02)}" fill="${ctx.solid(rgba(ctx.pal.dark ? "#000000" : ctx.ink, 0.16))}"/>`,
  );

  for (let i = 0; i < count; i += 1) {
    const t = count <= 1 ? 0 : i / (count - 1);
    const hw = outerHalf * (1 - 0.78 * t);
    const topY = H * 0.46 - t * (H * 0.46 - H * 0.13);
    const straight = Math.max(0, bottom - topY - hw);
    const color = colors[(offset + i) % 4];
    const d = `M ${n(cx - hw)} ${n(bottom)} L ${n(cx - hw)} ${n(bottom - straight)} A ${n(hw)} ${n(hw)} 0 0 1 ${n(cx + hw)} ${n(bottom - straight)} L ${n(cx + hw)} ${n(bottom)} Z`;
    parts.push(`<path d="${d}" fill="${ctx.fill(color)}" stroke="${ctx.ink}" stroke-width="${n(ctx.sw(6))}" stroke-linejoin="round"/>`);
  }

  // 顶部的小太阳与漂浮点
  parts.push(
    circle(cx, H * 0.09, M * 0.028, `fill="${ctx.hatchFill(colors[(offset + 2) % 4])}" stroke="${ctx.ink}" stroke-width="${n(ctx.sw(3))}"`),
  );
  const dots = ctx.ri(3, 6);
  for (let i = 0; i < dots; i += 1) {
    const x = ctx.r(M * 0.08, W - M * 0.08);
    const y = ctx.r(H * 0.1, H * 0.18);
    parts.push(circle(x, y, M * ctx.r(0.006, 0.014), `fill="${ctx.solid(ctx.ink)}" opacity="0.5"`));
  }

  return { defs, body: parts.join("") };
}

/* -------------------------------------------------------------------------- */
/*                                  构图六：散点                                 */
/* -------------------------------------------------------------------------- */

type ScatterShape = {
  kind: number;
  x: number;
  y: number;
  size: number;
  angle: number;
  color: string;
};

function scatterShape(ctx: Ctx, shape: ScatterShape): string {
  const { x, y, size, angle, color, kind } = shape;
  const attrs = `fill="${ctx.solid(color)}" stroke="${ctx.ink}" stroke-width="${n(ctx.sw(3.4))}" stroke-linejoin="round"`;
  const open = `fill="none" stroke="${ctx.ink}" stroke-width="${n(ctx.sw(3.2))}"`;
  if (kind === 0) return circle(x, y, size, attrs);
  if (kind === 1) {
    return `<g transform="rotate(${n(angle)} ${n(x)} ${n(y)})">${rect(x - size, y - size, size * 2, size * 2, `rx="${n(size * 0.22)}" ${attrs}`)}</g>`;
  }
  if (kind === 2) {
    return `<g transform="rotate(${n(angle)} ${n(x)} ${n(y)})"><polygon points="${n(x)},${n(y - size)} ${n(x + size)},${n(y + size * 0.9)} ${n(x - size)},${n(y + size * 0.9)}" ${attrs}/></g>`;
  }
  if (kind === 3) {
    return circle(x, y, size, open);
  }
  return `<g stroke="${ctx.ink}" stroke-width="${n(ctx.sw(3.4))}" stroke-linecap="round" transform="rotate(${n(angle)} ${n(x)} ${n(y)})"><line x1="${n(x - size)}" y1="${n(y)}" x2="${n(x + size)}" y2="${n(y)}"/><line x1="${n(x)}" y1="${n(y - size)}" x2="${n(x)}" y2="${n(y + size)}"/></g>`;
}

function sceneConfetti(ctx: Ctx): Scene {
  const { W, H, M } = ctx;
  const defs: string[] = [];
  const parts: string[] = [];
  const colors = ctx.pal.colors;
  const fx = W * ctx.r(0.36, 0.5);
  const fy = H * ctx.r(0.4, 0.5);
  const focalR = M * ctx.r(0.16, 0.22);

  // 背景大环与斜线
  parts.push(circle(fx, fy, M * ctx.r(0.32, 0.4), `fill="none" stroke="${ctx.ink}" stroke-width="${n(ctx.sw(2.4))}" opacity="0.28"`));
  parts.push(
    `<g transform="rotate(${n(ctx.r(-30, -12))} ${n(fx)} ${n(fy)})"><line x1="0" y1="${n(fy)}" x2="${n(W)}" y2="${n(fy)}" stroke="${ctx.ink}" stroke-width="${n(ctx.sw(2.4))}" opacity="0.28"/></g>`,
  );

  // 散布形状：一部分在主圆之后，一部分在前面
  const shapes: ScatterShape[] = [];
  const total = ctx.ri(20, 30);
  for (let i = 0; i < total; i += 1) {
    shapes.push({
      kind: ctx.ri(0, 4),
      x: ctx.r(M * 0.06, W - M * 0.06),
      y: ctx.r(M * 0.06, H - M * 0.06),
      size: M * ctx.r(0.012, 0.045),
      angle: ctx.r(0, 180),
      color: colors[ctx.ri(0, 3)],
    });
  }
  const behind = shapes.slice(0, Math.ceil(shapes.length * 0.6));
  const front = shapes.slice(behind.length);
  parts.push(...behind.map((shape) => scatterShape(ctx, shape)));

  // 主圆
  parts.push(
    circle(
      fx,
      fy,
      focalR,
      `fill="${ctx.hatchFill(colors[ctx.ri(0, 3)])}" stroke="${ctx.ink}" stroke-width="${n(ctx.sw(8))}"`,
    ),
  );
  if (ctx.style !== "line") {
    parts.push(circle(fx - focalR * 0.25, fy - focalR * 0.28, focalR * 0.4, `fill="${rgba("#FFFFFF", 0.16)}"`));
  }
  parts.push(...front.map((shape) => scatterShape(ctx, shape)));

  // 小圆点
  for (let i = 0; i < 14; i += 1) {
    parts.push(
      circle(ctx.r(0, W), ctx.r(0, H), M * ctx.r(0.003, 0.007), `fill="${ctx.solid(ctx.ink)}" opacity="0.32"`),
    );
  }

  return { defs, body: parts.join("") };
}

/* -------------------------------------------------------------------------- */
/*                                  构图七：编织                                 */
/* -------------------------------------------------------------------------- */

function sceneWeave(ctx: Ctx): Scene {
  const { W, H, M } = ctx;
  const defs: string[] = [];
  const parts: string[] = [];
  const colors = ctx.pal.colors;
  const bands = ctx.ri(5, 8);
  const cx = W / 2;
  const cy = H / 2;
  const vintage = ctx.style === "vintage";

  for (let i = 0; i < bands; i += 1) {
    const color = colors[i % 4];
    const bw = W * ctx.r(0.34, 0.86);
    const bh = M * ctx.r(0.1, 0.26);
    const x = W * ctx.r(-0.18, 0.52);
    const y = H * ctx.r(-0.22, 0.62);
    const angle = ctx.r(-38, 38);
    const attrs = vintage
      ? `fill="${ctx.solid(rgba(color, 0.5))}"`
      : ctx.style === "line"
        ? `fill="none" stroke="${ctx.ink}" stroke-width="${n(ctx.sw(3))}" opacity="0.55"`
        : `fill="${ctx.solid(color)}" stroke="${ctx.ink}" stroke-width="${n(ctx.sw(4.5))}"`;
    parts.push(`<g transform="rotate(${n(angle)} ${n(cx)} ${n(cy)})">${rect(x, y, bw, bh, attrs)}</g>`);
  }

  // 主圆
  const focalR = M * ctx.r(0.16, 0.22);
  const focalX = W * ctx.r(0.42, 0.58);
  const focalY = H * ctx.r(0.42, 0.52);
  parts.push(
    circle(
      focalX,
      focalY,
      focalR,
      `fill="${ctx.style === "line" ? "none" : ctx.pal.bg}" stroke="${ctx.ink}" stroke-width="${n(ctx.sw(8))}"`,
    ),
  );
  parts.push(
    circle(
      focalX,
      focalY,
      focalR * 0.55,
      `fill="${ctx.hatchFill(colors[ctx.ri(0, 3)])}" stroke="${ctx.ink}" stroke-width="${n(ctx.sw(4))}"`,
    ),
  );

  // 点阵条
  const rows = 3;
  const cols = Math.max(6, Math.round(W / (M * 0.06)));
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = M * 0.06 + col * M * 0.06;
      if (x > W - M * 0.06) continue;
      const y = H - M * (0.09 + (rows - 1 - row) * 0.035);
      parts.push(circle(x, y, M * 0.008, `fill="${ctx.solid(ctx.ink)}" opacity="0.4"`));
    }
  }

  return { defs, body: parts.join("") };
}

/* -------------------------------------------------------------------------- */
/*                                  构图八：等距                                 */
/* -------------------------------------------------------------------------- */

function isoCube(
  ctx: Ctx,
  x: number,
  topY: number,
  u: number,
  hu: number,
  base: string,
): string {
  const topColor = mix(base, ctx.pal.dark ? "#FFFCF5" : "#FFFFFF", 0.26);
  const leftColor = base;
  const rightColor = shade(base, ctx.pal.dark ? 0.16 : -0.24);
  const stroke = `stroke="${ctx.ink}" stroke-width="${n(ctx.sw(4))}" stroke-linejoin="round"`;
  const top = `<polygon points="${n(x)},${n(topY - u / 2)} ${n(x + u)},${n(topY)} ${n(x)},${n(topY + u / 2)} ${n(x - u)},${n(topY)}" fill="${topColor}" ${stroke}/>`;
  const left = `<polygon points="${n(x - u)},${n(topY)} ${n(x)},${n(topY + u / 2)} ${n(x)},${n(topY + u / 2 + hu)} ${n(x - u)},${n(topY + hu)}" fill="${leftColor}" ${stroke}/>`;
  const right = `<polygon points="${n(x + u)},${n(topY)} ${n(x)},${n(topY + u / 2)} ${n(x)},${n(topY + u / 2 + hu)} ${n(x + u)},${n(topY + hu)}" fill="${rightColor}" ${stroke}/>`;
  return `${left}${right}${top}`;
}

function sceneIso(ctx: Ctx): Scene {
  const { W, H, M } = ctx;
  const defs: string[] = [];
  const parts: string[] = [];
  const colors = ctx.pal.colors;
  const cols = W > H * 1.25 ? 6 : H > W * 1.25 ? 3 : 4;
  const rows = W > H * 1.25 ? 3 : H > W * 1.25 ? 5 : 4;
  const u = Math.min((W * 0.8) / (cols + rows - 2), H * 0.16) * ctx.r(0.94, 1.02);
  const hu = u * ctx.r(0.48, 0.6);
  const cx = W / 2;
  const cy = H * 0.62;

  // 背景太阳与点
  parts.push(
    circle(
      W * ctx.r(0.18, 0.82),
      H * ctx.r(0.16, 0.26),
      M * ctx.r(0.1, 0.16),
      `fill="${ctx.hatchFill(ctx.pick(colors))}" stroke="${ctx.ink}" stroke-width="${n(ctx.sw(6))}"`,
    ),
  );
  for (let i = 0; i < 10; i += 1) {
    parts.push(
      circle(ctx.r(0, W), ctx.r(0, H * 0.7), M * ctx.r(0.004, 0.008), `fill="${ctx.solid(ctx.ink)}" opacity="0.28"`),
    );
  }

  const cells: { i: number; j: number; h: number; order: number }[] = [];
  const gridCx = (cols - 1) / 2;
  const gridCy = (rows - 1) / 2;
  const maxDist = Math.max(1, Math.hypot(gridCx, gridCy));
  for (let i = 0; i < cols; i += 1) {
    for (let j = 0; j < rows; j += 1) {
      const dist = Math.hypot(i - gridCx, j - gridCy);
      const tall = 1 + Math.round((1 - dist / maxDist) * 2.6) + (ctx.chance(0.3) ? 1 : 0);
      cells.push({ i, j, h: Math.min(4, Math.max(1, tall)), order: i + j });
    }
  }
  cells.sort((a, b) => a.order - b.order || a.i - b.i);

  for (const cell of cells) {
    const baseColor = colors[(cell.i + cell.j + ctx.ri(0, 3)) % 4];
    const gx = cx + (cell.i - cell.j - (cols - rows) / 2) * u;
    const gy = cy + (cell.i + cell.j - (cols + rows - 2) / 2) * u * 0.5;
    for (let k = 0; k < cell.h; k += 1) {
      parts.push(isoCube(ctx, gx, gy - k * hu, u, hu, baseColor));
    }
  }

  return { defs, body: parts.join("") };
}

/* -------------------------------------------------------------------------- */
/*                                  构图九：像素                                 */
/* -------------------------------------------------------------------------- */

function pixelCircleCols(
  cols: number,
  rows: number,
  cx: number,
  cy: number,
  radius: number,
): { row: number; from: number; to: number }[] {
  const out: { row: number; from: number; to: number }[] = [];
  for (let row = Math.floor(cy - radius); row <= Math.ceil(cy + radius); row += 1) {
    if (row < 0 || row >= rows) continue;
    const dy = row + 0.5 - cy;
    const inner = radius * radius - dy * dy;
    if (inner <= 0) continue;
    const half = Math.sqrt(inner);
    const from = Math.max(0, Math.round(cx - half));
    const to = Math.min(cols - 1, Math.round(cx + half) - 1);
    if (to >= from) out.push({ row, from, to });
  }
  return out;
}

function scenePixel(ctx: Ctx): Scene {
  const { W, H, M } = ctx;
  const defs: string[] = [];
  const parts: string[] = [];
  const unit = M / 32;
  const cols = Math.max(16, Math.round(W / unit));
  const rows = Math.max(16, Math.round(H / unit));
  const colors = ctx.pal.colors;
  const dark = ctx.pal.dark;
  const groundRow = Math.round(rows * 0.78);

  // 天空分层
  const skyBands = 3;
  const skyHeight = groundRow * unit;
  const bandHeight = skyHeight / skyBands;
  for (let i = 0; i < skyBands; i += 1) {
    parts.push(
      rect(0, i * bandHeight, W, bandHeight + 1, `fill="${mix(ctx.pal.bg, colors[ctx.ri(0, 3)], 0.06 + i * 0.04)}"`),
    );
  }

  // 像素太阳
  const sunColor = ctx.pick(colors);
  const sunCols = pixelCircleCols(
    cols,
    rows,
    cols * ctx.r(0.48, 0.74),
    rows * ctx.r(0.2, 0.3),
    ctx.r(3.5, 6),
  );
  for (const row of sunCols) {
    parts.push(rect(row.from * unit, row.row * unit, (row.to - row.from + 1) * unit, unit, `fill="${sunColor}"`));
  }

  // 远山（两层，先画远山再画近山）
  for (let layer = 0; layer < 2; layer += 1) {
    const amplitude = ctx.r(0.07, 0.14);
    const base = groundRow * (0.5 + layer * 0.14);
    const phase = ctx.r(0, Math.PI * 2);
    const color = colors[(layer + ctx.ri(0, 3)) % 4];
    const heights: number[] = [];
    for (let col = 0; col < cols; col += 1) {
      const wave = Math.sin(phase + (col / cols) * Math.PI * 2 * ctx.r(1.4, 2.4));
      heights.push(Math.max(2, Math.round(base + wave * rows * amplitude)));
    }
    let col = 0;
    while (col < cols) {
      let end = col + 1;
      while (end < cols && heights[end] === heights[col]) end += 1;
      const top = heights[col];
      parts.push(
        rect(col * unit, top * unit, (end - col) * unit, (rows - top) * unit, `fill="${layer === 0 ? shade(color, dark ? -0.2 : 0.12) : color}"`),
      );
      col = end;
    }
  }

  // 前景地面
  parts.push(
    rect(0, groundRow * unit, W, (rows - groundRow) * unit, `fill="${dark ? mix(ctx.pal.bg, colors[0], 0.25) : shade(ctx.pal.bg, -0.18)}"`),
  );

  // 云与星星
  const clouds = ctx.ri(2, 4);
  for (let i = 0; i < clouds; i += 1) {
    const x = ctx.ri(1, Math.max(2, cols - 8));
    const y = ctx.ri(2, Math.max(3, Math.round(groundRow * 0.45)));
    const w = ctx.ri(3, 6);
    parts.push(rect(x * unit, y * unit, w * unit, unit, `fill="${dark ? "#FFFCF5" : "#FFFFFF"}" opacity="0.75"`));
    parts.push(rect((x + 1) * unit, (y - 1) * unit, (w - 2) * unit, unit, `fill="${dark ? "#FFFCF5" : "#FFFFFF"}" opacity="0.75"`));
  }
  for (let i = 0; i < 14; i += 1) {
    parts.push(
      rect(ctx.ri(0, cols - 1) * unit, ctx.ri(0, Math.round(groundRow * 0.5)) * unit, unit, unit, `fill="${dark ? "#FFFCF5" : "#14110F"}" opacity="0.4"`),
    );
  }

  // 地面上的像素花草 / 小方块
  for (let i = 0; i < ctx.ri(3, 7); i += 1) {
    const x = ctx.ri(1, cols - 2);
    const h = ctx.ri(1, 2);
    parts.push(
      rect(x * unit, (groundRow - h) * unit, unit, h * unit, `fill="${ctx.pick(colors)}"`),
    );
  }

  return { defs, body: parts.join("") };
}

/* -------------------------------------------------------------------------- */
/*                                  叠加效果                                    */
/* -------------------------------------------------------------------------- */

function vintageOverlay(ctx: Ctx): Scene {
  const { W, H, M } = ctx;
  const defs = [
    `<pattern id="${ctx.idp}_dots" width="${n(M * 0.016)}" height="${n(M * 0.016)}" patternUnits="userSpaceOnUse"><circle cx="${n(M * 0.008)}" cy="${n(M * 0.008)}" r="${n(M * 0.0032)}" fill="#14110F"/></pattern>`,
    `<filter id="${ctx.idp}_grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.22"/></feComponentTransfer></filter>`,
  ];
  const inset = M * 0.028;
  const body = [
    rect(0, 0, W, H, `fill="url(#${ctx.idp}_dots)" opacity="0.18" style="mix-blend-mode:multiply"`),
    rect(0, 0, W, H, `fill="#F2D6AE" opacity="0.16" style="mix-blend-mode:multiply"`),
    rect(0, 0, W, H, `fill="#FFFFFF" filter="url(#${ctx.idp}_grain)" opacity="0.14" style="mix-blend-mode:multiply"`),
    rect(inset, inset, W - inset * 2, H - inset * 2, `fill="none" stroke="#14110F" stroke-width="${n(M * 0.005)}" opacity="0.85"`),
  ].join("");
  return { defs, body };
}

function lineOverlay(ctx: Ctx): Scene {
  const { W, H, M } = ctx;
  const inset = M * 0.032;
  const tick = M * 0.018;
  const body = [
    rect(inset, inset, W - inset * 2, H - inset * 2, `fill="none" stroke="${ctx.ink}" stroke-width="${n(M * 0.0045)}"`),
    `<g stroke="${ctx.ink}" stroke-width="${n(M * 0.004)}"><line x1="${n(W / 2 - tick)}" y1="${n(inset)}" x2="${n(W / 2 + tick)}" y2="${n(inset)}"/><line x1="${n(W / 2 - tick)}" y1="${n(H - inset)}" x2="${n(W / 2 + tick)}" y2="${n(H - inset)}"/><line x1="${n(inset)}" y1="${n(H / 2 - tick)}" x2="${n(inset)}" y2="${n(H / 2 + tick)}"/><line x1="${n(W - inset)}" y1="${n(H / 2 - tick)}" x2="${n(W - inset)}" y2="${n(H / 2 + tick)}"/></g>`,
  ].join("");
  return { defs: [], body };
}

function pixelOverlay(ctx: Ctx): Scene {
  const { W, H, M } = ctx;
  const defs = [
    `<pattern id="${ctx.idp}_grid" width="${n(M / 32)}" height="${n(M / 32)}" patternUnits="userSpaceOnUse"><path d="M ${n(M / 32)} 0 L 0 0 0 ${n(M / 32)}" fill="none" stroke="${ctx.ink}" stroke-width="1"/></pattern>`,
  ];
  return { defs, body: rect(0, 0, W, H, `fill="url(#${ctx.idp}_grid)" opacity="0.05"`) };
}

/** 左下角的三个小方块签名，呼应「块集」的品牌图形 */
function signature(ctx: Ctx): string {
  const size = ctx.M * 0.02;
  const gap = size * 0.45;
  const x = ctx.M * 0.055;
  const y = ctx.H - ctx.M * 0.055 - size;
  const colors = ctx.pal.colors;
  const marks: string[] = [];
  for (let i = 0; i < 3; i += 1) {
    const color = colors[(i + 1) % 4];
    marks.push(
      rect(
        x + i * (size + gap),
        y,
        size,
        size,
        `rx="${n(size * 0.18)}" fill="${ctx.style === "line" ? ctx.hatchFill(color) : color}" stroke="${ctx.ink}" stroke-width="${n(ctx.sw(2.6))}"`,
      ),
    );
  }
  return marks.join("");
}

/* -------------------------------------------------------------------------- */
/*                                  对外入口                                    */
/* -------------------------------------------------------------------------- */

export type ProceduralSvgOptions = {
  prompt: string;
  style: DrawingStyleKey;
  size: DrawingSizeKey;
  /** 可选：换一个种子重新生成同一提示词的另一种构图 */
  seed?: string;
};

const SCENE_POOL: Record<Exclude<DrawingStyleKey, "isometric" | "pixel">, readonly ((ctx: Ctx) => Scene)[]> = {
  flat: [sceneBlocks, sceneBlocks, sceneOrbit, sceneRidges, sceneBauhaus, sceneArches, sceneConfetti, sceneWeave],
  vintage: [sceneBauhaus, sceneWeave, sceneRidges, sceneOrbit, sceneBlocks],
  line: [sceneOrbit, sceneArches, sceneRidges, sceneBauhaus, sceneConfetti],
};

/**
 * 根据提示词生成一张程序化几何 SVG（字符串）。
 * 同样的入参永远得到同一张图，因此画廊缩略图与真实生成结果保持一致。
 */
export function buildProceduralSvg(options: ProceduralSvgOptions): string {
  const prompt = options.prompt.trim() || "无题";
  const styleMeta = getDrawingStyle(options.style);
  const sizeMeta = getDrawingSize(options.size);
  const W = sizeMeta.width;
  const H = sizeMeta.height;
  const seedKey = `${prompt}::${options.style}::${options.size}::${options.seed ?? "0"}`;
  const seed = hashString(seedKey);
  const rnd = mulberry32(seed);
  const idp = `b${seed.toString(36)}`;
  const ctx = createCtx(W, H, options.style, rnd, idp);

  let scene: Scene;
  if (options.style === "isometric") {
    scene = sceneIso(ctx);
  } else if (options.style === "pixel") {
    scene = scenePixel(ctx);
  } else {
    const pool = SCENE_POOL[options.style];
    scene = pool[Math.floor(rnd() * pool.length)](ctx);
  }

  let overlay: Scene = { defs: [], body: "" };
  if (options.style === "vintage") overlay = vintageOverlay(ctx);
  else if (options.style === "line") overlay = lineOverlay(ctx);
  else if (options.style === "pixel") overlay = pixelOverlay(ctx);

  const hatchDefs =
    options.style === "line"
      ? [
          `<pattern id="${idp}_hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(38)"><line x1="0" y1="0" x2="0" y2="12" stroke="${ctx.ink}" stroke-width="3"/></pattern>`,
        ]
      : [];

  const title = `块集画图 · ${styleMeta.label} · ${prompt.slice(0, 48)}`;
  const defs = [...hatchDefs, ...scene.defs, ...overlay.defs].join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(title)}"${options.style === "pixel" ? ' shape-rendering="crispEdges"' : ""}>`,
    `<title>${esc(title)}</title>`,
    defs ? `<defs>${defs}</defs>` : "",
    `<rect width="${W}" height="${H}" fill="${ctx.pal.bg}"/>`,
    scene.body,
    overlay.body,
    signature(ctx),
    `</svg>`,
  ].join("");
}

/** 生成用于 &lt;img src&gt; 的内联 data URL（不依赖 Buffer，浏览器可用） */
export function svgToInlineDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
