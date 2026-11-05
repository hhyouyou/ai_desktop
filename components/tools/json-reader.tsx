"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { downloadBlob } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { CopyButton, FilePickButton, Notice, Panel, Segmented } from "./ui";

type JsonError = {
  message: string;
  raw: string;
  line: number | null;
  column: number | null;
  position: number | null;
};

type JsonSummary = {
  type: string;
  topCount: number;
  depth: number;
  nodes: number;
};

const SAMPLE = `{
  "name": "块集 BlockSet",
  "tools": 14,
  "local": true,
  "tags": ["工具箱", "本地计算"],
  "stats": { "visits": 1280, "rate": 0.94 },
  "note": null
}`;

function typeName(value: unknown): string {
  if (Array.isArray(value)) return "数组";
  if (value === null) return "null";
  switch (typeof value) {
    case "object":
      return "对象";
    case "string":
      return "字符串";
    case "number":
      return "数字";
    case "boolean":
      return "布尔值";
    default:
      return typeof value;
  }
}

function summarize(value: unknown): JsonSummary {
  let depth = 0;
  let nodes = 0;
  const walk = (current: unknown, level: number) => {
    nodes += 1;
    depth = Math.max(depth, level);
    if (Array.isArray(current)) {
      current.forEach((item) => walk(item, level + 1));
    } else if (current !== null && typeof current === "object") {
      Object.values(current as Record<string, unknown>).forEach((item) => walk(item, level + 1));
    }
  };
  walk(value, 1);
  const topCount = Array.isArray(value)
    ? value.length
    : value !== null && typeof value === "object"
      ? Object.keys(value as Record<string, unknown>).length
      : 0;
  return { type: typeName(value), topCount, depth, nodes };
}

function locateError(error: unknown, text: string): JsonError {
  const raw = error instanceof Error ? error.message : "JSON 解析失败";
  const positionMatch = raw.match(/at position (\d+)/);
  const lineColumnMatch = raw.match(/line (\d+) column (\d+)/);
  const position = positionMatch ? Number(positionMatch[1]) : null;
  let line = lineColumnMatch ? Number(lineColumnMatch[1]) : null;
  let column = lineColumnMatch ? Number(lineColumnMatch[2]) : null;

  if ((line === null || column === null) && position !== null) {
    const before = text.replace(/\r\n?/g, "\n").slice(0, position);
    const lines = before.split("\n");
    line = lines.length;
    column = (lines[lines.length - 1] ?? "").length + 1;
  }

  const message = raw
    .replace(/\s*in JSON at position \d+.*$/i, "")
    .replace(/\s*\(line \d+ column \d+\)\s*$/i, "")
    .trim();

  return { message, raw, line, column, position };
}

function translateJsonError(message: string): string {
  if (/unexpected end of json input|unexpected end of data/i.test(message)) {
    return "内容不完整：可能缺少右括号、右引号或某个值";
  }
  if (/expected property name or '}'|expected double-quoted property name/i.test(message)) {
    return "对象属性名必须使用双引号，并检查是否漏了逗号";
  }
  if (/expected ',' or '}'/i.test(message)) return "缺少逗号或右括号";
  if (/expected ',' or ']'/i.test(message)) return "缺少逗号或右方括号";
  if (/unexpected token/i.test(message)) return "出现了无法识别的字符，检查逗号、引号是否多写";
  if (/unexpected non-whitespace character after json/i.test(message)) return "JSON 结束后还有多余字符";
  if (/bad control character/i.test(message)) return "字符串里包含未转义的控制字符（如换行、制表符）";
  if (/invalid character/i.test(message)) return "内容里包含非法字符";
  return message;
}

function formatPrimitive(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (value === null) return "null";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return String(value);
}

function JsonNode({
  value,
  name,
  depth,
  defaultOpen,
}: {
  value: unknown;
  name?: string;
  depth: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? depth < 2);
  const isArray = Array.isArray(value);
  const isObject = value !== null && typeof value === "object" && !isArray;
  const indent = { paddingLeft: depth * 14 };

  if (!isArray && !isObject) {
    const colorClass =
      typeof value === "string"
        ? "text-mint"
        : typeof value === "number"
          ? "text-blue"
          : typeof value === "boolean"
            ? "text-coral"
            : "text-ink-soft italic";
    return (
      <div style={indent} className="break-all">
        {name !== undefined ? <span className="text-violet">&quot;{name}&quot;: </span> : null}
        <span className={cn("font-bold", colorClass)}>{formatPrimitive(value)}</span>
      </div>
    );
  }

  const entries: [string, unknown][] = isArray
    ? (value as unknown[]).map((item, index) => [String(index), item])
    : Object.entries(value as Record<string, unknown>);
  const openBracket = isArray ? "[" : "{";
  const closeBracket = isArray ? "]" : "}";

  return (
    <div style={indent}>
      <div className="flex items-start gap-1">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-label={`${open ? "折叠" : "展开"}${isArray ? "数组" : "对象"}${name !== undefined ? ` ${name}` : ""}`}
          className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border border-ink/30 bg-paper text-[9px] font-extrabold leading-none hover:bg-sun"
        >
          {open ? "−" : "+"}
        </button>
        {name !== undefined ? <span className="shrink-0 text-violet">&quot;{name}&quot;:</span> : null}
        <span className="font-extrabold">{openBracket}</span>
        <span className="text-[11px] text-ink-soft">
          {entries.length} {isArray ? "项" : "个键"}
          {open ? "" : ` … ${closeBracket}`}
        </span>
      </div>
      {open ? (
        <div className="ml-2 border-l-2 border-dashed border-ink/15 pl-1.5">
          {entries.map(([key, child]) => (
            <JsonNode key={key} value={child} name={key} depth={depth + 1} defaultOpen={depth < 1} />
          ))}
          <div>
            <span className="font-extrabold">{closeBracket}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function JsonReaderTool() {
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState<{ value: unknown } | null>(null);
  const [outputMode, setOutputMode] = useState<"pretty" | "minified">("pretty");
  const [indent, setIndent] = useState<2 | 4>(2);
  const [view, setView] = useState<"text" | "tree">("text");
  const [error, setError] = useState<JsonError | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const output = useMemo(() => {
    if (!parsed) return "";
    try {
      if (outputMode === "minified") return JSON.stringify(parsed.value) ?? "";
      return JSON.stringify(parsed.value, null, indent) ?? "";
    } catch {
      return "";
    }
  }, [indent, outputMode, parsed]);

  const summary = useMemo(() => (parsed ? summarize(parsed.value) : null), [parsed]);

  const parse = useCallback((text: string, mode: "format" | "minified" | "validate") => {
    const trimmed = text.trim();
    if (!trimmed) {
      setParsed(null);
      setError(null);
      setStatus(null);
      return;
    }
    try {
      const value: unknown = JSON.parse(trimmed);
      setParsed({ value });
      setError(null);
      if (mode === "validate") {
        setStatus(`JSON 有效 · ${summarize(value).nodes} 个节点`);
      } else {
        setOutputMode(mode === "format" ? "pretty" : "minified");
        setStatus(mode === "format" ? "已格式化" : "已压缩为单行");
      }
    } catch (parseError) {
      setParsed(null);
      setStatus(null);
      setError(locateError(parseError, text));
    }
  }, []);

  const onInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    if (fileError) setFileError(null);
    if (parsed) setParsed(null);
    if (error) setError(null);
    if (status) setStatus(null);
  };

  const loadFile = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setFileError("文件超过 8 MB，建议先在编辑器中拆分后再导入。");
      return;
    }
    setLoading(true);
    setFileError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setInput(text);
      setParsed(null);
      setError(null);
      setStatus(null);
      setLoading(false);
      parse(text, "format");
    };
    reader.onerror = () => {
      setLoading(false);
      setFileError("读取文件失败，请确认文件可访问后重试。");
    };
    reader.readAsText(file);
  };

  const download = () => {
    if (!output) return;
    downloadBlob(new Blob([output], { type: "application/json;charset=utf-8" }), `json-${Date.now()}.json`);
  };

  const snippet = useMemo(() => {
    if (!error?.line) return null;
    const lines = input.replace(/\r\n?/g, "\n").split("\n");
    const start = Math.max(0, error.line - 3);
    const end = Math.min(lines.length, error.line + 2);
    return lines.slice(start, end).map((text, index) => ({ no: start + index + 1, text }));
  }, [error, input]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel
        title="输入 JSON"
        desc="粘贴内容，或载入本地 .json 文件，内容不会上传。"
        actions={
          <>
            <FilePickButton accept=".json,application/json,text/plain" onFiles={loadFile} ariaLabel="载入本地 JSON 文件">
              载入文件
            </FilePickButton>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                setInput(SAMPLE);
                setParsed(null);
                setError(null);
                setStatus(null);
                parse(SAMPLE, "format");
              }}
            >
              示例
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setInput("");
                setParsed(null);
                setError(null);
                setStatus(null);
                setFileError(null);
                inputRef.current?.focus();
              }}
            >
              清空
            </button>
          </>
        }
      >
        <label className="label" htmlFor="json-input">
          JSON 文本
        </label>
        <textarea
          id="json-input"
          ref={inputRef}
          className="field min-h-[300px] font-[family-name:var(--font-mono)] text-[12.5px] leading-relaxed lg:min-h-[430px]"
          placeholder={'{ "hello": "world" }'}
          spellCheck={false}
          value={input}
          onChange={onInputChange}
        />

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-sm btn-primary" onClick={() => parse(input, "format")}>
            格式化
          </button>
          <button type="button" className="btn btn-sm btn-blue" onClick={() => parse(input, "minified")}>
            压缩
          </button>
          <button type="button" className="btn btn-sm btn-mint" onClick={() => parse(input, "validate")}>
            校验
          </button>
          <span className="text-[11px] text-ink-soft">{input.length.toLocaleString("zh-CN")} 字符</span>
        </div>

        {loading ? (
          <Notice tone="info" className="mt-3">
            正在读取文件…
          </Notice>
        ) : null}
        {fileError ? (
          <Notice tone="error" className="mt-3">
            {fileError}
          </Notice>
        ) : null}
      </Panel>

      <Panel
        title="结果"
        desc={status ?? "格式化成功后可以复制、下载或切换树形视图。"}
        actions={
          <>
            <Segmented<"pretty" | "minified">
              value={outputMode}
              onChange={(next) => {
                setOutputMode(next);
                if (parsed) setStatus(next === "pretty" ? "已格式化" : "已压缩为单行");
              }}
              options={[
                { value: "pretty", label: "格式化" },
                { value: "minified", label: "单行" },
              ]}
            />
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<"text" | "tree">
            value={view}
            onChange={setView}
            options={[
              { value: "text", label: "文本" },
              { value: "tree", label: "树形" },
            ]}
          />
          <div className="ml-auto flex items-center gap-1.5">
            <Segmented<"2" | "4">
              value={indent === 2 ? "2" : "4"}
              onChange={(next) => setIndent(next === "2" ? 2 : 4)}
              options={[
                { value: "2", label: "2 空格" },
                { value: "4", label: "4 空格" },
              ]}
            />
          </div>
        </div>

        {error ? (
          <div className="mt-3">
            <Notice tone="error">
              <p className="font-extrabold">
                解析失败
                {error.line !== null
                  ? `：第 ${error.line} 行${error.column !== null ? `，第 ${error.column} 列` : ""}`
                  : ""}
              </p>
              <p className="mt-1">{translateJsonError(error.message)}</p>
              <p className="mt-1 break-all font-[family-name:var(--font-mono)] text-[10.5px] opacity-60">{error.raw}</p>
            </Notice>
            {snippet ? (
              <pre className="mt-2 overflow-x-auto rounded-[12px] edge-sub bg-cream/60 p-2 font-[family-name:var(--font-mono)] text-[11px] leading-relaxed">
                {snippet.map((line) => (
                  <div
                    key={line.no}
                    className={cn(
                      "flex gap-2 rounded-[4px] px-1",
                      line.no === error.line && "bg-coral/20 font-bold",
                    )}
                  >
                    <span className="w-6 shrink-0 select-none text-right text-ink-soft">{line.no}</span>
                    <span className="whitespace-pre-wrap break-all">{line.text || " "}</span>
                  </div>
                ))}
              </pre>
            ) : null}
          </div>
        ) : null}

        {!parsed ? (
          <div className="mt-3 rounded-[18px] edge border-dashed border-ink/30 bg-cream/40 px-4 py-14 text-center">
            <p className="text-[13.5px] font-extrabold">还没有解析结果</p>
            <p className="mt-1.5 text-[12px] text-ink-soft">输入 JSON 后点「格式化」「压缩」或「校验」。</p>
          </div>
        ) : view === "tree" ? (
          <div className="mt-3 max-h-[430px] overflow-auto rounded-[14px] edge-sub bg-cream/30 p-3 font-[family-name:var(--font-mono)] text-[12px] leading-[1.7]">
            <JsonNode value={parsed.value} depth={0} defaultOpen />
          </div>
        ) : (
          <div className="mt-3">
            <pre className="max-h-[430px] overflow-auto whitespace-pre-wrap break-all rounded-[14px] edge-sub bg-cream/30 p-3 font-[family-name:var(--font-mono)] text-[12px] leading-relaxed">
              {output || "（空）"}
            </pre>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <CopyButton text={output} label="复制结果" ariaLabel="复制 JSON 结果" />
              <button
                type="button"
                className="btn btn-sm"
                onClick={download}
                disabled={!output}
                aria-label="下载 JSON 文件"
              >
                下载 .json
              </button>
            </div>
          </div>
        )}

        {summary ? (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-[12px] edge-sub bg-cream/60 px-2 py-1.5">
              <p className="text-[10px] font-bold text-ink-soft">顶层类型</p>
              <p className="text-[13px] font-extrabold">{summary.type}</p>
            </div>
            <div className="rounded-[12px] edge-sub bg-cream/60 px-2 py-1.5">
              <p className="text-[10px] font-bold text-ink-soft">顶层条目</p>
              <p className="text-[13px] font-extrabold">{summary.topCount}</p>
            </div>
            <div className="rounded-[12px] edge-sub bg-cream/60 px-2 py-1.5">
              <p className="text-[10px] font-bold text-ink-soft">嵌套层数</p>
              <p className="text-[13px] font-extrabold">{summary.depth}</p>
            </div>
            <div className="rounded-[12px] edge-sub bg-cream/60 px-2 py-1.5">
              <p className="text-[10px] font-bold text-ink-soft">节点总数</p>
              <p className="text-[13px] font-extrabold">{summary.nodes}</p>
            </div>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
