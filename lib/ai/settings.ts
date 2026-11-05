/**
 * 本地模型配置：只存在浏览器 localStorage，不上报、不落库。
 * 每次请求通过 X-AI-Key / X-AI-Base / X-AI-Model 请求头带给服务端。
 */

import type { AiSettings } from "./types";

export const AI_SETTINGS_KEY = "blockset.ai.settings";

export const DEFAULT_AI_SETTINGS: AiSettings = {
  apiKey: "",
  baseUrl: "https://api.deepseek.com/v1",
  model: "deepseek-chat",
  imageModel: "gpt-image-1",
  imageBaseUrl: "",
};

function normalize(settings: Partial<AiSettings> | null | undefined): AiSettings {
  return {
    apiKey: typeof settings?.apiKey === "string" ? settings.apiKey.trim() : "",
    baseUrl:
      typeof settings?.baseUrl === "string" && settings.baseUrl.trim()
        ? settings.baseUrl.trim()
        : DEFAULT_AI_SETTINGS.baseUrl,
    model:
      typeof settings?.model === "string" && settings.model.trim()
        ? settings.model.trim()
        : DEFAULT_AI_SETTINGS.model,
    imageModel:
      typeof settings?.imageModel === "string" && settings.imageModel.trim()
        ? settings.imageModel.trim()
        : DEFAULT_AI_SETTINGS.imageModel,
    imageBaseUrl:
      typeof settings?.imageBaseUrl === "string" ? settings.imageBaseUrl.trim() : "",
  };
}

/** 读取本地配置；SSR 或损坏的数据都安全回退默认值 */
export function loadAiSettings(): AiSettings {
  if (typeof window === "undefined") return { ...DEFAULT_AI_SETTINGS };
  try {
    const raw = window.localStorage.getItem(AI_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_AI_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AiSettings> | null;
    return normalize(parsed);
  } catch {
    return { ...DEFAULT_AI_SETTINGS };
  }
}

export function saveAiSettings(settings: AiSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(normalize(settings)));
}

export function clearAiSettings(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AI_SETTINGS_KEY);
}

export function hasLocalKey(settings: AiSettings): boolean {
  return settings.apiKey.trim().length > 0;
}

/** 把本地配置翻译成请求头（空值不发送，交给服务端的 env 兜底） */
export function aiHeaders(settings: AiSettings): Record<string, string> {
  const headers: Record<string, string> = {};
  const key = settings.apiKey.trim();
  const base = settings.baseUrl.trim();
  const model = settings.model.trim();
  const imageModel = settings.imageModel.trim();
  const imageBase = (settings.imageBaseUrl ?? "").trim();
  if (key) headers["X-AI-Key"] = key;
  if (base) headers["X-AI-Base"] = base;
  if (model) headers["X-AI-Model"] = model;
  if (imageModel) headers["X-AI-Image-Model"] = imageModel;
  if (imageBase) headers["X-AI-Image-Base"] = imageBase;
  return headers;
}
