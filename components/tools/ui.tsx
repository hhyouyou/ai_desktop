"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, ReactNode } from "react";
import { Icon } from "@/components/icons";
import type { Accent } from "@/lib/accent";
import { ACCENT_TILE } from "@/lib/accent";
import { cn } from "@/lib/utils";
import { copyText } from "@/lib/tools/clipboard";

/* ------------------------------- 复制 ------------------------------- */

export function useCopy() {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(async (text: string) => {
    const ok = await copyText(text);
    if (ok) {
      setError(null);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } else {
      setError("复制失败，请手动选中文本复制");
    }
    return ok;
  }, []);

  return { copied, error, copy };
}

export function CopyButton({
  text,
  label = "复制",
  className,
  disabled,
  ariaLabel,
}: {
  text: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const { copied, copy } = useCopy();
  return (
    <button
      type="button"
      className={cn("btn btn-sm", className)}
      onClick={() => void copy(text)}
      disabled={disabled || !text}
      aria-label={ariaLabel ?? label}
    >
      <Icon name={copied ? "check" : "copy"} size={13} />
      {copied ? "已复制" : label}
    </button>
  );
}

/* ------------------------------- 布局块 ------------------------------- */

export function Panel({
  title,
  desc,
  actions,
  children,
  className,
  id,
}: {
  title?: ReactNode;
  desc?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn("rounded-[26px] edge bg-paper p-4 shadow-hard-sm sm:p-5", className)}
    >
      {title || actions ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title ? <h2 className="text-[17px] font-extrabold leading-tight">{title}</h2> : null}
            {desc ? <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{desc}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-soft">{hint}</p> : null}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (next: T) => void;
  label?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {label ? <p className="label">{label}</p> : null}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-full edge-2 px-3 py-1.5 text-[12.5px] font-extrabold transition-colors",
                active ? "bg-ink text-paper" : "bg-paper text-ink hover:bg-cream",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-[14px] edge-sub bg-cream/60 px-3 py-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-ink"
      />
      <span>
        <span className="block text-[13px] font-bold leading-tight">{label}</span>
        {hint ? <span className="mt-0.5 block text-[11px] text-ink-soft">{hint}</span> : null}
      </span>
    </label>
  );
}

export function Notice({
  tone = "info",
  children,
  className,
}: {
  tone?: "info" | "success" | "error" | "warn";
  children: ReactNode;
  className?: string;
}) {
  const styles = {
    info: "border-ink/25 bg-cream text-ink",
    success: "border-mint/60 bg-mint/15 text-ink",
    error: "border-coral/60 bg-coral/10 text-ink",
    warn: "border-sun bg-sun/25 text-ink",
  }[tone];
  const iconName = {
    info: "text",
    success: "check",
    error: "close",
    warn: "flame",
  }[tone] as "text" | "check" | "close" | "flame";

  return (
    <div className={cn("flex items-start gap-2 rounded-[14px] border-2 px-3 py-2 text-[12.5px] leading-relaxed", styles, className)}>
      <Icon name={iconName} size={14} className="mt-0.5 shrink-0" />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}

export function StatTile({
  value,
  label,
  accent = "cream",
  className,
}: {
  value: ReactNode;
  label: string;
  accent?: Accent | "cream";
  className?: string;
}) {
  const bg = accent === "cream" ? "bg-cream" : ACCENT_TILE[accent];
  return (
    <div className={cn("rounded-[16px] edge-2 px-3 py-2.5", bg, className)}>
      <p className="font-[family-name:var(--font-display)] text-[19px] leading-none">{value}</p>
      <p className="mt-1 text-[11px] font-bold opacity-80">{label}</p>
    </div>
  );
}

export function ToolSkeleton() {
  return (
    <div className="animate-pulse rounded-[26px] edge bg-paper p-5 shadow-hard-sm">
      <div className="h-4 w-32 rounded-full bg-cream" />
      <div className="mt-4 h-36 rounded-[16px] bg-cream" />
      <div className="mt-3 h-10 w-full rounded-[14px] bg-cream" />
      <div className="mt-2 h-10 w-2/3 rounded-[14px] bg-cream" />
    </div>
  );
}

/* ------------------------------ 文件拖拽 ------------------------------ */

export function FileDropZone({
  accept,
  multiple = false,
  onFiles,
  title,
  hint,
  className,
  disabled,
  children,
}: {
  accept?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  title?: string;
  hint?: string;
  className?: string;
  disabled?: boolean;
  children?: ReactNode;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (list: FileList | null) => {
      if (!list || list.length === 0) return;
      const files = Array.from(list);
      if (files.length === 0) return;
      onFiles(multiple ? files : files.slice(0, 1));
    },
    [multiple, onFiles],
  );

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (disabled) return;
    setDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  return (
    <label
      className={cn(
        "group block cursor-pointer rounded-[20px] edge border-dashed border-ink/40 bg-cream/50 px-4 py-8 text-center transition-colors",
        dragging && !disabled && "border-ink bg-sun/40",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={(event) => {
        const related = event.relatedTarget as Node | null;
        if (!related || !event.currentTarget.contains(related)) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
      {children ?? (
        <span className="flex flex-col items-center gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-full edge bg-sun">
            <Icon name="upload" size={18} />
          </span>
          <span className="text-[14px] font-extrabold">{title ?? "点击选择文件，或拖拽到这里"}</span>
          {hint ? <span className="text-[11.5px] text-ink-soft">{hint}</span> : null}
        </span>
      )}
    </label>
  );
}

/** 隐藏的 file input + 按钮触发（用于“重新选择”这类场景） */
export function FilePickButton({
  accept,
  multiple = false,
  onFiles,
  children,
  className,
  disabled,
  ariaLabel,
}: {
  accept?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const list = event.target.files;
          if (list && list.length > 0) onFiles(multiple ? Array.from(list) : [list[0]]);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        className={cn("btn btn-sm", className)}
        disabled={disabled}
        aria-label={ariaLabel}
        onClick={() => inputRef.current?.click()}
      >
        {children}
      </button>
    </>
  );
}
