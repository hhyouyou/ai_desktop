"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toCanvas } from "qrcode";
import { contrastRatio, parseHex } from "@/lib/tools/color";
import { downloadBlob } from "@/lib/utils";
import { CopyButton, Field, Notice, Panel, Segmented, Toggle } from "./ui";

type Tab = "text" | "url" | "wifi" | "vcard";
type EcLevel = "L" | "M" | "Q" | "H";
type Encryption = "WPA" | "WEP" | "nopass";

type Fields = {
  text: string;
  url: string;
  ssid: string;
  wifiPassword: string;
  encryption: Encryption;
  hidden: boolean;
  name: string;
  org: string;
  phone: string;
  email: string;
  website: string;
  address: string;
};

const INITIAL_FIELDS: Fields = {
  text: "",
  url: "",
  ssid: "",
  wifiPassword: "",
  encryption: "WPA",
  hidden: false,
  name: "",
  org: "",
  phone: "",
  email: "",
  website: "",
  address: "",
};

const SAMPLES: Record<Tab, Partial<Fields>> = {
  text: { text: "块集 BlockSet：把每天重复的小事，做成一块块能用的工具。" },
  url: { url: "https://example.com" },
  wifi: { ssid: "BlockSet-WiFi", wifiPassword: "blockset2026", encryption: "WPA" },
  vcard: {
    name: "块集实验室",
    org: "块集 BlockSet",
    phone: "13800138000",
    email: "hello@example.com",
    website: "https://example.com",
    address: "上海市",
  },
};

function ensureProtocol(value: string): string {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
}

function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

function buildWifi(fields: Fields): string {
  const ssid = fields.ssid.trim();
  if (!ssid) return "";
  let payload = `WIFI:T:${fields.encryption};S:${escapeWifi(ssid)};`;
  if (fields.encryption !== "nopass") payload += `P:${escapeWifi(fields.wifiPassword)};`;
  if (fields.hidden) payload += "H:true;";
  return `${payload};`;
}

function buildVCard(fields: Fields): string {
  const name = fields.name.trim();
  if (!name) return "";
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:${name}`, `FN:${name}`];
  if (fields.org.trim()) lines.push(`ORG:${fields.org.trim()}`);
  if (fields.phone.trim()) lines.push(`TEL;TYPE=CELL:${fields.phone.trim()}`);
  if (fields.email.trim()) lines.push(`EMAIL:${fields.email.trim()}`);
  if (fields.website.trim()) lines.push(`URL:${ensureProtocol(fields.website.trim())}`);
  if (fields.address.trim()) lines.push(`ADR:;;${fields.address.trim()};;;;`);
  lines.push("END:VCARD");
  return lines.join("\n");
}

function buildPayload(tab: Tab, fields: Fields): string {
  switch (tab) {
    case "text":
      return fields.text;
    case "url":
      return fields.url.trim() ? ensureProtocol(fields.url.trim()) : "";
    case "wifi":
      return buildWifi(fields);
    case "vcard":
      return buildVCard(fields);
    default:
      return "";
  }
}

function describeQrError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/too big|amount of data|capacity|length overflow/i.test(message)) {
    return "内容太长，超出二维码容量：请缩短文本，或把纠错级别降到 L。";
  }
  return "二维码生成失败，请检查内容后重试。";
}

export default function QrCodeTool() {
  const [tab, setTab] = useState<Tab>("text");
  const [fields, setFields] = useState<Fields>(INITIAL_FIELDS);
  const [size, setSize] = useState(320);
  const [margin, setMargin] = useState(2);
  const [ec, setEc] = useState<EcLevel>("M");
  const [foreground, setForeground] = useState("#14110F");
  const [background, setBackground] = useState("#FFFFFF");
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const payload = useMemo(() => buildPayload(tab, fields), [tab, fields]);

  function update<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  const contrast = useMemo(() => {
    const dark = parseHex(foreground);
    const light = parseHex(background);
    if (!dark || !light) return null;
    return contrastRatio(dark, light);
  }, [background, foreground]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !payload) {
      setRendering(false);
      setRenderError(null);
      return;
    }
    let cancelled = false;
    setRendering(true);
    setRenderError(null);

    toCanvas(canvas, payload, {
      width: size,
      margin,
      errorCorrectionLevel: ec,
      color: { dark: foreground, light: background },
    })
      .then(() => {
        if (!cancelled) setRendering(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setRendering(false);
        setRenderError(describeQrError(error));
      });

    return () => {
      cancelled = true;
    };
  }, [background, ec, foreground, margin, payload, size]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas || !payload || renderError) return;
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `qrcode-${Date.now()}.png`);
    }, "image/png");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Panel title="选择内容类型" desc="内容只在浏览器里编码，不会发送到服务器。">
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: "text", label: "文本" },
            { value: "url", label: "网址" },
            { value: "wifi", label: "Wi-Fi" },
            { value: "vcard", label: "名片" },
          ]}
        />

        <div className="mt-4 space-y-3">
          {tab === "text" ? (
            <Field label="文本内容" htmlFor="qr-text" hint="中文、链接、多行文本都可以。">
              <textarea
                id="qr-text"
                className="field min-h-[120px]"
                placeholder="输入要编码的文本"
                value={fields.text}
                onChange={(event) => update("text", event.target.value)}
              />
            </Field>
          ) : null}

          {tab === "url" ? (
            <Field label="网址" htmlFor="qr-url" hint="没写协议时会自动补 https://。">
              <input
                id="qr-url"
                className="field"
                inputMode="url"
                placeholder="example.com/page"
                value={fields.url}
                onChange={(event) => update("url", event.target.value)}
              />
            </Field>
          ) : null}

          {tab === "wifi" ? (
            <>
              <Field label="Wi-Fi 名称（SSID）" htmlFor="qr-ssid">
                <input
                  id="qr-ssid"
                  className="field"
                  placeholder="例如 Office-5G"
                  value={fields.ssid}
                  onChange={(event) => update("ssid", event.target.value)}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="加密方式" htmlFor="qr-encryption">
                  <select
                    id="qr-encryption"
                    className="field"
                    value={fields.encryption}
                    onChange={(event) => update("encryption", event.target.value as Encryption)}
                  >
                    <option value="WPA">WPA / WPA2 / WPA3</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">无密码</option>
                  </select>
                </Field>
                <Field label="密码" htmlFor="qr-wifi-password">
                  <input
                    id="qr-wifi-password"
                    className="field"
                    type="text"
                    autoComplete="off"
                    placeholder="Wi-Fi 密码"
                    value={fields.wifiPassword}
                    disabled={fields.encryption === "nopass"}
                    onChange={(event) => update("wifiPassword", event.target.value)}
                  />
                </Field>
              </div>
              <Toggle
                checked={fields.hidden}
                onChange={(next) => update("hidden", next)}
                label="隐藏网络"
                hint="路由器没有广播 SSID 时开启"
              />
            </>
          ) : null}

          {tab === "vcard" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="姓名 *" htmlFor="qr-name">
                <input
                  id="qr-name"
                  className="field"
                  placeholder="张三"
                  value={fields.name}
                  onChange={(event) => update("name", event.target.value)}
                />
              </Field>
              <Field label="公司 / 组织" htmlFor="qr-org">
                <input
                  id="qr-org"
                  className="field"
                  placeholder="块集实验室"
                  value={fields.org}
                  onChange={(event) => update("org", event.target.value)}
                />
              </Field>
              <Field label="电话" htmlFor="qr-phone">
                <input
                  id="qr-phone"
                  className="field"
                  type="tel"
                  placeholder="13800138000"
                  value={fields.phone}
                  onChange={(event) => update("phone", event.target.value)}
                />
              </Field>
              <Field label="邮箱" htmlFor="qr-email">
                <input
                  id="qr-email"
                  className="field"
                  type="email"
                  placeholder="name@example.com"
                  value={fields.email}
                  onChange={(event) => update("email", event.target.value)}
                />
              </Field>
              <Field label="网站" htmlFor="qr-website">
                <input
                  id="qr-website"
                  className="field"
                  inputMode="url"
                  placeholder="example.com"
                  value={fields.website}
                  onChange={(event) => update("website", event.target.value)}
                />
              </Field>
              <Field label="地址" htmlFor="qr-address">
                <input
                  id="qr-address"
                  className="field"
                  placeholder="上海市"
                  value={fields.address}
                  onChange={(event) => update("address", event.target.value)}
                />
              </Field>
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-sm" onClick={() => setFields((prev) => ({ ...prev, ...SAMPLES[tab] }))}>
            填入示例
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setFields(INITIAL_FIELDS)}>
            清空
          </button>
          <span className="text-[11px] text-ink-soft">{payload.length} 个字符</span>
        </div>

        {payload ? (
          <div className="mt-3">
            <div className="flex items-center justify-between gap-2">
              <span className="label mb-0">编码内容</span>
              <CopyButton text={payload} label="复制内容" ariaLabel="复制二维码原始内容" />
            </div>
            <pre className="mt-1.5 max-h-[132px] overflow-auto whitespace-pre-wrap break-all rounded-[12px] edge-sub bg-cream/60 p-2 font-[family-name:var(--font-mono)] text-[11px] leading-relaxed">
              {payload}
            </pre>
          </div>
        ) : (
          <Notice tone="info" className="mt-3">
            填写上面的内容后，右侧会实时生成二维码。
          </Notice>
        )}
      </Panel>

      <Panel title="预览与下载" desc="下载的 PNG 为原始尺寸，可直接打印。">
        <div className="flex min-h-[220px] items-center justify-center rounded-[18px] edge bg-white p-3">
          <canvas
            ref={canvasRef}
            className={payload && !renderError ? "h-auto max-w-full rounded-[6px]" : "hidden"}
            style={{ width: payload && !renderError ? Math.min(size, 360) : undefined }}
            aria-label="二维码预览"
          />
          {!payload ? (
            <div className="px-4 py-10 text-center">
              <p className="text-[13px] font-extrabold">尚未生成二维码</p>
              <p className="mt-1 text-[12px] text-ink-soft">填写左侧内容后自动生成。</p>
            </div>
          ) : null}
          {renderError ? (
            <div className="px-4 py-10 text-center">
              <p className="text-[13px] font-extrabold text-coral">生成失败</p>
              <p className="mt-1 text-[12px] text-ink-soft">{renderError}</p>
            </div>
          ) : null}
        </div>

        {rendering && payload ? (
          <p className="mt-2 text-center text-[11.5px] text-ink-soft">正在生成…</p>
        ) : null}

        {renderError ? (
          <Notice tone="error" className="mt-3">
            {renderError}
          </Notice>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={download}
            disabled={!payload || Boolean(renderError)}
            aria-label="下载二维码 PNG"
          >
            下载 PNG
          </button>
          <span className="text-[11px] text-ink-soft">{size} × {size} px</span>
        </div>

        {contrast !== null && contrast < 3 ? (
          <Notice tone="warn" className="mt-3">
            前景与背景对比度只有 {contrast.toFixed(1)}:1，扫码识别率会下降，建议换成深色前景 + 浅色背景。
          </Notice>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <div className="flex items-end justify-between">
              <label className="label mb-0" htmlFor="qr-size">
                尺寸
              </label>
              <span className="text-[12px] font-bold">{size} px</span>
            </div>
            <input
              id="qr-size"
              type="range"
              min={160}
              max={1024}
              step={32}
              value={size}
              onChange={(event) => setSize(Number(event.target.value))}
              className="mt-2 w-full accent-blue"
            />
          </div>
          <div>
            <div className="flex items-end justify-between">
              <label className="label mb-0" htmlFor="qr-margin">
                静区
              </label>
              <span className="text-[12px] font-bold">{margin} 格</span>
            </div>
            <input
              id="qr-margin"
              type="range"
              min={0}
              max={8}
              step={1}
              value={margin}
              onChange={(event) => setMargin(Number(event.target.value))}
              className="mt-2 w-full accent-blue"
            />
          </div>
        </div>

        <Segmented<EcLevel>
          className="mt-3"
          label="纠错级别（越高越抗污损，容量越小）"
          value={ec}
          onChange={setEc}
          options={[
            { value: "L", label: "L · 7%" },
            { value: "M", label: "M · 15%" },
            { value: "Q", label: "Q · 25%" },
            { value: "H", label: "H · 30%" },
          ]}
        />

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="qr-fg">
              前景色
            </label>
            <div className="flex items-center gap-2">
              <input
                id="qr-fg"
                type="color"
                value={foreground}
                onChange={(event) => setForeground(event.target.value)}
                className="h-10 w-14 cursor-pointer rounded-[10px] edge-2 bg-paper p-1"
              />
              <span className="font-[family-name:var(--font-mono)] text-[12px] font-bold">{foreground.toUpperCase()}</span>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="qr-bg">
              背景色
            </label>
            <div className="flex items-center gap-2">
              <input
                id="qr-bg"
                type="color"
                value={background}
                onChange={(event) => setBackground(event.target.value)}
                className="h-10 w-14 cursor-pointer rounded-[10px] edge-2 bg-paper p-1"
              />
              <span className="font-[family-name:var(--font-mono)] text-[12px] font-bold">{background.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
