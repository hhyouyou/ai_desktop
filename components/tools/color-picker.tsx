"use client";

import { useEffect, useMemo, useState } from "react";
import {
  clamp,
  contrastLevels,
  contrastRatio,
  generatePalette,
  hslString,
  hslToRgb,
  parseHex,
  readableTextColor,
  rgbString,
  rgbToHex,
  rgbToHsl,
  shadesOf,
  type RGB,
} from "@/lib/tools/color";
import { CopyButton, Field, Notice, Panel } from "./ui";

function channelValue(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(clamp(parsed, 0, 255));
}

function ratioBadge(ok: boolean, label: string) {
  return (
    <span
      className={
        ok
          ? "rounded-full edge-2 bg-mint px-2 py-0.5 text-[10.5px] font-extrabold"
          : "rounded-full edge-sub bg-cream px-2 py-0.5 text-[10.5px] font-extrabold text-ink-soft"
      }
    >
      {label} {ok ? "通过" : "未通过"}
    </span>
  );
}

export default function ColorPickerTool() {
  const [rgb, setRgb] = useState<RGB>({ r: 255, g: 90, b: 54 });
  const [hexDraft, setHexDraft] = useState("#FF5A36");
  const [hexError, setHexError] = useState<string | null>(null);
  const [palette, setPalette] = useState<RGB[]>([]);
  const [textColor, setTextColor] = useState("#14110F");
  const [backgroundColor, setBackgroundColor] = useState("#FFFCF5");

  const hex = rgbToHex(rgb);
  const hsl = rgbToHsl(rgb);

  useEffect(() => {
    setHexDraft(hex);
  }, [hex]);

  useEffect(() => {
    setPalette(generatePalette(5));
  }, []);

  const shades = useMemo(() => shadesOf(hsl, 6), [hsl]);

  const textRgb = parseHex(textColor) ?? { r: 20, g: 17, b: 15 };
  const backgroundRgb = parseHex(backgroundColor) ?? { r: 255, g: 252, b: 245 };
  const ratio = contrastRatio(textRgb, backgroundRgb);
  const levels = contrastLevels(ratio);

  const applyHex = (value: string) => {
    setHexDraft(value);
    const parsed = parseHex(value);
    if (parsed) {
      setRgb(parsed);
      setHexError(null);
    } else {
      setHexError("HEX 格式不正确，支持 #RGB 或 #RRGGBB");
    }
  };

  const setRgbChannel = (key: keyof RGB, value: string) => {
    setRgb((prev) => ({ ...prev, [key]: channelValue(value) }));
  };

  const setHslChannel = (key: "h" | "s" | "l", value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    const next = {
      h: key === "h" ? ((Math.round(parsed) % 360) + 360) % 360 : hsl.h,
      s: key === "s" ? clamp(parsed, 0, 100) : hsl.s,
      l: key === "l" ? clamp(parsed, 0, 100) : hsl.l,
    };
    setRgb(hslToRgb(next));
  };

  const allFormats = [hex, rgbString(rgb), hslString(hsl)].join("\n");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Panel title="选色" desc="用取色器或直接输入 HEX / RGB / HSL，三种格式实时同步。">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative">
              <label className="label" htmlFor="color-native">
                取色器
              </label>
              <input
                id="color-native"
                type="color"
                value={hex}
                onChange={(event) => applyHex(event.target.value)}
                className="h-[72px] w-[92px] cursor-pointer rounded-[16px] edge bg-paper p-1.5 shadow-hard-sm"
                aria-label="打开取色器选择颜色"
              />
            </div>
            <div className="min-w-[180px] flex-1">
              <Field label="HEX" htmlFor="color-hex">
                <input
                  id="color-hex"
                  className="field font-[family-name:var(--font-mono)] uppercase"
                  value={hexDraft}
                  onChange={(event) => applyHex(event.target.value)}
                  spellCheck={false}
                />
              </Field>
              {hexError ? (
                <p className="mt-1 text-[11.5px] font-bold text-coral">{hexError}</p>
              ) : (
                <p className="mt-1 text-[11.5px] text-ink-soft">支持 #RGB / #RRGGBB</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <p className="label">RGB</p>
            <div className="grid grid-cols-3 gap-2">
              {(["r", "g", "b"] as const).map((key) => (
                <div key={key}>
                  <label className="sr-only" htmlFor={`color-${key}`}>
                    RGB 的 {key.toUpperCase()} 通道
                  </label>
                  <input
                    id={`color-${key}`}
                    type="number"
                    min={0}
                    max={255}
                    className="field field-sm font-[family-name:var(--font-mono)]"
                    value={rgb[key]}
                    onChange={(event) => setRgbChannel(key, event.target.value)}
                    aria-label={`RGB ${key.toUpperCase()} 通道`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <p className="label">HSL</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="sr-only" htmlFor="color-h">
                  色相 H
                </label>
                <input
                  id="color-h"
                  type="number"
                  min={0}
                  max={360}
                  className="field field-sm font-[family-name:var(--font-mono)]"
                  value={hsl.h}
                  onChange={(event) => setHslChannel("h", event.target.value)}
                  aria-label="色相 H（0-360）"
                />
              </div>
              <div>
                <label className="sr-only" htmlFor="color-s">
                  饱和度 S
                </label>
                <input
                  id="color-s"
                  type="number"
                  min={0}
                  max={100}
                  className="field field-sm font-[family-name:var(--font-mono)]"
                  value={hsl.s}
                  onChange={(event) => setHslChannel("s", event.target.value)}
                  aria-label="饱和度 S（0-100%）"
                />
              </div>
              <div>
                <label className="sr-only" htmlFor="color-l">
                  亮度 L
                </label>
                <input
                  id="color-l"
                  type="number"
                  min={0}
                  max={100}
                  className="field field-sm font-[family-name:var(--font-mono)]"
                  value={hsl.l}
                  onChange={(event) => setHslChannel("l", event.target.value)}
                  aria-label="亮度 L（0-100%）"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {[
              { label: "HEX", value: hex },
              { label: "RGB", value: rgbString(rgb) },
              { label: "HSL", value: hslString(hsl) },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 rounded-[12px] edge-sub bg-cream/60 px-2.5 py-1.5"
              >
                <span className="w-9 shrink-0 text-[11px] font-extrabold text-ink-soft">{item.label}</span>
                <span className="min-w-0 flex-1 break-all font-[family-name:var(--font-mono)] text-[12.5px] font-bold">
                  {item.value}
                </span>
                <CopyButton text={item.value} label="复制" ariaLabel={`复制 ${item.label} 值`} className="shrink-0" />
              </div>
            ))}
          </div>

          <div className="mt-3">
            <CopyButton text={allFormats} label="复制全部格式" ariaLabel="复制 HEX RGB HSL 三种格式" />
          </div>
        </Panel>

        <Panel title="同色系深浅" desc="保持色相不变，改变亮度获得一组可用色阶。">
          <div className="grid grid-cols-6 gap-1.5">
            {shades.map((shade, index) => {
              const shadeRgb = hslToRgb(shade);
              const shadeHex = rgbToHex(shadeRgb);
              const text = readableTextColor(shadeRgb);
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setRgb(shadeRgb)}
                  className="flex h-16 flex-col items-center justify-end rounded-[10px] edge-2 p-1 text-[9.5px] font-extrabold"
                  style={{ backgroundColor: shadeHex, color: text }}
                  aria-label={`使用颜色 ${shadeHex}`}
                >
                  {index === 0 || index === shades.length - 1 || index === 3 ? shadeHex : ""}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11.5px] text-ink-soft">点击色块即可把该颜色设为主色。</p>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel
          title="配色灵感"
          desc="按色相关系随机生成一组协调配色。"
          actions={
            <button type="button" className="btn btn-sm btn-sun" onClick={() => setPalette(generatePalette(5))}>
              换一组
            </button>
          }
        >
          <div className="grid grid-cols-5 gap-1.5">
            {palette.map((color, index) => {
              const colorHex = rgbToHex(color);
              const text = readableTextColor(color);
              return (
                <div key={`${colorHex}-${index}`} className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setRgb(color)}
                    className="flex h-20 w-full items-end justify-center rounded-[10px] edge-2 pb-1 text-[9px] font-extrabold"
                    style={{ backgroundColor: colorHex, color: text }}
                    aria-label={`使用配色 ${colorHex}`}
                  >
                    {index + 1}
                  </button>
                  <CopyButton text={colorHex} label="复制" ariaLabel={`复制配色 ${colorHex}`} className="px-1.5 text-[9.5px]" />
                </div>
              );
            })}
          </div>
          {palette.length === 0 ? (
            <p className="mt-2 text-[12px] text-ink-soft">正在生成配色…</p>
          ) : null}
        </Panel>

        <Panel title="对比度检查" desc="按 WCAG 标准计算文字与背景的对比度。">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="contrast-text">
                文字颜色
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="contrast-text"
                  type="color"
                  value={textColor}
                  onChange={(event) => setTextColor(event.target.value)}
                  className="h-10 w-12 cursor-pointer rounded-[10px] edge-2 bg-paper p-1"
                  aria-label="选择文字颜色"
                />
                <span className="font-[family-name:var(--font-mono)] text-[11.5px] font-bold">{textColor.toUpperCase()}</span>
              </div>
              <button
                type="button"
                className="btn btn-sm mt-2 w-full"
                onClick={() => setTextColor(hex)}
                aria-label="把主色设为文字颜色"
              >
                用主色
              </button>
            </div>
            <div>
              <label className="label" htmlFor="contrast-bg">
                背景颜色
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="contrast-bg"
                  type="color"
                  value={backgroundColor}
                  onChange={(event) => setBackgroundColor(event.target.value)}
                  className="h-10 w-12 cursor-pointer rounded-[10px] edge-2 bg-paper p-1"
                  aria-label="选择背景颜色"
                />
                <span className="font-[family-name:var(--font-mono)] text-[11.5px] font-bold">
                  {backgroundColor.toUpperCase()}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-sm mt-2 w-full"
                onClick={() => setBackgroundColor(hex)}
                aria-label="把主色设为背景颜色"
              >
                用主色
              </button>
            </div>
          </div>

          <div
            className="mt-3 rounded-[16px] edge px-3 py-4"
            style={{ backgroundColor: rgbToHex(backgroundRgb), color: rgbToHex(textRgb) }}
          >
            <p className="text-[16px] font-extrabold">普通正文示例：把重复的小事做成工具。</p>
            <p className="mt-1 text-[24px] font-extrabold leading-tight">大字标题示例</p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full edge-2 bg-ink px-2.5 py-1 font-[family-name:var(--font-mono)] text-[13px] font-extrabold text-paper">
              {ratio.toFixed(2)} : 1
            </span>
            {ratioBadge(levels.aa, "正文 AA")}
            {ratioBadge(levels.aaa, "正文 AAA")}
            {ratioBadge(levels.aaLarge, "大字 AA")}
            {ratioBadge(levels.aaaLarge, "大字 AAA")}
          </div>

          {!levels.aa ? (
            <Notice tone="warn" className="mt-3">
              正文对比度未达到 4.5:1，长时间阅读会吃力；建议加深文字色或提亮背景。
            </Notice>
          ) : (
            <Notice tone="success" className="mt-3">
              正文对比度达到 WCAG AA 标准，可以直接用于长文阅读。
            </Notice>
          )}
        </Panel>
      </div>
    </div>
  );
}
