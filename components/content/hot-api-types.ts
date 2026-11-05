/**
 * /api/hot 的响应类型。
 * 纯类型文件（type-only import），可以安全地被客户端组件引用，
 * 不会把 better-sqlite3 之类的服务端依赖打进浏览器包。
 */
import type { HotBoard, HotSourceKey } from "@/lib/hot";

export type HotApiData = {
  boards: HotBoard[];
  /** 是否配置了 HOT_API_BASE */
  configured: boolean;
  /** 是否整页都处于示例数据模式（所有来源都不是实时数据） */
  demo: boolean;
  warnings: string[];
  requestedSource?: HotSourceKey;
  refreshedAt: number;
};

export type HotApiResponse =
  | { ok: true; data: HotApiData }
  | { ok: false; error: string };
