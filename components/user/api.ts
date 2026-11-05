"use client";

import type { ApiResult } from "@/components/user/model";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

/** 统一解析后端 { ok, data } / { ok, error } 返回值，网络异常也转成中文提示。 */
export async function requestJson<T>(url: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const method = options.method ?? "GET";
  try {
    const response = await fetch(url, {
      method,
      cache: "no-store",
      headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    const payload: unknown = await response.json().catch(() => null);

    if (payload !== null && typeof payload === "object" && "ok" in payload) {
      const record = payload as { ok: unknown; data?: unknown; error?: unknown };
      if (record.ok === true) {
        return { ok: true, data: record.data as T };
      }
      if (typeof record.error === "string" && record.error) {
        return { ok: false, error: record.error };
      }
    }

    return { ok: false, error: `请求失败（HTTP ${response.status}）` };
  } catch {
    return { ok: false, error: "网络异常，请稍后重试" };
  }
}
