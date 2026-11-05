"use client";

import { useEffect, useRef, useState } from "react";
import {
  baseName,
  canvasToBlob,
  cropToCanvas,
  drawImageToCanvas,
  loadImageFile,
  type LoadedImage,
} from "@/lib/tools/image";
import { downloadBlob, formatBytes } from "@/lib/utils";
import { FileDropZone, FilePickButton, Notice, Panel, Segmented } from "./ui";

type Format = "image/png" | "image/jpeg";

type FileMeta = { name: string; size: number; type: string };

type Slice = {
  index: number;
  blob: Blob;
  preview: string;
  width: number;
  height: number;
};

async function buildSlices(image: LoadedImage, format: Format): Promise<Slice[]> {
  const slices: Slice[] = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const sx = Math.round((image.width * col) / 3);
      const ex = Math.round((image.width * (col + 1)) / 3);
      const sy = Math.round((image.height * row) / 3);
      const ey = Math.round((image.height * (row + 1)) / 3);
      const width = Math.max(1, ex - sx);
      const height = Math.max(1, ey - sy);
      const canvas = cropToCanvas(
        image.source,
        sx,
        sy,
        width,
        height,
        width,
        height,
        format === "image/jpeg" ? "#FFFFFF" : undefined,
      );
      const blob = await canvasToBlob(canvas, format, 0.92);
      const preview = drawImageToCanvas(canvas, 240, 240).toDataURL("image/jpeg", 0.7);
      slices.push({ index: row * 3 + col + 1, blob, preview, width, height });
    }
  }
  return slices;
}

export default function NineGridTool() {
  const [meta, setMeta] = useState<FileMeta | null>(null);
  const [source, setSource] = useState<LoadedImage | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [format, setFormat] = useState<Format>("image/png");
  const [slices, setSlices] = useState<Slice[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<LoadedImage | null>(null);

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
    if (!source) {
      setSlices([]);
      return;
    }
    let cancelled = false;
    setGenerating(true);
    setError(null);
    void (async () => {
      try {
        const next = await buildSlices(source, format);
        if (!cancelled) setSlices(next);
      } catch (sliceError) {
        if (!cancelled) {
          setSlices([]);
          setError(sliceError instanceof Error ? sliceError.message : "切图失败，请换一张图片重试");
        }
      } finally {
        if (!cancelled) setGenerating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [format, source]);

  const onFile = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件（PNG、JPEG、WebP）");
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setError("图片超过 30 MB，请先缩小尺寸后再试");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const loaded = await loadImageFile(file);
      if (loaded.width * loaded.height > 50_000_000) {
        loaded.close();
        setError("图片像素过大（超过 5000 万像素），请先缩小后再切图");
        return;
      }
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

  const reset = () => {
    sourceRef.current?.close();
    sourceRef.current = null;
    setSource(null);
    setMeta(null);
    setOriginalUrl(null);
    setSlices([]);
    setError(null);
  };

  const extension = format === "image/jpeg" ? "jpg" : "png";

  const downloadSlice = (slice: Slice) => {
    if (!meta) return;
    downloadBlob(slice.blob, `${baseName(meta.name)}-${slice.index}.${extension}`);
  };

  const downloadAll = () => {
    slices.forEach((slice, index) => {
      setTimeout(() => downloadSlice(slice), index * 260);
    });
  };

  const totalSize = slices.reduce((sum, slice) => sum + slice.blob.size, 0);

  return (
    <div className="space-y-4">
      <Panel
        title="选择图片"
        desc="切图完全在浏览器本地完成，不会上传图片。"
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
            hint="支持 PNG / JPEG / WebP，单张不超过 30 MB"
          />
        ) : (
          <div className="flex flex-wrap items-center gap-2 rounded-[14px] edge-sub bg-cream/60 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-extrabold">{meta.name}</p>
              <p className="text-[11px] text-ink-soft">
                {formatBytes(meta.size)}
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

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <Segmented<Format>
            label="切片格式"
            value={format}
            onChange={setFormat}
            options={[
              { value: "image/png", label: "PNG（清晰）" },
              { value: "image/jpeg", label: "JPEG（更小）" },
            ]}
          />
          {slices.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11.5px] text-ink-soft">共 9 张 · {formatBytes(totalSize)}</span>
              <button type="button" className="btn btn-sm btn-primary" onClick={downloadAll} aria-label="下载全部九张切片">
                全部下载
              </button>
            </div>
          ) : null}
        </div>

        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
          建议先用图片裁剪工具把图片处理成 1:1，再切成九宫格，发到朋友圈时按 1 → 9 的顺序上传即可还原整图。
        </p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Panel title="原图与切割线" desc={source ? `${source.width} × ${source.height} px` : "还没有选择图片。"}>
          {originalUrl && source ? (
            <div className="flex justify-center">
              <div className="relative inline-block max-w-full overflow-hidden rounded-[14px] edge-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={originalUrl}
                  alt="原图与九宫格切割线预览"
                  className="block max-h-[420px] w-auto max-w-full"
                />
                <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                  <span className="absolute inset-y-0 left-1/3 w-[2px] bg-white/80" />
                  <span className="absolute inset-y-0 left-2/3 w-[2px] bg-white/80" />
                  <span className="absolute inset-x-0 top-1/3 h-[2px] bg-white/80" />
                  <span className="absolute inset-x-0 top-2/3 h-[2px] bg-white/80" />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[18px] edge border-dashed border-ink/30 bg-cream/40 px-4 py-20 text-center">
              <p className="text-[13.5px] font-extrabold">还没有图片</p>
              <p className="mt-1.5 text-[12px] text-ink-soft">选择图片后，这里会显示切割线。</p>
            </div>
          )}
        </Panel>

        <Panel
          title="九宫格切片"
          desc={slices.length > 0 ? "点单张「保存」下载，或点上方「全部下载」。" : "切好后会显示 9 张预览。"}
        >
          {generating ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }, (_, index) => (
                <div
                  key={index}
                  className="aspect-square animate-pulse rounded-[12px] edge-sub bg-cream"
                />
              ))}
            </div>
          ) : null}

          {!generating && slices.length === 0 ? (
            <div className="rounded-[18px] edge border-dashed border-ink/30 bg-cream/40 px-4 py-20 text-center">
              <p className="text-[13.5px] font-extrabold">还没有切片</p>
              <p className="mt-1.5 text-[12px] text-ink-soft">选择图片后会自动切成 9 张。</p>
            </div>
          ) : null}

          {!generating && slices.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              {slices.map((slice) => (
                <div key={slice.index} className="overflow-hidden rounded-[12px] edge-2 bg-paper">
                  <div className="relative aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slice.preview}
                      alt={`第 ${slice.index} 张切片预览`}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full edge-2 bg-sun text-[10px] font-extrabold">
                      {slice.index}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1 border-t-2 border-ink px-1.5 py-1">
                    <span className="text-[9.5px] text-ink-soft">{formatBytes(slice.blob.size)}</span>
                    <button
                      type="button"
                      className="rounded-full edge-2 bg-mint px-1.5 py-0.5 text-[10px] font-extrabold"
                      onClick={() => downloadSlice(slice)}
                      aria-label={`下载第 ${slice.index} 张切片`}
                    >
                      保存
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {slices.length > 0 ? (
            <Notice tone="info" className="mt-3">
              「全部下载」会连续触发 9 次下载，浏览器可能询问是否允许下载多个文件，请选择允许。
            </Notice>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
