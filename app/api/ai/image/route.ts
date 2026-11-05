/**
 * POST /api/ai/image
 * body { prompt, size?, style?, seed? }
 * - 无 Key：用 lib/ai/svg.ts 的程序化几何引擎生成 SVG（data URL），不消耗任何额度；
 * - 有 Key：调用 OpenAI 兼容的 /images/generations（b64_json / url 都兼容）。
 * 结果先以 preview 状态写入 drawings 表，用户点「保存到我的创作」后再转为 done。
 */

import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { resolveAiConfig } from "@/lib/ai/config";
import { IMAGE_API_SIZE, IMAGE_STYLE_PROMPT } from "@/lib/ai/prompts";
import { buildProceduralSvg, getDrawingSize, isDrawingSize, isDrawingStyle } from "@/lib/ai/svg";
import {
  AiUpstreamError,
  generateImageOnce,
} from "@/lib/ai/server";
import { insertDrawing, prunePreviewDrawings } from "@/lib/ai/store";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 45_000;
const DEMO_MODEL = "blockset-geometric-v1";

function fail(error: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: NextRequest): Promise<Response> {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return fail("请求体不是合法的 JSON");
  }
  if (typeof payload !== "object" || payload === null) return fail("请求体格式不正确");

  const body = payload as {
    prompt?: unknown;
    size?: unknown;
    style?: unknown;
    seed?: unknown;
  };

  const prompt = (typeof body.prompt === "string" ? body.prompt : "").replace(/\s+/g, " ").trim();
  if (!prompt) return fail("请先写一句提示词");
  if (prompt.length > 500) return fail("提示词太长，请控制在 500 字以内");

  const size = typeof body.size === "string" && isDrawingSize(body.size) ? body.size : "1:1";
  const style = typeof body.style === "string" && isDrawingStyle(body.style) ? body.style : "flat";
  const seed = typeof body.seed === "string" ? body.seed.slice(0, 32) : undefined;

  const viewer = await getViewer();
  const config = resolveAiConfig(req.headers);
  const sizeMeta = getDrawingSize(size);

  // 清理旧预览，避免反复生成把表撑大
  prunePreviewDrawings(viewer.id);

  /* -------------------------------- 演示模式 ------------------------------- */
  if (config.demo) {
    const svg = buildProceduralSvg({ prompt, style, size, seed });
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
    const drawing = insertDrawing({
      userId: viewer.id,
      prompt,
      model: DEMO_MODEL,
      payload: dataUrl,
      mime: "image/svg+xml",
      status: "preview",
    });
    return NextResponse.json({
      ok: true,
      demo: true,
      image: dataUrl,
      mime: "image/svg+xml",
      model: DEMO_MODEL,
      id: drawing.id,
      size,
      style,
      width: sizeMeta.width,
      height: sizeMeta.height,
      note: "演示模式：由站内程序化几何引擎生成，不消耗额度。配置 API Key 后可切换到真实图片模型。",
    });
  }

  /* -------------------------------- 真实模型 ------------------------------- */
  const finalPrompt = `${prompt}。${IMAGE_STYLE_PROMPT[style]}。构图完整，色彩统一，高清，适合作为独立插画。`.slice(
    0,
    1000,
  );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const result = await generateImageOnce({
      config,
      prompt: finalPrompt,
      apiSize: IMAGE_API_SIZE[size],
      signal: controller.signal,
    });
    const drawing = insertDrawing({
      userId: viewer.id,
      prompt,
      model: result.model,
      payload: result.image,
      mime: result.mime,
      status: "preview",
    });
    return NextResponse.json({
      ok: true,
      demo: false,
      image: result.image,
      mime: result.mime,
      model: result.model,
      id: drawing.id,
      size,
      style,
      width: sizeMeta.width,
      height: sizeMeta.height,
    });
  } catch (error) {
    const message =
      error instanceof AiUpstreamError
        ? error.message
        : controller.signal.aborted
          ? "图片生成超时（45 秒），请稍后重试"
          : "图片生成失败，请检查画图模型与接口地址";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
