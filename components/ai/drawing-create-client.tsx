"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { saveDrawing } from "@/lib/ai/client-api";
import { GALLERY_ITEMS } from "@/lib/ai/gallery";
import { aiHeaders, DEFAULT_AI_SETTINGS, loadAiSettings } from "@/lib/ai/settings";
import {
  DRAWING_SIZES,
  DRAWING_STYLES,
  buildProceduralSvg,
  getDrawingSize,
  getDrawingStyle,
  svgToInlineDataUrl,
  type DrawingSizeKey,
  type DrawingStyleKey,
} from "@/lib/ai/svg";
import type { AiSettings } from "@/lib/ai/types";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";
import { DemoBadge, DemoNotice } from "./demo-badge";

type ImageResult = {
  image: string;
  mime: string;
  model: string;
  id: string;
  demo: boolean;
  size: DrawingSizeKey;
  style: DrawingStyleKey;
  createdAt: number;
};

type Props = {
  initialPrompt: string;
  initialStyle: DrawingStyleKey;
  initialSize: DrawingSizeKey;
  demo: boolean;
  imageModel: string;
};

export function DrawingCreateClient({
  initialPrompt,
  initialStyle,
  initialSize,
  demo,
  imageModel,
}: Props) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [size, setSize] = useState<DrawingSizeKey>(initialSize);
  const [style, setStyle] = useState<DrawingStyleKey>(initialStyle);
  const [result, setResult] = useState<ImageResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(demo);
  const [activeModel, setActiveModel] = useState(imageModel);
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const requestRef = useRef(0);

  useEffect(() => {
    setSettings(loadAiSettings());
  }, []);

  const sizeMeta = getDrawingSize(size);
  const styleMeta = getDrawingStyle(style);

  const samplePreview = useMemo(() => {
    const svg = buildProceduralSvg({
      prompt: prompt.trim() || "块集几何海报",
      style,
      size,
    });
    return svgToInlineDataUrl(svg);
  }, [prompt, style, size]);

  const generate = async (): Promise<void> => {
    const clean = prompt.trim();
    if (!clean) {
      setError("请先写一句提示词");
      return;
    }
    if (generating) return;
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setGenerating(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...aiHeaders(settings) },
        body: JSON.stringify({
          prompt: clean,
          size,
          style,
          seed: Date.now().toString(36),
        }),
      });
      const payload = (await response.json()) as
        | (Omit<ImageResult, "createdAt"> & { ok: true; error?: undefined })
        | { ok: false; error?: string };
      if (requestRef.current !== requestId) return;
      if (!response.ok || !payload.ok) {
        throw new Error(
          "error" in payload && payload.error ? payload.error : `生成失败（HTTP ${response.status}）`,
        );
      }
      setResult({
        image: payload.image,
        mime: payload.mime,
        model: payload.model,
        id: payload.id,
        demo: payload.demo,
        size: payload.size,
        style: payload.style,
        createdAt: Date.now(),
      });
      setIsDemo(payload.demo);
      setActiveModel(payload.model);
    } catch (err) {
      if (requestRef.current !== requestId) return;
      setError(err instanceof Error ? err.message : "生成失败，请稍后重试");
    } finally {
      if (requestRef.current === requestId) setGenerating(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!result || saving || saved) return;
    setSaving(true);
    setError(null);
    try {
      await saveDrawing(result.id);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = (): void => {
    if (!result) return;
    const isSvg = result.mime === "image/svg+xml";
    const filename = `blockset-${result.id}.${isSvg ? "svg" : "png"}`;
    if (!result.image.startsWith("data:")) {
      window.open(result.image, "_blank", "noopener,noreferrer");
      return;
    }
    const anchor = document.createElement("a");
    anchor.href = result.image;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const fillRandomIdea = (): void => {
    const item = GALLERY_ITEMS[Math.floor(Math.random() * GALLERY_ITEMS.length)];
    setPrompt(item.prompt);
    setStyle(item.style);
    setSize(item.size);
    setError(null);
  };

  const frameWidth =
    size === "16:9" ? "max-w-[760px]" : size === "9:16" ? "max-w-[340px]" : "max-w-[540px]";

  return (
    <section className="shell py-5">
      <DemoNotice demo={isDemo} model={activeModel} />

      <div className="mt-4 grid gap-4 lg:grid-cols-[356px_minmax(0,1fr)] lg:items-start">
        {/* -------------------------------- 参数面板 -------------------------------- */}
        <div className="space-y-4">
          <div className="rounded-[24px] edge bg-paper p-4 shadow-hard">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold">描述你想要的画面</h2>
              <button
                type="button"
                onClick={fillRandomIdea}
                className="btn btn-sm px-2.5 py-1 text-[11px]"
              >
                <Icon name="spark" size={11} />
                随机灵感
              </button>
            </div>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={5}
              maxLength={500}
              placeholder="例如：黄昏的城市天际线，几何色块，粗描边，安静的海报感"
              aria-label="画面提示词"
              className="field mt-3 resize-y text-[13.5px] leading-relaxed"
            />
            <div className="mt-1 flex items-center justify-between text-[10.5px] text-ink-soft">
              <span>越具体越好：主体 + 场景 + 颜色 + 氛围</span>
              <span className={prompt.length > 450 ? "font-extrabold text-coral" : ""}>
                {prompt.length} / 500
              </span>
            </div>
          </div>

          <div className="rounded-[24px] edge bg-paper p-4 shadow-hard">
            <span className="label">画幅比例</span>
            <div className="grid grid-cols-3 gap-2">
              {DRAWING_SIZES.map((item) => {
                const active = item.key === size;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSize(item.key)}
                    aria-pressed={active}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-[14px] edge px-2 py-2.5 transition-colors",
                      active
                        ? "border-ink bg-sun shadow-[2px_2px_0_0_#14110F]"
                        : "border-ink/20 bg-paper hover:border-ink",
                    )}
                  >
                    <span
                      className={cn(
                        "block rounded-[3px] edge-2 bg-paper",
                        item.key === "1:1" && "h-6 w-6",
                        item.key === "16:9" && "h-[18px] w-8",
                        item.key === "9:16" && "h-8 w-[18px]",
                      )}
                    />
                    <span className="text-[11.5px] font-extrabold">{item.label}</span>
                    <span className="text-[9.5px] text-ink-soft">{item.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[24px] edge bg-paper p-4 shadow-hard">
            <span className="label">画面风格</span>
            <div className="grid grid-cols-2 gap-2">
              {DRAWING_STYLES.map((item) => {
                const active = item.key === style;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setStyle(item.key)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-[14px] edge px-2.5 py-2 text-left transition-colors",
                      active
                        ? "border-ink bg-ink text-paper shadow-hard-sm"
                        : "border-ink/20 bg-paper hover:border-ink",
                    )}
                  >
                    <span className="block text-[12px] font-extrabold">{item.label}</span>
                    <span
                      className={cn(
                        "mt-0.5 block text-[9.5px] leading-snug",
                        active ? "text-paper/65" : "text-ink-soft",
                      )}
                    >
                      {item.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void generate()}
            disabled={generating || !prompt.trim()}
            className="btn btn-primary btn-lg w-full"
          >
            {generating ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                正在生成
              </>
            ) : (
              <>
                <Icon name="brush" size={18} />
                {result ? "再生成一张" : "生成图片"}
              </>
            )}
          </button>
          <p className="px-1 text-center text-[11px] leading-snug text-ink-soft">
            {isDemo
              ? "演示模式：使用站内程序化几何引擎即时出图，不消耗额度。"
              : `将请求 ${activeModel} 生成图片，通常需要 5–20 秒。`}
          </p>
        </div>

        {/* --------------------------------- 预览区 --------------------------------- */}
        <div className="flex min-h-[520px] flex-col rounded-[24px] edge bg-paper shadow-hard">
          <div className="flex flex-wrap items-center gap-2 edge-b bg-cream px-4 py-2.5">
            <div className="min-w-0">
              <p className="text-[14px] font-extrabold">{result ? "生成结果" : "预览"}</p>
              <p className="text-[10.5px] text-ink-soft">
                {styleMeta.label} · {sizeMeta.label}（{sizeMeta.width}×{sizeMeta.height}）
              </p>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <DemoBadge demo={isDemo} model={activeModel} />
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-3 py-4 sm:px-5">
            {error ? (
              <div
                role="alert"
                className="flex w-full items-start justify-between gap-2 rounded-[12px] border-2 border-coral bg-coral/10 px-3 py-2 text-[12px] font-bold text-coral"
              >
                <span className="leading-snug">{error}</span>
                <button type="button" onClick={() => setError(null)} aria-label="关闭错误提示">
                  <Icon name="close" size={13} />
                </button>
              </div>
            ) : null}

            {generating ? (
              <div className={cn("mx-auto w-full", frameWidth)}>
                <div
                  className="relative flex w-full items-center justify-center overflow-hidden rounded-[22px] edge bg-cream shadow-hard"
                  style={{ aspectRatio: `${sizeMeta.width} / ${sizeMeta.height}` }}
                >
                  <div className="grid-bg absolute inset-0 opacity-60" />
                  <div className="relative flex flex-col items-center gap-2.5">
                    <span className="inline-block h-9 w-9 animate-spin rounded-full edge/20 border-t-ink" />
                    <p className="text-[12.5px] font-extrabold">正在生成 {styleMeta.label}</p>
                    <p className="text-[11px] text-ink-soft">尺寸 {sizeMeta.width}×{sizeMeta.height}</p>
                  </div>
                </div>
              </div>
            ) : result ? (
              <>
                <div className={cn("mx-auto w-full", frameWidth)}>
                  <div
                    className="relative w-full overflow-hidden rounded-[22px] edge bg-cream shadow-hard"
                    style={{ aspectRatio: `${sizeMeta.width} / ${sizeMeta.height}` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={result.image}
                      alt={prompt || "AI 生成的图片"}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute left-2.5 top-2.5">
                      <DemoBadge demo={result.demo} model={result.model} />
                    </span>
                    <span className="absolute right-2.5 top-2.5 tag tag-ink px-2 py-0.5 text-[9.5px]">
                      AI 生成
                    </span>
                  </div>
                </div>

                <div className="flex w-full max-w-[760px] flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving || saved}
                    className={cn("btn btn-sm", saved ? "bg-mint" : "btn-primary")}
                  >
                    <Icon name={saved ? "check" : "heart"} size={13} />
                    {saving ? "保存中…" : saved ? "已保存到我的创作" : "保存到我的创作"}
                  </button>
                  <CopyButton text={prompt} label="复制提示词" className="!px-2.5 !py-1 !text-[11px]" />
                  <button type="button" onClick={handleDownload} className="btn btn-sm !px-2.5 !py-1 !text-[11px]">
                    <Icon name="download" size={12} />
                    下载
                  </button>
                  <button
                    type="button"
                    onClick={() => void generate()}
                    className="btn btn-sm !px-2.5 !py-1 !text-[11px]"
                  >
                    <Icon name="spark" size={12} />
                    换一张
                  </button>
                  {saved ? (
                    <Link
                      href="/drawing/creations"
                      className="btn btn-sm !px-2.5 !py-1 !text-[11px] btn-sun"
                    >
                      查看我的创作
                      <Icon name="arrow" size={12} />
                    </Link>
                  ) : null}
                </div>
                <p className="max-w-[620px] text-center text-[10.5px] leading-snug text-ink-soft">
                  {result.model === "blockset-geometric-v1"
                    ? "这张图由站内程序化几何引擎生成：配色与构图由提示词哈希决定，同样的提示词会得到同一张图。"
                    : `模型：${result.model}`}
                  {result.demo ? " 配置 API Key 后可切换到真实图片模型。" : ""}
                </p>
              </>
            ) : (
              <>
                <div className={cn("mx-auto w-full", frameWidth)}>
                  <div
                    className="relative w-full overflow-hidden rounded-[22px] edge bg-cream shadow-hard"
                    style={{ aspectRatio: `${sizeMeta.width} / ${sizeMeta.height}` }}
                  >
                    {isDemo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={samplePreview}
                        alt="程序化几何预览"
                        className="h-full w-full object-cover opacity-95"
                      />
                    ) : (
                      <div className="dot-bg flex h-full w-full items-center justify-center">
                        <span className="flex h-14 w-14 items-center justify-center rounded-[18px] edge bg-paper shadow-hard-sm">
                          <Icon name="image" size={24} />
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-ink/80 px-3 py-2 text-paper backdrop-blur-sm">
                      <span className="text-[11px] font-extrabold">
                        {isDemo ? "构图预览 · 随提示词与风格实时变化" : "生成后会显示在这里"}
                      </span>
                      <span className="tag px-2 py-0.5 text-[9.5px]">
                        {styleMeta.label} · {sizeMeta.label}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="max-w-[560px] text-center text-[11.5px] leading-relaxed text-ink-soft">
                  {isDemo
                    ? "当前是演示模式：上面的画面就是内置几何引擎按你的提示词实时算出的构图，点击「生成图片」即可得到正式结果并保存。"
                    : "输入提示词后点击生成；有 API Key 时会调用真实图片模型。"}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
