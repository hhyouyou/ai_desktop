"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { pingAi, type PingResult } from "@/lib/ai/client-api";
import {
  AI_SETTINGS_KEY,
  DEFAULT_AI_SETTINGS,
  aiHeaders,
  clearAiSettings,
  hasLocalKey,
  loadAiSettings,
  saveAiSettings,
} from "@/lib/ai/settings";
import type { AiEnvStatus, AiSettings } from "@/lib/ai/types";
import { cn } from "@/lib/utils";
import { DemoBadge } from "./demo-badge";

type TestState =
  | { status: "idle" }
  | { status: "testing" }
  | { status: "ok"; result: PingResult }
  | { status: "error"; message: string };

function maskKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return "未填写";
  if (trimmed.length <= 8) return "••••••";
  return `${trimmed.slice(0, 3)}••••${trimmed.slice(-4)}`;
}

export function SettingsClient({ status }: { status: AiEnvStatus }) {
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [test, setTest] = useState<TestState>({ status: "idle" });
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSettings(loadAiSettings());
    setLoaded(true);
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  const localConfigured = hasLocalKey(settings);
  const effectiveSource = localConfigured
    ? "本地 Key（仅这台浏览器）"
    : status.configured
      ? "服务端环境变量"
      : "演示模式";

  const formChanged = useMemo(() => {
    const localKey = settings.apiKey.trim();
    return localKey !== "" || settings.baseUrl !== DEFAULT_AI_SETTINGS.baseUrl ||
      settings.model !== DEFAULT_AI_SETTINGS.model ||
      settings.imageModel !== DEFAULT_AI_SETTINGS.imageModel;
  }, [settings]);

  function flashSaved(): void {
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 2000);
  }

  function handleSave(): void {
    const baseUrl = settings.baseUrl.trim() || DEFAULT_AI_SETTINGS.baseUrl;
    if (!/^https?:\/\/[^\s]+$/i.test(baseUrl)) {
      setError("接口地址必须以 http:// 或 https:// 开头");
      return;
    }
    setError(null);
    setNotice(null);
    const normalized: AiSettings = {
      apiKey: settings.apiKey.trim(),
      baseUrl,
      model: settings.model.trim() || DEFAULT_AI_SETTINGS.model,
      imageModel: settings.imageModel.trim() || DEFAULT_AI_SETTINGS.imageModel,
      imageBaseUrl: settings.imageBaseUrl.trim(),
    };
    setSettings(normalized);
    saveAiSettings(normalized);
    flashSaved();
    setNotice("已保存到这台浏览器的 localStorage，其它设备不会同步。");
  }

  function handleClear(): void {
    clearAiSettings();
    setSettings({ ...DEFAULT_AI_SETTINGS });
    setTest({ status: "idle" });
    setError(null);
    setNotice("已清除本地配置。若服务端配置了环境变量，会继续使用服务端配置。");
  }

  async function handleTest(): Promise<void> {
    if (test.status === "testing") return;
    const baseUrl = settings.baseUrl.trim() || DEFAULT_AI_SETTINGS.baseUrl;
    if (!/^https?:\/\/[^\s]+$/i.test(baseUrl)) {
      setError("接口地址必须以 http:// 或 https:// 开头");
      return;
    }
    setError(null);
    setTest({ status: "testing" });
    try {
      const result = await pingAi(
        aiHeaders({
          apiKey: settings.apiKey.trim(),
          baseUrl,
          model: settings.model.trim() || DEFAULT_AI_SETTINGS.model,
          imageModel: settings.imageModel.trim() || DEFAULT_AI_SETTINGS.imageModel,
          imageBaseUrl: settings.imageBaseUrl.trim(),
        }),
      );
      setTest({ status: "ok", result });
    } catch (err) {
      setTest({
        status: "error",
        message: err instanceof Error ? err.message : "测试失败，请稍后重试",
      });
    }
  }

  return (
    <section className="shell py-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-4">
          {/* ------------------------------ 当前状态 ------------------------------ */}
          <div className="rounded-[24px] edge bg-paper p-4 shadow-hard">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="eyebrow">Current Status</p>
                <h2 className="mt-0.5 text-[18px] font-extrabold">当前生效的配置</h2>
              </div>
              <DemoBadge demo={!localConfigured && !status.configured} model={status.model} />
            </div>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
              <div className="rounded-[16px] edge-2 bg-cream px-3 py-2.5">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink-soft">
                  请求实际使用
                </p>
                <p className="mt-1 text-[13px] font-extrabold">{effectiveSource}</p>
              </div>
              <div className="rounded-[16px] edge-2 bg-cream px-3 py-2.5">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink-soft">
                  服务端环境变量
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-[13px] font-extrabold">
                  <span
                    className={cn(
                      "inline-block h-2 w-2 rounded-full",
                      status.configured ? "bg-mint" : "bg-coral",
                    )}
                  />
                  {status.configured ? "已配置" : "未配置"}
                </p>
                <p className="mt-0.5 truncate text-[10.5px] text-ink-soft">{status.model}</p>
              </div>
              <div className="rounded-[16px] edge-2 bg-cream px-3 py-2.5">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink-soft">
                  本地配置
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-[13px] font-extrabold">
                  <span
                    className={cn(
                      "inline-block h-2 w-2 rounded-full",
                      localConfigured ? "bg-mint" : "bg-coral",
                    )}
                  />
                  {localConfigured ? "已填写 Key" : "未填写"}
                </p>
                <p className="mt-0.5 truncate text-[10.5px] text-ink-soft">
                  {localConfigured ? maskKey(settings.apiKey) : "回退到服务端配置"}
                </p>
              </div>
            </div>

            <div className="mt-3 grid gap-x-4 gap-y-1 rounded-[14px] bg-cream/70 px-3 py-2 text-[11.5px] text-ink-soft sm:grid-cols-3">
              <p>
                <span className="font-extrabold text-ink">接口地址</span> {status.baseUrl}
              </p>
              <p>
                <span className="font-extrabold text-ink">对话模型</span> {status.model}
              </p>
              <p>
                <span className="font-extrabold text-ink">画图模型</span> {status.imageModel}
              </p>
            </div>
          </div>

          {/* ------------------------------ 配置表单 ------------------------------ */}
          <div className="rounded-[24px] edge bg-paper p-4 shadow-hard">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="eyebrow">Local Override</p>
                <h2 className="mt-0.5 text-[18px] font-extrabold">本地覆盖配置</h2>
              </div>
              <span className="tag tag-violet gap-1">
                <Icon name="settings" size={11} />
                优先级最高
              </span>
            </div>

            <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="settings-base" className="label">
                  接口地址（Base URL）
                </label>
                <input
                  id="settings-base"
                  value={settings.baseUrl}
                  onChange={(event) => setSettings({ ...settings, baseUrl: event.target.value })}
                  placeholder="https://api.deepseek.com/v1"
                  spellCheck={false}
                  autoComplete="off"
                  className="field font-[family-name:var(--font-mono)] text-[13px]"
                />
                <p className="mt-1 text-[10.5px] leading-snug text-ink-soft">
                  任意 OpenAI 兼容接口，通常以 /v1 结尾。留空则使用默认值。
                </p>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="settings-key" className="label">
                  API Key
                </label>
                <div className="flex gap-2">
                  <input
                    id="settings-key"
                    type={showKey ? "text" : "password"}
                    value={settings.apiKey}
                    onChange={(event) => setSettings({ ...settings, apiKey: event.target.value })}
                    placeholder="sk-…（留空则使用服务端环境变量）"
                    spellCheck={false}
                    autoComplete="off"
                    className="field font-[family-name:var(--font-mono)] text-[13px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((value) => !value)}
                    className="btn btn-sm shrink-0 px-3"
                    aria-label={showKey ? "隐藏 Key" : "显示 Key"}
                  >
                    <Icon name={showKey ? "lock" : "search"} size={13} />
                    {showKey ? "隐藏" : "显示"}
                  </button>
                </div>
                <p className="mt-1 text-[10.5px] leading-snug text-ink-soft">
                  只保存在浏览器 localStorage（键名 <code className="rounded bg-cream px-1">{AI_SETTINGS_KEY}</code>），
                  每次请求以请求头带给服务端，服务端不写库、不落日志。
                </p>
              </div>

              <div>
                <label htmlFor="settings-model" className="label">
                  对话模型
                </label>
                <input
                  id="settings-model"
                  value={settings.model}
                  onChange={(event) => setSettings({ ...settings, model: event.target.value })}
                  placeholder="deepseek-chat"
                  spellCheck={false}
                  autoComplete="off"
                  className="field font-[family-name:var(--font-mono)] text-[13px]"
                />
              </div>

              <div>
                <label htmlFor="settings-image-model" className="label">
                  画图模型
                </label>
                <input
                  id="settings-image-model"
                  value={settings.imageModel}
                  onChange={(event) => setSettings({ ...settings, imageModel: event.target.value })}
                  placeholder="gpt-image-1"
                  spellCheck={false}
                  autoComplete="off"
                  className="field font-[family-name:var(--font-mono)] text-[13px]"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="settings-image-base" className="label">
                  画图接口地址（可选）
                </label>
                <input
                  id="settings-image-base"
                  value={settings.imageBaseUrl}
                  onChange={(event) =>
                    setSettings({ ...settings, imageBaseUrl: event.target.value })
                  }
                  placeholder="https://api.openai.com/v1（留空则复用上面的接口地址）"
                  spellCheck={false}
                  autoComplete="off"
                  className="field font-[family-name:var(--font-mono)] text-[13px]"
                />
                <p className="mt-1 text-[10.5px] leading-snug text-ink-soft">
                  对话服务通常不提供 /images/generations（例如 DeepSeek、通义）。要用真实画图，
                  把这里指向支持画图的服务即可。
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" onClick={handleSave} className="btn btn-primary">
                <Icon name="check" size={15} />
                {saved ? "已保存" : "保存到本地"}
              </button>
              <button
                type="button"
                onClick={() => void handleTest()}
                disabled={test.status === "testing"}
                className="btn btn-blue"
              >
                <Icon name="spark" size={15} />
                {test.status === "testing" ? "正在测试…" : "测试连接"}
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={!formChanged && !localConfigured}
                className="btn"
              >
                <Icon name="trash" size={14} />
                清除本地配置
              </button>
              <span className="ml-auto text-[10.5px] text-ink-soft">
                {loaded ? `已读取本地配置${localConfigured ? "（含 Key）" : ""}` : "读取中…"}
              </span>
            </div>

            {error ? (
              <div
                role="alert"
                className="mt-3 rounded-[12px] border-2 border-coral bg-coral/10 px-3 py-2 text-[12px] font-bold text-coral"
              >
                {error}
              </div>
            ) : null}
            {notice ? (
              <div className="mt-3 rounded-[12px] edge-2 bg-mint/40 px-3 py-2 text-[12px] font-bold">
                {notice}
              </div>
            ) : null}

            {test.status !== "idle" ? (
              <div
                className={cn(
                  "mt-3 rounded-[14px] edge px-3.5 py-3 text-[12.5px] leading-relaxed",
                  test.status === "ok" && test.result.demo
                    ? "border-ink bg-sun/60"
                    : test.status === "ok"
                      ? "border-ink bg-mint/60"
                      : test.status === "error"
                        ? "border-coral bg-coral/10"
                        : "border-ink bg-cream",
                )}
                aria-live="polite"
              >
                {test.status === "testing" ? (
                  <span className="font-extrabold">正在请求模型接口，最多等 15 秒…</span>
                ) : test.status === "ok" ? (
                  test.result.demo ? (
                    <div>
                      <p className="font-extrabold">演示模式：没有可用的 API Key</p>
                      <p className="mt-1 text-ink-soft">{test.result.message}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-extrabold">
                        连接成功 · {test.result.model} · {test.result.latencyMs} ms
                      </p>
                      <p className="mt-1 break-words text-ink-soft">{test.result.message}</p>
                    </div>
                  )
                ) : (
                  <div>
                    <p className="font-extrabold text-coral">测试失败</p>
                    <p className="mt-1 break-words text-ink-soft">{test.message}</p>
                    <p className="mt-1.5 text-[11px] text-ink-soft">
                      常见原因：Key 无效、Base URL 少了 /v1、模型名不存在、服务器访问不了外网。
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* -------------------------------- 右侧说明 -------------------------------- */}
        <aside className="space-y-4">
          <div className="rounded-[24px] edge bg-cream p-4 shadow-hard">
            <p className="eyebrow">How It Works</p>
            <h2 className="mt-0.5 text-[17px] font-extrabold">优先级与兜底</h2>
            <ol className="mt-3 space-y-2.5 text-[12px] leading-relaxed text-ink-soft">
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full edge-2 bg-sun text-[10px] font-extrabold text-ink">
                  1
                </span>
                <span>
                  <strong className="text-ink">本地配置</strong>：填了 Key 就用这一份，请求头覆盖服务端环境变量。
                </span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full edge-2 bg-paper text-[10px] font-extrabold text-ink">
                  2
                </span>
                <span>
                  <strong className="text-ink">服务端环境变量</strong>：
                  <code className="mx-0.5 rounded bg-paper px-1">OPENAI_API_KEY</code> 等，站点所有访客共用。
                </span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full edge-2 bg-paper text-[10px] font-extrabold text-ink">
                  3
                </span>
                <span>
                  <strong className="text-ink">演示模式</strong>：两者都没有时启用，界面、流式输出、画图全部可用，
                  只是内容来自内置模板。
                </span>
              </li>
            </ol>
          </div>

          <div className="rounded-[24px] edge bg-paper p-4 shadow-hard">
            <p className="eyebrow">Server Env</p>
            <h2 className="mt-0.5 text-[17px] font-extrabold">服务端配置示例</h2>
            <pre className="mt-3 overflow-x-auto rounded-[14px] edge-2 bg-ink px-3 py-2.5 font-[family-name:var(--font-mono)] text-[11px] leading-relaxed text-paper">
              <code>{`# .env（重启 dev server 生效）
OPENAI_API_KEY=sk-xxxx
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat
OPENAI_IMAGE_MODEL=gpt-image-1`}</code>
            </pre>
            <p className="mt-2 text-[11px] leading-snug text-ink-soft">
              服务端 Key 不会下发到浏览器；页面只显示「已配置 / 未配置」。
            </p>
          </div>

          <div className="rounded-[24px] edge bg-violet p-4 text-white shadow-hard">
            <p className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">
              Quick Jump
            </p>
            <h2 className="mt-1 text-[17px] font-extrabold">配置完去试试</h2>
            <div className="mt-3 flex flex-col gap-2">
              <Link href="/ai/app/chat" className="btn btn-sm btn-sun justify-start">
                <Icon name="spark" size={13} />
                打开 AI 对话
              </Link>
              <Link href="/ai/app/writing" className="btn btn-sm justify-start">
                <Icon name="pen" size={13} />
                去写一篇
              </Link>
              <Link href="/drawing/create" className="btn btn-sm btn-primary justify-start">
                <Icon name="brush" size={13} />
                生成一张图
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
