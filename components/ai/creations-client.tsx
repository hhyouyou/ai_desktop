"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { deleteDrawing, saveDrawing } from "@/lib/ai/client-api";
import type { DrawingItem } from "@/lib/ai/types";
import { cn, formatDate, relativeTime } from "@/lib/utils";
import { CopyButton } from "./copy-button";
import { EmptyState } from "@/components/ui/section-heading";

export function CreationsClient({ initialDrawings }: { initialDrawings: DrawingItem[] }) {
  const [items, setItems] = useState<DrawingItem[]>(initialDrawings);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const lightbox = items.find((item) => item.id === lightboxId) ?? null;

  useEffect(() => {
    if (!lightboxId) return;
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") setLightboxId(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxId]);

  const remove = useCallback(async (id: string): Promise<void> => {
    setRemovingId(id);
    try {
      await deleteDrawing(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setConfirmId(null);
      setLightboxId((current) => (current === id ? null : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败，请稍后重试");
    } finally {
      setRemovingId(null);
    }
  }, []);

  const save = useCallback(async (id: string): Promise<void> => {
    setSavingId(id);
    setError(null);
    try {
      const data = await saveDrawing(id);
      setItems((prev) => prev.map((item) => (item.id === id ? data.drawing : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败，请稍后重试");
    } finally {
      setSavingId(null);
    }
  }, []);

  const savedCount = items.filter((item) => item.status === "done").length;
  const previewCount = items.length - savedCount;

  if (items.length === 0) {
    return (
      <section className="shell py-8">
        <EmptyState
          icon={<Icon name="image" size={34} />}
          title="还没有保存过创作"
          desc="去「创建图片」生成一张，再点「保存到我的创作」，这里就会留下记录。演示模式不需要 API Key，也能生成几何插画。"
          action={
            <Link href="/drawing/create" className="btn btn-primary">
              <Icon name="brush" size={16} />
              去生成第一张
            </Link>
          }
        />
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link href="/drawing/gallery" className="btn btn-sm">
            <Icon name="spark" size={13} />
            逛逛灵感画廊
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="shell py-6">
      {error ? (
        <div
          role="alert"
          className="mb-3 flex items-start justify-between gap-2 rounded-[12px] border-2 border-coral bg-coral/10 px-3 py-2 text-[12px] font-bold text-coral"
        >
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="关闭错误提示">
            <Icon name="close" size={13} />
          </button>
        </div>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12.5px] text-ink-soft">
          共 <span className="font-extrabold text-ink">{items.length}</span> 张 · 已保存{" "}
          <span className="font-extrabold text-ink">{savedCount}</span> 张 · 待保存{" "}
          <span className="font-extrabold text-ink">{previewCount}</span> 张
        </p>
        <Link href="/drawing/create" className="btn btn-sm btn-primary">
          <Icon name="plus" size={13} />
          再生成一张
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const isProcedural = item.model === "blockset-geometric-v1";
          const confirming = confirmId === item.id;
          return (
            <article
              key={item.id}
              className="flex flex-col overflow-hidden rounded-[24px] edge bg-paper shadow-hard"
            >
              <button
                type="button"
                onClick={() => {
                  setConfirmId(null);
                  setLightboxId(item.id);
                }}
                className="group relative block overflow-hidden edge-b bg-cream"
                aria-label={`查看大图：${item.prompt}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.payload}
                  alt={item.prompt}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                {isProcedural ? (
                  <span className="absolute left-2.5 top-2.5 tag tag-sun px-2 py-0.5 text-[9.5px]">
                    程序化几何
                  </span>
                ) : (
                  <span className="absolute left-2.5 top-2.5 tag tag-mint px-2 py-0.5 text-[9.5px]">
                    {item.model}
                  </span>
                )}
                {item.status !== "done" ? (
                  <span className="absolute right-2.5 top-2.5 tag tag-coral px-2 py-0.5 text-[9.5px]">
                    未保存
                  </span>
                ) : null}
                <span className="absolute bottom-2.5 right-2.5 tag tag-ink px-2 py-0.5 text-[9px] opacity-90">
                  AI 生成
                </span>
                <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="rounded-full edge bg-paper px-3 py-1.5 text-[11px] font-extrabold shadow-hard-sm">
                    查看大图
                  </span>
                </span>
              </button>

              <div className="flex flex-1 flex-col p-3.5">
                <p className="line-clamp-2 text-[12.5px] font-bold leading-snug">{item.prompt}</p>
                <div className="mt-1.5 flex items-center gap-2 text-[10.5px] text-ink-soft">
                  <span>{relativeTime(item.createdAt)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatDate(item.createdAt, true)}</span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {item.status !== "done" ? (
                    <button
                      type="button"
                      onClick={() => void save(item.id)}
                      disabled={savingId === item.id}
                      className="btn btn-sm btn-mint !px-2 !py-1 !text-[10.5px]"
                    >
                      <Icon name="heart" size={11} />
                      {savingId === item.id ? "保存中…" : "保存"}
                    </button>
                  ) : null}
                  <CopyButton
                    text={item.prompt}
                    label="复制提示词"
                    className="!px-2 !py-1 !text-[10.5px]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmId(null);
                      setLightboxId(item.id);
                    }}
                    className="btn btn-sm !px-2 !py-1 !text-[10.5px]"
                  >
                    <Icon name="image" size={11} />
                    大图
                  </button>
                  {confirming ? (
                    <span className="ml-auto flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void remove(item.id)}
                        disabled={removingId === item.id}
                        className="btn btn-sm !px-2 !py-1 !text-[10.5px] bg-coral text-white"
                      >
                        {removingId === item.id ? "删除中…" : "确认删除"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="btn btn-sm !px-2 !py-1 !text-[10.5px]"
                      >
                        取消
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(item.id)}
                      className="btn btn-sm ml-auto !px-2 !py-1 !text-[10.5px]"
                      aria-label={`删除创作：${item.prompt}`}
                    >
                      <Icon name="trash" size={11} />
                      删除
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* -------------------------------- 大图查看 -------------------------------- */}
      {lightbox ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6">
          <button
            type="button"
            aria-label="关闭大图"
            onClick={() => setLightboxId(null)}
            className="absolute inset-0 bg-ink/80"
          />
          <div
            className="relative flex max-h-[92dvh] w-full max-w-[960px] flex-col overflow-hidden rounded-[24px] edge bg-paper shadow-hard-lg"
            role="dialog"
            aria-modal="true"
            aria-label="查看大图"
          >
            <div className="flex items-center justify-between gap-2 edge-b bg-cream px-4 py-2.5">
              <div className="min-w-0">
                <p className="eyebrow">Creation</p>
                <p className="truncate text-[13px] font-extrabold">{formatDate(lightbox.createdAt, true)}</p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxId(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full edge-2 bg-paper"
                aria-label="关闭"
              >
                <Icon name="close" size={15} />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-cream/60 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox.payload}
                alt={lightbox.prompt}
                className="max-h-[64dvh] w-auto max-w-full rounded-[14px] edge-2 object-contain"
              />
            </div>
            <div className="edge-t bg-paper p-3.5">
              <p className="text-[12.5px] leading-relaxed">{lightbox.prompt}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "tag px-2 py-0.5 text-[9.5px]",
                    lightbox.model === "blockset-geometric-v1" ? "tag-sun" : "tag-mint",
                  )}
                >
                  {lightbox.model === "blockset-geometric-v1" ? "程序化几何引擎" : lightbox.model}
                </span>
                <CopyButton
                  text={lightbox.prompt}
                  label="复制提示词"
                  className="!px-2.5 !py-1 !text-[11px]"
                />
                {lightbox.status !== "done" ? (
                  <button
                    type="button"
                    onClick={() => void save(lightbox.id)}
                    disabled={savingId === lightbox.id}
                    className="btn btn-sm btn-mint !px-2.5 !py-1 !text-[11px]"
                  >
                    <Icon name="heart" size={12} />
                    {savingId === lightbox.id ? "保存中…" : "保存到我的创作"}
                  </button>
                ) : null}
                <Link
                  href={`/drawing/create?prompt=${encodeURIComponent(lightbox.prompt)}`}
                  className="btn btn-sm btn-primary !px-2.5 !py-1 !text-[11px]"
                >
                  <Icon name="spark" size={12} />
                  用这个提示词再生成
                </Link>
                {confirmId === lightbox.id ? (
                  <span className="ml-auto flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-extrabold text-coral">确认删除这张？</span>
                    <button
                      type="button"
                      onClick={() => void remove(lightbox.id)}
                      disabled={removingId === lightbox.id}
                      className="btn btn-sm bg-coral text-white !px-2.5 !py-1 !text-[11px]"
                    >
                      {removingId === lightbox.id ? "删除中…" : "确认删除"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="btn btn-sm !px-2.5 !py-1 !text-[11px]"
                    >
                      取消
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmId(lightbox.id)}
                    className="btn btn-sm ml-auto !px-2.5 !py-1 !text-[11px]"
                  >
                    <Icon name="trash" size={12} />
                    删除
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
