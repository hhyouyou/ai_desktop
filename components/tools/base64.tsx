"use client";

import { useEffect, useState } from "react";
import { downloadBlob, formatBytes } from "@/lib/utils";
import { CopyButton, Field, FileDropZone, Notice, Panel, Segmented } from "./ui";

type Mode = "text" | "file";

type FileEncoding = {
  name: string;
  size: number;
  mime: string;
  base64: string;
  dataUrl: string;
};

type DecodedFile = {
  mime: string;
  bytes: Uint8Array;
  preview: string | null;
};

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder("utf-8", { fatal: true });

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...Array.from(chunk));
  }
  return btoa(binary);
}

function base64ToBytes(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function encodeText(text: string, urlSafe: boolean): string {
  const base = bytesToBase64(TEXT_ENCODER.encode(text));
  if (!urlSafe) return base;
  return base.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeText(input: string): string {
  return TEXT_DECODER.decode(base64ToBytes(input));
}

function sniffMime(bytes: Uint8Array): string {
  const startsWith = (...values: number[]) => values.every((value, index) => bytes[index] === value);
  if (startsWith(0x89, 0x50, 0x4e, 0x47)) return "image/png";
  if (startsWith(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (startsWith(0x47, 0x49, 0x46, 0x38)) return "image/gif";
  if (startsWith(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45) return "image/webp";
  if (startsWith(0x25, 0x50, 0x44, 0x46)) return "application/pdf";
  if (startsWith(0x50, 0x4b, 0x03, 0x04)) return "application/zip";
  return "application/octet-stream";
}

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
  "application/json": "json",
  "text/plain": "txt",
  "application/zip": "zip",
  "audio/mpeg": "mp3",
  "video/mp4": "mp4",
};

function extensionFor(mime: string): string {
  const known = EXTENSIONS[mime];
  if (known) return known;
  const subtype = mime.split("/")[1] ?? "";
  const cleaned = subtype.replace(/[^a-z0-9]/gi, "").slice(0, 8);
  return cleaned || "bin";
}

/** 转为 BlobPart（Uint8Array<ArrayBufferLike> 需要收窄为 ArrayBuffer） */
function toBlobPart(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy.buffer;
}

export default function Base64Tool() {
  const [mode, setMode] = useState<Mode>("text");
  const [textInput, setTextInput] = useState("");
  const [textOutput, setTextOutput] = useState("");
  const [urlSafe, setUrlSafe] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);

  const [fileEncoding, setFileEncoding] = useState<FileEncoding | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const [decodeInput, setDecodeInput] = useState("");
  const [decodedFile, setDecodedFile] = useState<DecodedFile | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (decodedFile?.preview) URL.revokeObjectURL(decodedFile.preview);
    };
  }, [decodedFile]);

  const encode = () => {
    if (!textInput) {
      setTextError("请先输入要编码的文本");
      return;
    }
    try {
      setTextOutput(encodeText(textInput, urlSafe));
      setTextError(null);
    } catch {
      setTextError("编码失败，请缩短文本后重试");
    }
  };

  const decode = () => {
    if (!textInput.trim()) {
      setTextError("请先粘贴要解码的 Base64 文本");
      return;
    }
    try {
      setTextOutput(decodeText(textInput));
      setTextError(null);
    } catch {
      setTextOutput("");
      setTextError("解码失败：内容不是合法的 Base64，或解码结果不是 UTF-8 文本（可能是二进制文件，请在文件模式处理）");
    }
  };

  const onFile = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setFileError("文件超过 15 MB，Base64 后体积还会增长约 33%，建议换用其他传输方式。");
      return;
    }
    setFileLoading(true);
    setFileError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      const comma = dataUrl.indexOf(",");
      if (comma < 0) {
        setFileLoading(false);
        setFileError("读取文件内容失败，请重试");
        return;
      }
      const meta = dataUrl.slice(0, comma);
      const mimeMatch = meta.match(/^data:([^;]+)/);
      setFileEncoding({
        name: file.name,
        size: file.size,
        mime: mimeMatch ? mimeMatch[1] : file.type || "application/octet-stream",
        base64: dataUrl.slice(comma + 1),
        dataUrl,
      });
      setFileLoading(false);
    };
    reader.onerror = () => {
      setFileLoading(false);
      setFileError("读取文件失败，请确认文件可访问后重试");
    };
    reader.readAsDataURL(file);
  };

  const decodeToFile = () => {
    const raw = decodeInput.trim();
    if (!raw) {
      setDecodeError("请先粘贴 Base64 内容");
      return;
    }
    try {
      let mime = "";
      let payload = raw;
      const dataUrlMatch = raw.match(/^data:([^;,]+)(?:;base64)?,(.*)$/s);
      if (dataUrlMatch) {
        mime = dataUrlMatch[1];
        payload = dataUrlMatch[2];
      }
      const bytes = base64ToBytes(payload);
      if (bytes.length === 0) {
        setDecodedFile(null);
        setDecodeError("解码结果为空，请检查 Base64 内容");
        return;
      }
      const resolvedMime = mime || sniffMime(bytes);
      let preview: string | null = null;
      if (resolvedMime.startsWith("image/") && bytes.length < 5 * 1024 * 1024) {
        preview = URL.createObjectURL(new Blob([toBlobPart(bytes)], { type: resolvedMime }));
      }
      setDecodedFile({ mime: resolvedMime, bytes, preview });
      setDecodeError(null);
    } catch {
      setDecodedFile(null);
      setDecodeError("不是合法的 Base64：请检查是否混入了中文符号、空格以外的字符或缺少内容");
    }
  };

  const downloadDecoded = () => {
    if (!decodedFile) return;
    downloadBlob(
      new Blob([toBlobPart(decodedFile.bytes)], { type: decodedFile.mime }),
      `decoded-${Date.now()}.${extensionFor(decodedFile.mime)}`,
    );
  };

  return (
    <div className="space-y-4">
      <Panel title="处理方式" desc="文本支持 UTF-8；文件在本机读取，不会上传。">
        <Segmented<Mode>
          value={mode}
          onChange={setMode}
          options={[
            { value: "text", label: "文本编解码" },
            { value: "file", label: "文件 / 图片" },
          ]}
        />
      </Panel>

      {mode === "text" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="输入" desc="编码前是普通文本，解码前是 Base64 字符串。">
            <Field label="输入内容" htmlFor="b64-input">
              <textarea
                id="b64-input"
                className="field min-h-[220px] font-[family-name:var(--font-mono)] text-[12.5px]"
                placeholder={"要编码的文本，例如：块集 BlockSet\n或粘贴 Base64：5Z2X6ZuG"}
                value={textInput}
                onChange={(event) => {
                  setTextInput(event.target.value);
                  if (textError) setTextError(null);
                }}
              />
            </Field>

            <label className="mt-2 flex cursor-pointer items-center gap-2 text-[12.5px] font-bold">
              <input
                type="checkbox"
                checked={urlSafe}
                onChange={(event) => setUrlSafe(event.target.checked)}
                className="h-4 w-4 accent-ink"
              />
              URL Safe 编码（+ / 换成 - _，去掉结尾 =）
            </label>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" className="btn btn-sm btn-primary" onClick={encode}>
                编码
              </button>
              <button type="button" className="btn btn-sm btn-blue" onClick={decode}>
                解码
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  setTextInput(textOutput);
                  setTextOutput("");
                  setTextError(null);
                }}
                disabled={!textOutput}
              >
                交换
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  setTextInput("");
                  setTextOutput("");
                  setTextError(null);
                }}
              >
                清空
              </button>
            </div>

            <p className="mt-2 text-[11.5px] text-ink-soft">
              解码兼容标准与 URL Safe 两种写法（会自动补全等号）。
            </p>
          </Panel>

          <Panel
            title="结果"
            desc={`${Array.from(textOutput).length.toLocaleString("zh-CN")} 字符`}
            actions={<CopyButton text={textOutput} label="复制结果" ariaLabel="复制 Base64 结果" />}
          >
            {textError ? (
              <Notice tone="error" className="mb-3">
                {textError}
              </Notice>
            ) : null}

            {textOutput ? (
              <textarea
                readOnly
                className="field min-h-[260px] font-[family-name:var(--font-mono)] text-[12.5px]"
                value={textOutput}
                aria-label="Base64 结果"
              />
            ) : (
              <div className="rounded-[18px] edge border-dashed border-ink/30 bg-cream/40 px-4 py-14 text-center">
                <p className="text-[13.5px] font-extrabold">还没有结果</p>
                <p className="mt-1.5 text-[12px] text-ink-soft">点「编码」或「解码」后会显示在这里。</p>
              </div>
            )}
          </Panel>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            title="文件 → Base64"
            desc="生成 Data URL 与纯 Base64 文本，可用于内联图片或接口参数。"
            actions={
              fileEncoding ? (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => {
                    setFileEncoding(null);
                    setFileError(null);
                  }}
                >
                  清除
                </button>
              ) : null
            }
          >
            <FileDropZone onFiles={onFile} title="点击选择文件，或拖拽到这里" hint="建议不超过 15 MB" />

            {fileLoading ? (
              <Notice tone="info" className="mt-3">
                正在读取文件…
              </Notice>
            ) : null}
            {fileError ? (
              <Notice tone="error" className="mt-3">
                {fileError}
              </Notice>
            ) : null}

            {fileEncoding ? (
              <div className="mt-3 space-y-2">
                <div className="rounded-[14px] edge-sub bg-cream/60 px-3 py-2">
                  <p className="truncate text-[13px] font-extrabold">{fileEncoding.name}</p>
                  <p className="text-[11px] text-ink-soft">
                    {formatBytes(fileEncoding.size)} · {fileEncoding.mime} · Base64{" "}
                    {fileEncoding.base64.length.toLocaleString("zh-CN")} 字符
                  </p>
                </div>

                {fileEncoding.mime.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fileEncoding.dataUrl}
                    alt={`${fileEncoding.name} 预览`}
                    className="max-h-[220px] w-auto max-w-full rounded-[12px] edge-2 object-contain"
                  />
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <CopyButton text={fileEncoding.base64} label="复制 Base64" ariaLabel="复制文件 Base64" />
                  <CopyButton text={fileEncoding.dataUrl} label="复制 Data URL" ariaLabel="复制文件 Data URL" />
                </div>

                <div>
                  <p className="label mb-1">Base64 预览（截断）</p>
                  <pre className="max-h-[130px] overflow-auto whitespace-pre-wrap break-all rounded-[12px] edge-sub bg-cream/50 p-2 font-[family-name:var(--font-mono)] text-[10.5px] leading-relaxed">
                    {fileEncoding.base64.slice(0, 320)}
                    {fileEncoding.base64.length > 320 ? "…" : ""}
                  </pre>
                </div>
              </div>
            ) : !fileLoading && !fileError ? (
              <div className="mt-3 rounded-[16px] edge border-dashed border-ink/30 bg-cream/40 px-4 py-10 text-center">
                <p className="text-[13.5px] font-extrabold">还没有选择文件</p>
                <p className="mt-1.5 text-[12px] text-ink-soft">选择文件后会立即转换。</p>
              </div>
            ) : null}
          </Panel>

          <Panel title="Base64 → 文件" desc="粘贴 Base64 或 Data URL，识别类型后可预览图片并下载。">
            <label className="label" htmlFor="b64-decode-input">
              Base64 内容
            </label>
            <textarea
              id="b64-decode-input"
              className="field min-h-[150px] font-[family-name:var(--font-mono)] text-[11.5px]"
              placeholder="data:image/png;base64,iVBORw0KGgo..."
              value={decodeInput}
              onChange={(event) => {
                setDecodeInput(event.target.value);
                if (decodeError) setDecodeError(null);
              }}
            />

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="button" className="btn btn-sm btn-primary" onClick={decodeToFile}>
                解码
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  setDecodeInput("");
                  setDecodedFile(null);
                  setDecodeError(null);
                }}
              >
                清空
              </button>
            </div>

            {decodeError ? (
              <Notice tone="error" className="mt-3">
                {decodeError}
              </Notice>
            ) : null}

            {decodedFile ? (
              <div className="mt-3 space-y-2">
                <div className="rounded-[14px] edge-sub bg-cream/60 px-3 py-2">
                  <p className="text-[13px] font-extrabold">{decodedFile.mime}</p>
                  <p className="text-[11px] text-ink-soft">{formatBytes(decodedFile.bytes.length)}</p>
                </div>
                {decodedFile.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={decodedFile.preview}
                    alt="解码后的图片预览"
                    className="max-h-[240px] w-auto max-w-full rounded-[12px] edge-2 object-contain"
                  />
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn btn-sm btn-mint" onClick={downloadDecoded}>
                    下载文件
                  </button>
                  <CopyButton text={decodeInput.trim()} label="复制原始内容" ariaLabel="复制解码前的 Base64" />
                </div>
              </div>
            ) : decodeError ? null : (
              <div className="mt-3 rounded-[16px] edge border-dashed border-ink/30 bg-cream/40 px-4 py-10 text-center">
                <p className="text-[13.5px] font-extrabold">还没有解码结果</p>
                <p className="mt-1.5 text-[12px] text-ink-soft">粘贴 Base64 后点「解码」，可识别 PNG / JPEG / GIF / WebP / PDF。</p>
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
