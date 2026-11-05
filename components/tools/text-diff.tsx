"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  diffLines,
  lineCount,
  MAX_DIFF_LINES,
  type DiffRow,
  type InlineParts,
} from "@/lib/tools/diff";
import { cn } from "@/lib/utils";
import { Notice, Panel, StatTile, Toggle } from "./ui";

const SAMPLE_LEFT = `块集 BlockSet 使用说明
1. 全部工具在浏览器本地运行
2. 支持 14 个常用工具
3. 文件不会上传到服务器
4. 适合日常的小任务`;

const SAMPLE_RIGHT = `块集 BlockSet 使用说明
1. 全部工具在浏览器本地运行
2. 支持 14 个常用工具，持续增加
3. 文件不会上传到服务器，关闭页面即释放
4. 适合日常的小任务与临时处理`;

function InlinePartsView({ parts, tone }: { parts: InlineParts; tone: "del" | "add" }) {
  const [prefix, changed, suffix] = parts;
  return (
    <span className="whitespace-pre-wrap break-all">
      {prefix}
      {changed ? (
        <mark
          className={cn(
            "rounded-[3px] px-0.5",
            tone === "del" ? "bg-coral/30 text-ink" : "bg-mint/50 text-ink",
          )}
        >
          {changed}
        </mark>
      ) : null}
      {suffix}
    </span>
  );
}

function DiffLineNumbers({ left, right }: { left?: number; right?: number }) {
  return (
    <>
      <span className="select-none border-r border-ink/10 pr-1 text-right text-[10px] text-ink-soft">{left ?? ""}</span>
      <span className="select-none border-r border-ink/10 pr-1 text-right text-[10px] text-ink-soft">{right ?? ""}</span>
    </>
  );
}

export default function TextDiffTool() {
  const [leftText, setLeftText] = useState("");
  const [rightText, setRightText] = useState("");
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);

  const deferredLeft = useDeferredValue(leftText);
  const deferredRight = useDeferredValue(rightText);
  const leftLines = lineCount(deferredLeft);
  const rightLines = lineCount(deferredRight);
  const tooLong = leftLines > MAX_DIFF_LINES || rightLines > MAX_DIFF_LINES;

  const result = useMemo(() => {
    if (tooLong) return null;
    return diffLines(deferredLeft, deferredRight, { ignoreWhitespace });
  }, [deferredLeft, deferredRight, ignoreWhitespace, tooLong]);

  const bothEmpty = leftText === "" && rightText === "";
  const identical =
    result !== null &&
    result.stats.added === 0 &&
    result.stats.deleted === 0 &&
    result.stats.changed === 0 &&
    !bothEmpty;

  const renderRow = (row: DiffRow, index: number) => {
    if (row.kind === "mod") {
      return (
        <div key={index} className="border-b border-ink/10">
          <div className="grid grid-cols-[34px_34px_1fr] gap-1.5 bg-coral/10 px-1.5 py-0.5">
            <DiffLineNumbers left={row.leftNo} />
            <span className="whitespace-pre-wrap break-all text-[12px] leading-relaxed">
              <InlinePartsView parts={row.leftParts} tone="del" />
            </span>
          </div>
          <div className="grid grid-cols-[34px_34px_1fr] gap-1.5 bg-mint/20 px-1.5 py-0.5">
            <DiffLineNumbers right={row.rightNo} />
            <span className="whitespace-pre-wrap break-all text-[12px] leading-relaxed">
              <InlinePartsView parts={row.rightParts} tone="add" />
            </span>
          </div>
        </div>
      );
    }

    if (row.kind === "del") {
      return (
        <div
          key={index}
          className="grid grid-cols-[34px_34px_1fr] gap-1.5 border-b border-ink/10 bg-coral/10 px-1.5 py-0.5"
        >
          <DiffLineNumbers left={row.leftNo} />
          <span className="whitespace-pre-wrap break-all text-[12px] leading-relaxed">{row.text || " "}</span>
        </div>
      );
    }

    if (row.kind === "add") {
      return (
        <div
          key={index}
          className="grid grid-cols-[34px_34px_1fr] gap-1.5 border-b border-ink/10 bg-mint/20 px-1.5 py-0.5"
        >
          <DiffLineNumbers right={row.rightNo} />
          <span className="whitespace-pre-wrap break-all text-[12px] leading-relaxed">{row.text || " "}</span>
        </div>
      );
    }

    return (
      <div
        key={index}
        className="grid grid-cols-[34px_34px_1fr] gap-1.5 border-b border-ink/10 px-1.5 py-0.5"
      >
        <DiffLineNumbers left={row.leftNo} right={row.rightNo} />
        <span className={cn("whitespace-pre-wrap break-all text-[12px] leading-relaxed", row.text ? "" : "h-4")}>
          {row.text || " "}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="原文本" desc={`${leftLines} 行`}>
          <label className="sr-only" htmlFor="diff-left">
            原文本
          </label>
          <textarea
            id="diff-left"
            className="field min-h-[220px] font-[family-name:var(--font-mono)] text-[12.5px]"
            placeholder="粘贴旧版本内容"
            value={leftText}
            onChange={(event) => setLeftText(event.target.value)}
            spellCheck={false}
          />
        </Panel>
        <Panel title="新文本" desc={`${rightLines} 行`}>
          <label className="sr-only" htmlFor="diff-right">
            新文本
          </label>
          <textarea
            id="diff-right"
            className="field min-h-[220px] font-[family-name:var(--font-mono)] text-[12.5px]"
            placeholder="粘贴新版本内容"
            value={rightText}
            onChange={(event) => setRightText(event.target.value)}
            spellCheck={false}
          />
        </Panel>
      </div>

      <Panel
        title="对比结果"
        desc={result ? `共 ${result.rows.length} 行，逐行比较；修改行会标出具体变化字符。` : "等待内容。"}
        actions={
          <>
            <Toggle
              checked={ignoreWhitespace}
              onChange={setIgnoreWhitespace}
              label="忽略空白"
              hint="空格与缩进差异"
            />
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                setLeftText(SAMPLE_LEFT);
                setRightText(SAMPLE_RIGHT);
              }}
            >
              示例
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                const previous = leftText;
                setLeftText(rightText);
                setRightText(previous);
              }}
              aria-label="交换两侧文本"
            >
              交换
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setLeftText("");
                setRightText("");
              }}
            >
              清空
            </button>
          </>
        }
      >
        {tooLong ? (
          <Notice tone="error" className="mb-3">
            单侧内容超过 {MAX_DIFF_LINES} 行，为保持流畅已停止计算，请分段比较。
          </Notice>
        ) : null}

        {result ? (
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile value={result.stats.added} label="新增行" accent="mint" />
            <StatTile value={result.stats.deleted} label="删除行" accent="coral" />
            <StatTile value={result.stats.changed} label="修改行" accent="sun" />
            <StatTile value={result.stats.unchanged} label="未变化行" accent="sky" />
          </div>
        ) : null}

        {bothEmpty ? (
          <div className="rounded-[18px] edge border-dashed border-ink/30 bg-cream/40 px-4 py-14 text-center">
            <p className="text-[13.5px] font-extrabold">两侧都还没有内容</p>
            <p className="mt-1.5 text-[12px] text-ink-soft">把不同版本分别粘贴到上方两个输入框。</p>
          </div>
        ) : identical ? (
          <Notice tone="success">两侧内容完全一致，没有差异。</Notice>
        ) : result ? (
          <div className="max-h-[520px] overflow-auto rounded-[14px] edge-sub bg-paper">
            {result.rows.map((row, index) => renderRow(row, index))}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
