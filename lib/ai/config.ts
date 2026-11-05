/**
 * AI 配置解析（仅服务端使用）。
 *
 * 优先级：请求头（设置页 / 本地配置）> 环境变量 > 默认值。
 * 请求头覆盖是为了让「Key 只存浏览器本地」这件事成立：
 * 服务端只在单次请求里使用，不写库、不落日志。
 */

import type { AiEnvStatus } from "./types";

export const DEFAULT_BASE_URL = "https://api.deepseek.com/v1";
export const DEFAULT_MODEL = "deepseek-chat";
export const DEFAULT_IMAGE_MODEL = "gpt-image-1";

export type AiConfig = {
  apiKey: string;
  baseUrl: string;
  /** 画图用的 Base URL：可与对话不同（对话服务通常没有 /images/generations） */
  imageBaseUrl: string;
  model: string;
  imageModel: string;
  /** 没有可用 Key 时为 true，接口改走演示模式 */
  demo: boolean;
  source: "request" | "env" | "none";
};

function clean(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/** 规范化 base url：去掉尾部斜杠，非法值回退默认 */
export function normalizeBaseUrl(raw: string | null | undefined): string {
  const value = clean(raw).replace(/\/+$/, "");
  if (!value) return DEFAULT_BASE_URL;
  if (!/^https?:\/\/[^\s]+$/i.test(value)) return DEFAULT_BASE_URL;
  return value;
}

function normalizeModel(raw: string | null | undefined, fallback: string): string {
  const value = clean(raw);
  if (!value) return fallback;
  // 模型名会进响应头（Latin-1 限制），去掉非法字符后截断
  const safe = value.replace(/[^A-Za-z0-9._:/+\-@]/g, "").slice(0, 80);
  return safe || fallback;
}

/** 优先读本项目专用变量，其次兼容通用 OPENAI_*，避免被宿主机环境误伤 */
function envFirst(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return value;
  }
  return undefined;
}

/** 从请求头 + env 解析本次请求的 AI 配置 */
export function resolveAiConfig(headers: Headers): AiConfig {
  const headerKey = clean(headers.get("x-ai-key"));
  const headerBase = clean(headers.get("x-ai-base"));
  const headerModel = clean(headers.get("x-ai-model"));
  const headerImageModel = clean(headers.get("x-ai-image-model"));
  const headerImageBase = clean(headers.get("x-ai-image-base"));

  const envKey = clean(envFirst("BLOCKSET_AI_KEY", "OPENAI_API_KEY"));
  const envBase = envFirst("BLOCKSET_AI_BASE", "OPENAI_BASE_URL");
  const envModel = envFirst("BLOCKSET_AI_MODEL", "OPENAI_MODEL");
  const envImageModel = envFirst("BLOCKSET_AI_IMAGE_MODEL", "OPENAI_IMAGE_MODEL");
  const envImageBase = envFirst(
    "BLOCKSET_AI_IMAGE_BASE",
    "BLOCKSET_AI_IMAGE_BASE_URL",
    "OPENAI_IMAGE_BASE_URL",
  );

  const apiKey = headerKey || envKey;
  const source: AiConfig["source"] = headerKey ? "request" : envKey ? "env" : "none";
  const chatBase = normalizeBaseUrl(headerBase || envBase);

  return {
    apiKey,
    baseUrl: chatBase,
    imageBaseUrl: normalizeBaseUrl(headerImageBase || envImageBase || headerBase || envBase),
    model: normalizeModel(headerModel || envModel, DEFAULT_MODEL),
    imageModel: normalizeModel(headerImageModel || envImageModel, DEFAULT_IMAGE_MODEL),
    demo: !apiKey,
    source,
  };
}

/** 页面徽标用的环境状态（不暴露 Key 本身） */
export function aiEnvStatus(): AiEnvStatus {
  const key = clean(envFirst("BLOCKSET_AI_KEY", "OPENAI_API_KEY"));
  return {
    configured: key.length > 0,
    demo: key.length === 0,
    baseUrl: normalizeBaseUrl(envFirst("BLOCKSET_AI_BASE", "OPENAI_BASE_URL")),
    model: normalizeModel(envFirst("BLOCKSET_AI_MODEL", "OPENAI_MODEL"), DEFAULT_MODEL),
    imageModel: normalizeModel(
      envFirst("BLOCKSET_AI_IMAGE_MODEL", "OPENAI_IMAGE_MODEL"),
      DEFAULT_IMAGE_MODEL,
    ),
  };
}

/** 服务端页面用：当前环境是否有 Key */
export function hasServerKey(): boolean {
  return clean(envFirst("BLOCKSET_AI_KEY", "OPENAI_API_KEY")).length > 0;
}
