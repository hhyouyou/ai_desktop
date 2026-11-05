"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/utils";

type FavoriteResponse = {
  ok: boolean;
  data?: { favorited: boolean } | string[];
  error?: string;
};

export function FavoriteButton({
  slug,
  initialFavorited,
}: {
  slug: string;
  initialFavorited: boolean;
}) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const payload = (await response.json()) as FavoriteResponse;
      const data = payload.data;
      if (!response.ok || !payload.ok || Array.isArray(data) || !data) {
        throw new Error(payload.error ?? "收藏操作失败，请稍后重试");
      }
      setFavorited(data.favorited);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "收藏操作失败，请稍后重试");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        className={cn("btn btn-sm", favorited && "btn-sun")}
        onClick={() => {
          void toggle();
        }}
        disabled={pending}
        aria-pressed={favorited}
        aria-label={favorited ? "取消收藏该工具" : "收藏该工具"}
      >
        <Icon name="heart" size={14} />
        {pending ? "处理中…" : favorited ? "已收藏" : "收藏"}
      </button>
      {error ? (
        <span role="alert" className="max-w-[180px] text-right text-[11px] font-bold text-coral">
          {error}
        </span>
      ) : null}
    </div>
  );
}
