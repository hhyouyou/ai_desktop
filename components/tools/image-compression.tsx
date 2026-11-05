"use client";

import { useEffect, useRef, useState } from "react";
import {
  baseName,
  canvasToBlob,
  drawImageToCanvas,
  loadImageFile,
  type LoadedImage,
} from "@/lib/tools/image";
import { downloadBlob, formatBytes } from "@/lib/utils";
import { CopyButton, Field, FileDropZone, FilePickButton, Notice, Panel, Segmented } from "./ui";

type Format = "image/webp" | "image/jpeg";

type FileMeta = { name: string; size: number; type: string };

type Compressed = {
  blob: Blob;
  url: string;
  quality: number;
  width: number;
  height: number;
  achieved: boolean;
};

type SearchResult = { blob: Blob; quality: number; achieved: boolean };

async function searchQuality(canvas: HTMLCanvasElement, type: Format, targetBytes: number): Promise<SearchResult> {
  let low = 0.05;
  let high = 0.95;
  let best: Blob | null = null;
  let bestQuality = 0.95;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const mid = (low + high) / 2;
    const blob = await canvasToBlob(canvas, type, mid);
    if (blob.size <= targetBytes) {
      best = blob;
      bestQuality = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  if (best) return { blob: best, quality: bestQuality, achieved: true };
  const fallback = await canvasToBlob(canvas, type, 0.05);
  return { blob: fallback, quality: 0.05, achieved: fallback.size <= targetBytes };
}

export default function ImageCompressionTool() {
  const [meta, setMeta] = useState<FileMeta | null>(null);
  const [source, setSource] = useState<LoadedImage | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [format, setFormat] = useState<Format>("image/webp");
  const [quality, setQuality] = useState(0.8);
  const [targetText, setTargetText] = useState("");
  const [compressed, setCompressed] = useState<Compressed | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<LoadedImage | null>(null);

  const targetKb = Number(targetText);
  const hasTarget = Number.isFinite(targetKb) && targetKb > 0;

  useEffect(
    () => () => {
      sourceRef.current?.close();
    },
    [],
  );

  useEffect(() => {
    if (!originalUrl) return;
    return () => URL.revokeObjectURL(originalUrl);
  }, [originalUrl]);

  useEffect(() => {
    if (!compressed) return;
    return () => URL.revokeObjectURL(compressed.url);
  }, [compressed]);

  const onFile = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件（PNG、JPEG、WebP、GIF）");
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setError("图片超过 30 MB，请先缩小尺寸后再试");
      return;
    }

    setLoading(true);
    setError(null);
    setCompressed(null);
    try {
      const loaded = await loadImageFile(file);
      sourceRef.current?.close();
      sourceRef.current = loaded;
      setSource(loaded);
      setMeta({ name: file.name, size: file.size, type: file.type });
      setOriginalUrl(URL.createObjectURL(file));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "图片读取失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!source) return;
    let cancelled = false;

    const timer = setTimeout(() => {
      void (async () => {
        setBusy(true);
        setError(null);
        try {
          const canvas = drawImageToCanvas(
            source.source,
            source.width,
            source.height,
            format === "image/jpeg" ? "#FFFFFF" : undefined,
          );
          let blob: Blob;
          let usedQuality = quality;
          let achieved = true;

          if (hasTarget) {
            const searched = await searchQuality(canvas, format, targetKb * 1024);
            blob = searched.blob;
            usedQuality = searched.quality;
            achieved = searched.achieved;
          } else {
            blob = await canvasToBlob(canvas, format, quality);
          }

          if (cancelled) return;
          setCompressed({
            blob,
            url: URL.createObjectURL(blob),
            quality: usedQuality,
            width: source.width,
            height: source.height,
            achieved,
          });
        } catch (compressError) {
          if (!cancelled) {
            setError(compressError instanceof Error ? compressError.message : "压缩失败，请换一张图片重试");
          }
        } finally {
          if (!cancelled) setBusy(false);
        }
      })();
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [format, hasTarget, quality, source, targetKb]);

  const reset = () => {
    sourceRef.current?.close();
    sourceRef.current = null;
    setSource(null);
    setMeta(null);
    setOriginalUrl(null);
    setCompressed(null);
    setError(null);
    setTargetText("");
  };

  const download = () => {
    if (!compressed || !meta) return;
    const extension = compressed.blob.type === "image/jpeg" ? "jpg" : "webp";
    downloadBlob(compressed.blob, `${baseName(meta.name)}-compressed.${extension}`);
  };

  const savedPercent = compressed && meta ? Math.round((1 - compressed.blob.size / meta.size) * 100) : 0;
  const fallbackFormat = compressed && compressed.blob.type && compressed.blob.type !== format ? compressed.blob.type : null;

  return (
    <div className="space-y-4">
      <Panel
        title="选择图片"
        desc="图片在浏览器里重新编码，不会上传到服务器。"
        actions={
          meta ? (
            <>
              <FilePickButton accept="image/*" onFiles={onFile} ariaLabel="更换图片">
                更换图片
              </FilePickButton>
              <button type="button" className="btn btn-sm btn-ghost" onClick={reset}>
                移除
              </button>
            </>
          ) : null
        }
      >
        {!meta ? (
          <FileDropZone
            accept="image/*"
            onFiles={(files) => {
              void onFile(files);
            }}
            title="点击选择图片，或拖拽到这里"
            hint="支持 PNG / JPEG / WebP / GIF，单张不超过 30 MB"
          />
        ) : (
          <div className="flex flex-wrap items-center gap-2 rounded-[14px] edge-sub bg-cream/60 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-extrabold">{meta.name}</p>
              <p className="text-[11px] text-ink-soft">
                {formatBytes(meta.size)} · {meta.type || "未知类型"}
                {source ? ` · ${source.width} × ${source.height}` : ""}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <Notice tone="info" className="mt-3">
            正在读取图片…
          </Notice>
        ) : null}
        {error ? (
          <Notice tone="error" className="mt-3">
            {error}
          </Notice>
        ) : null}
        {meta?.type === "image/gif" ? (
          <Notice tone="warn" className="mt-3">
            动图只会取第一帧，导出为静态图片。
          </Notice>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Segmented<Format>
            label="输出格式"
            value={format}
            onChange={setFormat}
            options={[
              { value: "image/webp", label: "WebP（体积更小）" },
              { value: "image/jpeg", label: "JPEG（兼容性好）" },
            ]}
          />
          <Field label="目标体积（KB）" htmlFor="compress-target" hint="留空则按质量滑杆压缩；填写后自动搜索能放进目标体积的最高质量。">
            <input
              id="compress-target"
              className="field"
              type="number"
              min={10}
              step={10}
              inputMode="numeric"
              placeholder="例如 200"
              value={targetText}
              onChange={(event) => setTargetText(event.target.value)}
            />
          </Field>
        </div>

        <div className="mt-3">
          <div className="flex items-end justify-between">
            <label className="label mb-0" htmlFor="compress-quality">
              图片质量
            </label>
            <span className="text-[12.5px] font-bold">
              {hasTarget ? "由目标体积自动决定" : `${Math.round(quality * 100)}%`}
            </span>
          </div>
          <input
            id="compress-quality"
            type="range"
            min={0.1}
            max={1}
            step={0.01}
            value={quality}
            onChange={(event) => setQuality(Number(event.target.value))}
            className="mt-2 w-full accent-coral"
            disabled={hasTarget}
            aria-label="图片质量"
          />
        </div>

        <p className="mt-3 text-[11.5px] leading-relaxed text-ink-soft">
          提示：照片优先 WebP；需要发给旧设备或上传到只接受 JPEG 的平台时选 JPEG。透明背景在 JPEG 下会铺成白色。
        </p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="原图" desc={meta ? `${formatBytes(meta.size)}` : "还没有选择图片。"}>
          {originalUrl && meta ? (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={originalUrl}
                alt="原图预览"
                className="max-h-[320px] w-auto max-w-full rounded-[14px] edge-2 object-contain"
              />
              <p className="mt-2 text-[11.5px] text-ink-soft">
                {source ? `${source.width} × ${source.height} 像素` : ""}
              </p>
            </div>
          ) : (
            <div className="rounded-[18px] edge border-dashed border-ink/30 bg-cream/40 px-4 py-14 text-center">
              <p className="text-[13.5px] font-extrabold">还没有图片</p>
              <p className="mt-1.5 text-[12px] text-ink-soft">选择图片后，这里会显示原图与体积。</p>
            </div>
          )}
        </Panel>

        <Panel
          title="压缩结果"
          desc={
            compressed
              ? `${formatBytes(compressed.blob.size)} · 质量 ${Math.round(compressed.quality * 100)}%`
              : busy
                ? "正在压缩…"
                : "设置参数后自动压缩。"
          }
        >
          {busy && !compressed ? (
            <div className="flex min-h-[180px] items-center justify-center rounded-[18px] border-2 border-dashed border-ink/25 bg-cream/40">
              <p className="text-[13px] font-bold text-ink-soft">正在压缩…</p>
            </div>
          ) : null}

          {compressed ? (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={compressed.url}
                alt="压缩后预览"
                className="max-h-[320px] w-auto max-w-full rounded-[14px] edge-2 object-contain"
              />

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-[12px] edge-sub bg-cream/60 px-2 py-1.5">
                  <p className="text-[10px] font-bold text-ink-soft">压缩前</p>
                  <p className="text-[14px] font-extrabold">{meta ? formatBytes(meta.size) : "-"}</p>
                </div>
                <div className="rounded-[12px] edge-sub bg-cream/60 px-2 py-1.5">
                  <p className="text-[10px] font-bold text-ink-soft">压缩后</p>
                  <p className="text-[14px] font-extrabold">{formatBytes(compressed.blob.size)}</p>
                </div>
                <div className="rounded-[12px] edge-sub bg-mint/20 px-2 py-1.5">
                  <p className="text-[10px] font-bold text-ink-soft">体积变化</p>
                  <p className="text-[14px] font-extrabold">{savedPercent >= 0 ? `-${savedPercent}%` : `+${Math.abs(savedPercent)}%`}</p>
                </div>
              </div>

              {!compressed.achieved ? (
                <Notice tone="warn" className="mt-2">
                  已用到最低质量仍超过目标体积，建议先缩小图片尺寸再压缩。
                </Notice>
              ) : null}

              {fallbackFormat ? (
                <Notice tone="warn" className="mt-2">
                  当前浏览器不支持编码 {format === "image/webp" ? "WebP" : "JPEG"}，已回退为 {fallbackFormat}。
                </Notice>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" className="btn btn-primary" onClick={download} aria-label="下载压缩后的图片">
                  下载图片
                </button>
                <CopyButton text={formatBytes(compressed.blob.size)} label="复制体积" ariaLabel="复制压缩后体积" />
                {savedPercent < 0 ? (
                  <span className="text-[11.5px] text-ink-soft">压缩后反而更大，建议换 WebP 或降低质量。</span>
                ) : null}
              </div>
            </div>
          ) : null}

          {!compressed && !busy ? (
            <div className="rounded-[18px] edge border-dashed border-ink/30 bg-cream/40 px-4 py-14 text-center">
              <p className="text-[13.5px] font-extrabold">还没有压缩结果</p>
              <p className="mt-1.5 text-[12px] text-ink-soft">选择图片后会立即生成一份压缩结果。</p>
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
