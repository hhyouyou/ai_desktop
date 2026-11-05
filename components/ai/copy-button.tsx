"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/utils";

/** 复制按钮：成功后显示「已复制」，1.6s 后还原；没有内容时禁用 */
export function CopyButton({
  text,
  label = "复制",
  className,
  icon = true,
}: {
  text: string;
  label?: string;
  className?: string;
  icon?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function handleCopy(): Promise<void> {
    if (!text) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // 非安全上下文的兜底（本站一般走 localhost，用不到）
        const area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        area.remove();
      }
      setCopied(true);
      setFailed(false);
    } catch {
      setFailed(true);
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setCopied(false);
      setFailed(false);
    }, 1600);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!text}
      className={cn("btn btn-sm", copied && "bg-mint", failed && "bg-coral text-white", className)}
      aria-live="polite"
    >
      {icon ? <Icon name={copied ? "check" : "copy"} size={13} /> : null}
      {copied ? "已复制" : failed ? "复制失败" : label}
    </button>
  );
}
