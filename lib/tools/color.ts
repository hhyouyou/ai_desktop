/** 颜色转换与 WCAG 对比度计算（HEX / RGB / HSL / HSV）。 */

export type RGB = { r: number; g: number; b: number };
export type HSL = { h: number; s: number; l: number };
export type HSV = { h: number; s: number; v: number };

export function clampChannel(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 支持 #abc / #aabbcc / abc / aabbcc */
export function parseHex(input: string): RGB | null {
  const raw = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return {
      r: parseInt(raw[0] + raw[0], 16),
      g: parseInt(raw[1] + raw[1], 16),
      b: parseInt(raw[2] + raw[2], 16),
    };
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16),
    };
  }
  return null;
}

export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => clampChannel(n).toString(16).padStart(2, "0");
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
}

export function rgbString(rgb: RGB): string {
  return `rgb(${clampChannel(rgb.r)}, ${clampChannel(rgb.g)}, ${clampChannel(rgb.b)})`;
}

export function rgbToHsl(rgb: RGB): HSL {
  const r = clampChannel(rgb.r) / 255;
  const g = clampChannel(rgb.g) / 255;
  const b = clampChannel(rgb.b) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToRgb(hsl: HSL): RGB {
  const h = ((hsl.h % 360) + 360) % 360;
  const s = clamp(hsl.s, 0, 100) / 100;
  const l = clamp(hsl.l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (h < 60) [rp, gp, bp] = [c, x, 0];
  else if (h < 120) [rp, gp, bp] = [x, c, 0];
  else if (h < 180) [rp, gp, bp] = [0, c, x];
  else if (h < 240) [rp, gp, bp] = [0, x, c];
  else if (h < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];

  return {
    r: clampChannel((rp + m) * 255),
    g: clampChannel((gp + m) * 255),
    b: clampChannel((bp + m) * 255),
  };
}

export function hslString(hsl: HSL): string {
  return `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`;
}

export function rgbToHsv(rgb: RGB): HSV {
  const r = clampChannel(rgb.r) / 255;
  const g = clampChannel(rgb.g) / 255;
  const b = clampChannel(rgb.b) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;

  return { h, s: Math.round((max === 0 ? 0 : delta / max) * 100), v: Math.round(max * 100) };
}

export function parseRgbInput(input: string): RGB | null {
  const match = input.match(/rgba?\s*\(\s*(\d{1,3})\s*[,，\s]\s*(\d{1,3})\s*[,，\s]\s*(\d{1,3})/i);
  const values = match
    ? [Number(match[1]), Number(match[2]), Number(match[3])]
    : input
        .trim()
        .split(/[,，\s]+/)
        .map((part) => Number(part));
  if (values.length < 3 || values.some((v) => !Number.isFinite(v) || v < 0 || v > 255)) return null;
  return { r: Math.round(values[0]), g: Math.round(values[1]), b: Math.round(values[2]) };
}

export function parseHslInput(input: string): HSL | null {
  const match = input.match(
    /(?:hsla?\s*\(\s*)?(\d{1,3}(?:\.\d+)?)\s*(?:deg)?\s*[,，\s]\s*(\d{1,3}(?:\.\d+)?)\s*%\s*[,，\s]\s*(\d{1,3}(?:\.\d+)?)\s*%/i,
  );
  if (!match) return null;
  const h = Number(match[1]);
  const s = Number(match[2]);
  const l = Number(match[3]);
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return null;
  return { h: ((h % 360) + 360) % 360, s: clamp(s, 0, 100), l: clamp(l, 0, 100) };
}

/** WCAG 相对亮度 */
export function relativeLuminance(rgb: RGB): number {
  const channel = (value: number) => {
    const c = clampChannel(value) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

export function contrastRatio(a: RGB, b: RGB): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

export type ContrastLevels = {
  aa: boolean;
  aaa: boolean;
  aaLarge: boolean;
  aaaLarge: boolean;
};

export function contrastLevels(ratio: number): ContrastLevels {
  return {
    aa: ratio >= 4.5,
    aaa: ratio >= 7,
    aaLarge: ratio >= 3,
    aaaLarge: ratio >= 4.5,
  };
}

/** 给定背景色，返回可读性更好的文字色 */
export function readableTextColor(background: RGB): "#14110F" | "#FFFFFF" {
  return contrastRatio(background, { r: 20, g: 17, b: 15 }) >= contrastRatio(background, { r: 255, g: 255, b: 255 })
    ? "#14110F"
    : "#FFFFFF";
}

/** 生成一组视觉上协调的随机配色（互补 / 类似 / 三角） */
export function generatePalette(count = 5): RGB[] {
  const baseHue = Math.round(Math.random() * 360);
  const schemes = [
    [0, 28, 180, 208, 330],
    [0, 45, 90, 180, 270],
    [0, 24, 48, 168, 192],
    [0, 60, 150, 240, 300],
    [0, 36, 72, 144, 216],
  ];
  const offsets = schemes[Math.floor(Math.random() * schemes.length)];
  const colors: RGB[] = [];
  for (let i = 0; i < count; i += 1) {
    const hue = (baseHue + offsets[i % offsets.length] + (i > offsets.length ? 12 * i : 0)) % 360;
    colors.push(
      hslToRgb({
        h: hue,
        s: 58 + Math.round(Math.random() * 26),
        l: 42 + Math.round(Math.random() * 24),
      }),
    );
  }
  return colors;
}

/** 生成同色系的深/浅变体 */
export function shadesOf(hsl: HSL, count = 5): HSL[] {
  const list: HSL[] = [];
  for (let i = 0; i < count; i += 1) {
    const l = 16 + (i * 68) / (count - 1);
    list.push({ h: hsl.h, s: hsl.s, l: Math.round(l) });
  }
  return list;
}
