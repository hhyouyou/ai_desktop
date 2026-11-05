"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  baseName,
  canvasToBlob,
  clamp,
  cropToCanvas,
  loadImageFile,
  rotateImage,
  type LoadedImage,
} from "@/lib/tools/image";
import { downloadBlob, formatBytes, cn } from "@/lib/utils";
import { Field, FileDropZone, FilePickButton, Notice, Panel, Segmented } from "./ui";

type Rotation = 0 | 90 | 180 | 270;
type RatioKey = "free" | "1:1" | "4:3" | "3:4" | "16:9" | "custom";
type Format = "image/png" | "image/jpeg";

const VIEW_W = 720;
const VIEW_H = 540;

type FileMeta = { name: string; size: number; type: string };

type Exported = { url: string; blob: Blob; width: number; height: number };

function computeLayout(source: LoadedImage, rotation: Rotation) {
  const swapped = rotation === 90 || rotation === 270;
  const rotatedW = swapped ? source.height : source.width;
  const rotatedH = swapped ? source.width : source.height;
  const fitScale = Math.min(VIEW_W / rotatedW, VIEW_H / rotatedH);
  const displayW = rotatedW * fitScale;
  const displayH = rotatedH * fitScale;
  return {
    rotatedW,
    rotatedH,
    fitScale,
    displayW,
    displayH,
    x: (VIEW_W - displayW) / 2,
    y: (VIEW_H - displayH) / 2,
  };
}

export default function ImageCropperTool() {
  const [meta, setMeta] = useState<FileMeta | null>(null);
  const [source, setSource] = useState<LoadedImage | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [ratioKey, setRatioKey] = useState<RatioKey>("1:1");
  const [customWidth, setCustomWidth] = useState("800");
  const [customHeight, setCustomHeight] = useState("600");
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [format, setFormat] = useState<Format>("image/png");
  const [exported, setExported] = useState<Exported | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ pointerId: number; lastX: number; lastY: number } | null>(null);
  const sourceRef = useRef<LoadedImage | null>(null);

  const layout = useMemo(() => (source ? computeLayout(source, rotation) : null), [rotation, source]);

  const cropAspect = useMemo(() => {
    if (!layout) return 1;
    switch (ratioKey) {
      case "1:1":
        return 1;
      case "4:3":
        return 4 / 3;
      case "3:4":
        return 3 / 4;
      case "16:9":
        return 16 / 9;
      case "custom": {
        const width = Number(customWidth);
        const height = Number(customHeight);
        return width > 0 && height > 0 ? width / height : 1;
      }
      default:
        return layout.displayW / layout.displayH;
    }
  }, [customHeight, customWidth, layout, ratioKey]);

  const cropRect = useMemo(() => {
    if (!layout) return { x: 0, y: 0, w: 0, h: 0 };
    let width = layout.displayW;
    let height = width / cropAspect;
    if (height > layout.displayH) {
      height = layout.displayH;
      width = height * cropAspect;
    }
    width *= zoom;
    height *= zoom;
    const x = layout.x + (layout.displayW - width) * ((offsetX + 1) / 2);
    const y = layout.y + (layout.displayH - height) * ((offsetY + 1) / 2);
    return { x, y, w: width, h: height };
  }, [cropAspect, layout, offsetX, offsetY, zoom]);

  const exportInfo = useMemo(() => {
    if (!source || !layout) return null;
    const cropWidth = cropRect.w / layout.fitScale;
    const cropHeight = cropRect.h / layout.fitScale;
    let outWidth = Math.round(cropWidth);
    let outHeight = Math.round(cropHeight);
    const maxSide = 4096;
    const outScale = Math.min(1, maxSide / cropWidth, maxSide / cropHeight);
    outWidth = Math.max(1, Math.round(cropWidth * outScale));
    outHeight = Math.max(1, Math.round(cropHeight * outScale));
    if (ratioKey === "custom") {
      const width = Number(customWidth);
      const height = Number(customHeight);
      if (width > 0 && height > 0) {
        outWidth = Math.round(width);
        outHeight = Math.round(height);
      }
    }
    return { cropWidth: Math.round(cropWidth), cropHeight: Math.round(cropHeight), outWidth, outHeight };
  }, [cropRect.h, cropRect.w, customHeight, customWidth, layout, ratioKey, source]);

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
    if (!exported) return;
    return () => URL.revokeObjectURL(exported.url);
  }, [exported]);

  /* 绘制预览 */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, VIEW_W, VIEW_H);
    context.fillStyle = "#F4EFE3";
    context.fillRect(0, 0, VIEW_W, VIEW_H);

    if (!source || !layout) return;

    context.save();
    context.translate(layout.x + layout.displayW / 2, layout.y + layout.displayH / 2);
    context.rotate((rotation * Math.PI) / 180);
    const drawWidth = source.width * layout.fitScale;
    const drawHeight = source.height * layout.fitScale;
    context.drawImage(source.source, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    context.restore();

    context.fillStyle = "rgba(20, 17, 15, 0.55)";
    context.fillRect(0, 0, VIEW_W, Math.max(0, cropRect.y));
    context.fillRect(0, cropRect.y + cropRect.h, VIEW_W, Math.max(0, VIEW_H - cropRect.y - cropRect.h));
    context.fillRect(0, cropRect.y, Math.max(0, cropRect.x), cropRect.h);
    context.fillRect(
      cropRect.x + cropRect.w,
      cropRect.y,
      Math.max(0, VIEW_W - cropRect.x - cropRect.w),
      cropRect.h,
    );

    context.strokeStyle = "#FFFFFF";
    context.lineWidth = 3;
    context.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);

    context.strokeStyle = "rgba(255, 255, 255, 0.45)";
    context.lineWidth = 1;
    for (let index = 1; index < 3; index += 1) {
      const x = cropRect.x + (cropRect.w * index) / 3;
      const y = cropRect.y + (cropRect.h * index) / 3;
      context.beginPath();
      context.moveTo(x, cropRect.y);
      context.lineTo(x, cropRect.y + cropRect.h);
      context.stroke();
      context.beginPath();
      context.moveTo(cropRect.x, y);
      context.lineTo(cropRect.x + cropRect.w, y);
      context.stroke();
    }
  }, [cropRect, layout, rotation, source]);

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
    setExported(null);
    try {
      const loaded = await loadImageFile(file);
      if (loaded.width * loaded.height > 50_000_000) {
        loaded.close();
        setError("图片像素过大（超过 5000 万像素），请先缩小后再裁剪");
        return;
      }
      sourceRef.current?.close();
      sourceRef.current = loaded;
      setSource(loaded);
      setMeta({ name: file.name, size: file.size, type: file.type });
      setOriginalUrl(URL.createObjectURL(file));
      setRotation(0);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "图片读取失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const resetView = () => {
    setRotation(0);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  const resetAll = () => {
    sourceRef.current?.close();
    sourceRef.current = null;
    setSource(null);
    setMeta(null);
    setOriginalUrl(null);
    setExported(null);
    setError(null);
    resetView();
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!source) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = VIEW_W / rect.width;
    const scaleY = VIEW_H / rect.height;
    const pointX = (event.clientX - rect.left) * scaleX;
    const pointY = (event.clientY - rect.top) * scaleY;
    if (
      pointX < cropRect.x ||
      pointX > cropRect.x + cropRect.w ||
      pointY < cropRect.y ||
      pointY > cropRect.y + cropRect.h
    ) {
      return;
    }
    dragRef.current = { pointerId: event.pointerId, lastX: event.clientX, lastY: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas || drag.pointerId !== event.pointerId) return;
    const rect = canvas.getBoundingClientRect();
    const deltaX = (event.clientX - drag.lastX) * (VIEW_W / rect.width);
    const deltaY = (event.clientY - drag.lastY) * (VIEW_H / rect.height);
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;

    if (layout) {
      const availableX = layout.displayW - cropRect.w;
      const availableY = layout.displayH - cropRect.h;
      if (availableX > 0.5) setOffsetX((prev) => clamp(prev + (deltaX * 2) / availableX, -1, 1));
      if (availableY > 0.5) setOffsetY((prev) => clamp(prev + (deltaY * 2) / availableY, -1, 1));
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (drag && drag.pointerId === event.pointerId) {
      dragRef.current = null;
      if (canvasRef.current?.hasPointerCapture(event.pointerId)) {
        canvasRef.current.releasePointerCapture(event.pointerId);
      }
    }
  };

  const exportImage = async () => {
    if (!source || !layout || !meta) return;
    setBusy(true);
    setError(null);
    try {
      const rotated = rotateImage(source.source, source.width, source.height, rotation);
      const offsetCropX = cropRect.x - layout.x;
      const offsetCropY = cropRect.y - layout.y;
      const sx = clamp(offsetCropX / layout.fitScale, 0, rotated.width - 1);
      const sy = clamp(offsetCropY / layout.fitScale, 0, rotated.height - 1);
      const sw = clamp(cropRect.w / layout.fitScale, 1, rotated.width - sx);
      const sh = clamp(cropRect.h / layout.fitScale, 1, rotated.height - sy);

      const outWidth = exportInfo?.outWidth ?? Math.round(sw);
      const outHeight = exportInfo?.outHeight ?? Math.round(sh);
      const output = cropToCanvas(
        rotated,
        sx,
        sy,
        sw,
        sh,
        outWidth,
        outHeight,
        format === "image/jpeg" ? "#FFFFFF" : undefined,
      );
      const blob = await canvasToBlob(output, format, 0.92);
      setExported({ blob, url: URL.createObjectURL(blob), width: output.width, height: output.height });
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "导出失败，请重试");
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!exported || !meta) return;
    const extension = exported.blob.type === "image/jpeg" ? "jpg" : "png";
    downloadBlob(exported.blob, `${baseName(meta.name)}-crop.${extension}`);
  };

  return (
    <div className="space-y-4">
      <Panel
        title="选择图片"
        desc="裁剪与导出都在浏览器本地完成。"
        actions={
          meta ? (
            <>
              <FilePickButton accept="image/*" onFiles={onFile} ariaLabel="更换图片">
                更换图片
              </FilePickButton>
              <button type="button" className="btn btn-sm btn-ghost" onClick={resetAll}>
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
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <Panel
          title="裁剪预览"
          desc="在取景框内拖动可以移动画面；框外区域会被裁掉。"
          actions={
            source ? (
              <>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setRotation((prev) => (((prev + 90) % 360) as Rotation))}
                  aria-label="顺时针旋转 90 度"
                >
                  旋转 90°
                </button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={resetView}>
                  重置视角
                </button>
              </>
            ) : null
          }
        >
          {source ? (
            <div>
              <canvas
                ref={canvasRef}
                width={VIEW_W}
                height={VIEW_H}
                className="w-full touch-none rounded-[16px] edge bg-cream"
                style={{ cursor: "move" }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                aria-label="裁剪预览，拖动调整取景位置"
                role="img"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-ink-soft">
                <span>当前旋转：{rotation}°</span>
                <span>
                  裁剪区域约 {exportInfo?.cropWidth ?? 0} × {exportInfo?.cropHeight ?? 0} px
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-[18px] edge border-dashed border-ink/30 bg-cream/40 px-4 py-24 text-center">
              <p className="text-[13.5px] font-extrabold">还没有图片</p>
              <p className="mt-1.5 text-[12px] text-ink-soft">选择图片后，这里会显示取景框。</p>
            </div>
          )}
        </Panel>

        <Panel title="裁剪设置" desc="比例、取景范围和导出格式。">
          <Segmented<RatioKey>
            label="裁剪比例"
            value={ratioKey}
            onChange={setRatioKey}
            options={[
              { value: "free", label: "自由" },
              { value: "1:1", label: "1:1" },
              { value: "4:3", label: "4:3" },
              { value: "3:4", label: "3:4" },
              { value: "16:9", label: "16:9" },
              { value: "custom", label: "自定义像素" },
            ]}
          />

          {ratioKey === "custom" ? (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="输出宽度（px）" htmlFor="crop-w">
                <input
                  id="crop-w"
                  className="field"
                  type="number"
                  min={1}
                  max={4096}
                  inputMode="numeric"
                  value={customWidth}
                  onChange={(event) => setCustomWidth(event.target.value)}
                />
              </Field>
              <Field label="输出高度（px）" htmlFor="crop-h">
                <input
                  id="crop-h"
                  className="field"
                  type="number"
                  min={1}
                  max={4096}
                  inputMode="numeric"
                  value={customHeight}
                  onChange={(event) => setCustomHeight(event.target.value)}
                />
              </Field>
            </div>
          ) : null}

          <div className="mt-3">
            <div className="flex items-end justify-between">
              <label className="label mb-0" htmlFor="crop-zoom">
                取景范围
              </label>
              <span className="text-[12px] font-bold">{Math.round(zoom * 100)}%</span>
            </div>
            <input
              id="crop-zoom"
              type="range"
              min={0.3}
              max={1}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="mt-2 w-full accent-coral"
            />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-end justify-between">
                <label className="label mb-0" htmlFor="crop-x">
                  水平位置
                </label>
                <span className="text-[11px] font-bold">{offsetX.toFixed(2)}</span>
              </div>
              <input
                id="crop-x"
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={offsetX}
                onChange={(event) => setOffsetX(Number(event.target.value))}
                className="mt-2 w-full accent-blue"
              />
            </div>
            <div>
              <div className="flex items-end justify-between">
                <label className="label mb-0" htmlFor="crop-y">
                  垂直位置
                </label>
                <span className="text-[11px] font-bold">{offsetY.toFixed(2)}</span>
              </div>
              <input
                id="crop-y"
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={offsetY}
                onChange={(event) => setOffsetY(Number(event.target.value))}
                className="mt-2 w-full accent-blue"
              />
            </div>
          </div>

          <Segmented<Format>
            className="mt-4"
            label="导出格式"
            value={format}
            onChange={setFormat}
            options={[
              { value: "image/png", label: "PNG（保留透明）" },
              { value: "image/jpeg", label: "JPEG（铺白底）" },
            ]}
          />

          <div className="mt-4 rounded-[16px] edge-2 bg-cream/60 px-3 py-2.5">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-bold text-ink-soft">导出尺寸</span>
              <span className="font-[family-name:var(--font-mono)] font-extrabold">
                {exportInfo ? `${exportInfo.outWidth} × ${exportInfo.outHeight} px` : "—"}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[12px]">
              <span className="font-bold text-ink-soft">旋转</span>
              <span className="font-[family-name:var(--font-mono)] font-extrabold">{rotation}°</span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary mt-3 w-full"
            onClick={() => {
              void exportImage();
            }}
            disabled={!source || busy}
            aria-label="导出裁剪后的图片"
          >
            {busy ? "导出中…" : "导出图片"}
          </button>

          {exported ? (
            <div className="mt-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={exported.url}
                alt="裁剪结果预览"
                className="max-h-[220px] w-auto max-w-full rounded-[14px] edge-2 bg-white object-contain"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="button" className="btn btn-sm btn-mint" onClick={download} aria-label="下载裁剪结果">
                  下载
                </button>
                <span className="text-[11.5px] text-ink-soft">
                  {formatBytes(exported.blob.size)} · {exported.width} × {exported.height} px
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-[11.5px] text-ink-soft">调好取景后点「导出图片」，可以预览并下载。</p>
          )}

          {source ? (
            <p className={cn("mt-2 text-[11px] leading-relaxed text-ink-soft")}>
              先旋转再裁剪，导出结果和预览一致。大尺寸图片会自动限制在 4096 px 以内。
            </p>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
