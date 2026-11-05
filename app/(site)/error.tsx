"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[blockset]", error);
  }, [error]);

  return (
    <div className="shell flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <div className="relative mb-8 h-36 w-36">
        <div className="absolute inset-0 -rotate-6 rounded-[30px] edge bg-coral shadow-hard" />
        <div className="absolute inset-5 rotate-6 rounded-[22px] edge bg-sun shadow-hard" />
        <div className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-display)] text-[38px]">
          !
        </div>
      </div>
      <h1 className="display-lg">这一块没拼上</h1>
      <p className="mt-3 max-w-[440px] text-[14px] leading-relaxed text-ink-soft">
        页面渲染时出了点问题。可以先重试一次；如果一直失败，回到首页换个入口。
      </p>
      {error.digest ? (
        <p className="mt-2 font-[family-name:var(--font-mono)] text-[11px] text-ink-soft">
          digest: {error.digest}
        </p>
      ) : null}
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={reset} className="btn btn-primary">
          重试
        </button>
        <Link href="/" className="btn">
          回首页
        </Link>
        <Link href="/apps" className="btn btn-ghost">
          去工具箱
        </Link>
      </div>
    </div>
  );
}
