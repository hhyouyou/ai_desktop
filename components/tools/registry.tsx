"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { ToolSkeleton } from "./ui";

/**
 * slug -> 工具客户端组件映射。
 * 用 next/dynamic 懒加载，打开哪个工具才下载哪份代码；加载期间显示骨架屏。
 */

const loading = () => <ToolSkeleton />;

export const TOOL_COMPONENTS: Record<string, ComponentType> = {
  calculator: dynamic(() => import("./calculator"), { loading, ssr: false }),
  "gen-password": dynamic(() => import("./gen-password"), { loading, ssr: false }),
  "mortgage-calculator": dynamic(() => import("./mortgage-calculator"), { loading, ssr: false }),
  timestamp: dynamic(() => import("./timestamp"), { loading, ssr: false }),
  qrcode: dynamic(() => import("./qrcode"), { loading, ssr: false }),
  "json-reader": dynamic(() => import("./json-reader"), { loading, ssr: false }),
  md5: dynamic(() => import("./md5"), { loading, ssr: false }),
  base64: dynamic(() => import("./base64"), { loading, ssr: false }),
  "image-compression": dynamic(() => import("./image-compression"), { loading, ssr: false }),
  "image-cropper": dynamic(() => import("./image-cropper"), { loading, ssr: false }),
  "nine-grid": dynamic(() => import("./nine-grid"), { loading, ssr: false }),
  "color-picker": dynamic(() => import("./color-picker"), { loading, ssr: false }),
  "text-diff": dynamic(() => import("./text-diff"), { loading, ssr: false }),
  "word-counter": dynamic(() => import("./word-counter"), { loading, ssr: false }),
};
