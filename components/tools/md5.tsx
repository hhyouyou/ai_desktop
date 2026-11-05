"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import SparkMD5 from "spark-md5";
import { formatBytes } from "@/lib/utils";
import { CopyButton, Field, FileDropZone, Notice, Panel, Segmented } from "./ui";

type Mode = "text" | "file";

type FileResult = {
  name: string;
  size: number;
  digest: string;
  progress: number;
  status: "waiting" | "hashing" | "done" | "error";
  error?: string;
};

const CHUNK_SIZE = 2 * 1024 * 1024;

async function hashFile(file: File, onProgress: (percent: number) => void): Promise<string> {
  const spark = new SparkMD5.ArrayBuffer();
  const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
  for (let index = 0; index < totalChunks; index += 1) {
    const start = index * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const buffer = await file.slice(start, end).arrayBuffer();
    spark.append(buffer);
    onProgress(Math.round(((index + 1) / totalChunks) * 100));
  }
  return spark.end();
}

export default function Md5Tool() {
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [fileResults, setFileResults] = useState<FileResult[]>([]);
  const [hashing, setHashing] = useState(false);
  const runIdRef = useRef(0);

  const textDigest = useMemo(() => (text ? SparkMD5.hash(text) : ""), [text]);

  const handleFiles = useCallback(async (files: File[]) => {
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;

    setFileResults(
      files.map((file) => ({
        name: file.name,
        size: file.size,
        digest: "",
        progress: 0,
        status: "waiting",
      })),
    );
    setHashing(true);

    const patch = (index: number, patchData: Partial<FileResult>) => {
      if (runIdRef.current !== runId) return;
      setFileResults((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patchData } : item)));
    };

    for (let index = 0; index < files.length; index += 1) {
      patch(index, { status: "hashing" });
      try {
        const digest = await hashFile(files[index], (progress) => patch(index, { progress }));
        patch(index, { status: "done", digest: digest.toUpperCase(), progress: 100 });
      } catch {
        patch(index, { status: "error", error: "读取文件失败，文件可能已被移动或没有权限" });
      }
    }

    if (runIdRef.current === runId) setHashing(false);
  }, []);

  return (
    <div className="space-y-4">
      <Panel title="计算方式" desc="MD5 适合校验文件完整性，不建议用来存储密码。">
        <Segmented<Mode>
          value={mode}
          onChange={setMode}
          options={[
            { value: "text", label: "文本摘要" },
            { value: "file", label: "文件摘要" },
          ]}
        />
      </Panel>

      {mode === "text" ? (
        <Panel title="文本 MD5" desc="边输入边计算，结果实时更新。">
          <Field label="文本内容" htmlFor="md5-text" hint="换行符也算内容的一部分，粘贴时请留意。">
            <textarea
              id="md5-text"
              className="field min-h-[180px] font-[family-name:var(--font-mono)] text-[13px]"
              placeholder="输入要计算摘要的文本"
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </Field>

          <div className="mt-3 rounded-[16px] edge-2 bg-cream/60 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-ink-soft">MD5 摘要（32 位十六进制）</span>
              <CopyButton text={textDigest} label="复制" ariaLabel="复制文本 MD5 摘要" />
            </div>
            <p className="mt-1.5 break-all font-[family-name:var(--font-mono)] text-[14px] font-extrabold uppercase">
              {textDigest || "—"}
            </p>
          </div>

          <p className="mt-2 text-[11.5px] text-ink-soft">
            {text ? `${Array.from(text).length} 个字符 · ${formatBytes(new TextEncoder().encode(text).length)}` : "还没有输入内容。"}
          </p>
        </Panel>
      ) : (
        <Panel
          title="文件 MD5"
          desc="支持一次拖入多个文件，按 2 MB 分块读取，不会一次性占满内存。"
          actions={
            fileResults.length > 0 ? (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  runIdRef.current += 1;
                  setFileResults([]);
                  setHashing(false);
                }}
                aria-label="清空文件列表"
              >
                清空列表
              </button>
            ) : null
          }
        >
          <FileDropZone
            multiple
            onFiles={(files) => {
              void handleFiles(files);
            }}
            title="点击选择文件，或拖拽到这里"
            hint="文件只在本机读取，不会上传；支持多选"
          />

          {hashing ? (
            <Notice tone="info" className="mt-3">
              正在计算摘要，文件越大耗时越久，可以先把窗口放一边。
            </Notice>
          ) : null}

          {fileResults.length === 0 ? (
            <div className="mt-3 rounded-[16px] edge border-dashed border-ink/30 bg-cream/40 px-4 py-10 text-center">
              <p className="text-[13.5px] font-extrabold">还没有选择文件</p>
              <p className="mt-1.5 text-[12px] text-ink-soft">拖入文件后会自动开始计算。</p>
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {fileResults.map((result, index) => (
                <li
                  key={`${result.name}-${index}`}
                  className="rounded-[14px] edge-sub bg-cream/50 px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-extrabold">{result.name}</p>
                      <p className="text-[11px] text-ink-soft">{formatBytes(result.size)}</p>
                    </div>
                    {result.status === "done" ? (
                      <CopyButton text={result.digest} label="复制" ariaLabel={`复制 ${result.name} 的 MD5`} />
                    ) : result.status === "hashing" ? (
                      <span className="text-[11.5px] font-bold text-blue">计算中 {result.progress}%</span>
                    ) : result.status === "waiting" ? (
                      <span className="text-[11.5px] text-ink-soft">排队中</span>
                    ) : null}
                  </div>

                  {result.status === "hashing" ? (
                    <div className="mt-2 h-2 overflow-hidden rounded-full border border-ink/30 bg-paper">
                      <div className="h-full bg-blue transition-all" style={{ width: `${result.progress}%` }} />
                    </div>
                  ) : null}

                  {result.status === "done" ? (
                    <p className="mt-1.5 break-all font-[family-name:var(--font-mono)] text-[12px] font-bold">
                      {result.digest}
                    </p>
                  ) : null}

                  {result.status === "error" ? (
                    <p className="mt-1.5 text-[12px] text-coral">{result.error ?? "计算失败"}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          <Notice tone="warn" className="mt-3">
            MD5 已不适合用于密码哈希与数字签名；校验下载文件是否完整仍然够用。
          </Notice>
        </Panel>
      )}
    </div>
  );
}
