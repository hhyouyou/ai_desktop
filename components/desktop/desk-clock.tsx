"use client";

import { useEffect, useState } from "react";

function format(now: Date) {
  const time = now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  const date = now.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" });
  return { time, date };
}

/**
 * 桌面时钟：首屏用服务端时间，挂载后每 30 秒更新，避免水合不一致。
 * variant=bar 渲染顶栏小号时间；variant=widget 渲染小组件的大号时间 + 日期。
 */
export function DeskClock({
  initialTime,
  initialDate,
  variant = "widget",
}: {
  initialTime: string;
  initialDate: string;
  variant?: "bar" | "widget";
}) {
  const [state, setState] = useState({ time: initialTime, date: initialDate });

  useEffect(() => {
    const tick = () => setState(format(new Date()));
    tick();
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, []);

  if (variant === "bar") {
    return (
      <span className="bar-clock" title={state.date}>
        {state.time}
      </span>
    );
  }

  return (
    <>
      <p className="wgt-time">{state.time}</p>
      <p className="wgt-sub">{state.date}</p>
    </>
  );
}
