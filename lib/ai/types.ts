/**
 * AI 模块共享类型与常量（浏览器 / 服务端通用，不含 node 专有 API）。
 * 画图相关的尺寸 / 风格定义在 lib/ai/svg.ts。
 */

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = { role: ChatRole; content: string };

export type ThreadSummary = {
  id: string;
  title: string;
  mode: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
};

export type MessageItem = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

export type DrawingItem = {
  id: string;
  prompt: string;
  model: string;
  mime: string;
  payload: string;
  status: string;
  createdAt: number;
};

/** localStorage 里保存的模型配置（只在浏览器本地，绝不上报持久化） */
export type AiSettings = {
  apiKey: string;
  baseUrl: string;
  model: string;
  imageModel: string;
  /** 画图专用 Base URL（留空则复用对话接口地址） */
  imageBaseUrl: string;
};

export type AiEnvStatus = {
  configured: boolean;
  demo: boolean;
  baseUrl: string;
  model: string;
  imageModel: string;
};

/** 服务端接口统一响应外壳 */
export type ApiError = { ok: false; error: string };
