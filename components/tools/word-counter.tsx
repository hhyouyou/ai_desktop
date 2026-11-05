"use client";

import { useMemo, useState } from "react";
import { analyzeText, formatDuration } from "@/lib/tools/text-stats";
import { percent } from "@/lib/utils";
import { CopyButton, Notice, Panel, StatTile } from "./ui";

const SAMPLE = `块集 BlockSet 是一个在线工具箱。把每天重复的小事，做成一块块能用的工具：图片压缩、JSON 格式化、二维码生成，全部在浏览器本地完成。

写长文时，字数和阅读时长能帮助你判断篇幅；写周报时，行数和段落数能提醒结构是否清晰。English words are counted separately, so mixed text also works.`;

export default function WordCounterTool() {
  const [text, setText] = useState("");
  const stats = useMemo(() => analyzeText(text), [text]);

  const empty = text.length === 0;
  const totalCountable = stats.chineseChars + stats.englishWords;
  const chinesePercent = totalCountable > 0 ? percent(stats.chineseChars, totalCountable) : 0;

  const summary = [
    `中文字数：${stats.chineseChars}`,
    `英文单词：${stats.englishWords}`,
    `字符数（含空格）：${stats.characters}`,
    `字符数（不含空格）：${stats.charactersNoSpaces}`,
    `段落数：${stats.paragraphs}`,
    `行数：${stats.lines}`,
    `标点符号：${stats.punctuation}`,
    `预计阅读时长：${formatDuration(stats.readingSeconds)}`,
  ].join("\n");

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <Panel
        title="输入文本"
        desc="所有统计在浏览器里实时完成，不会上传内容。"
        actions={
          <>
            <button type="button" className="btn btn-sm" onClick={() => setText(SAMPLE)}>
              粘贴示例
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setText("")}
              disabled={empty}
              aria-label="清空文本"
            >
              清空
            </button>
          </>
        }
      >
        <label className="sr-only" htmlFor="counter-text">
          待统计文本
        </label>
        <textarea
          id="counter-text"
          className="field min-h-[320px] leading-relaxed"
          placeholder="在这里粘贴文章、笔记或任何文本，统计结果会实时更新"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <p className="mt-2 text-[11.5px] text-ink-soft">
          字数为 0 时表示还没有输入内容；中文字数按单个汉字计，英文按单词计。
        </p>
      </Panel>

      <div className="space-y-4">
        <Panel
          title="统计结果"
          desc={empty ? "输入内容后开始统计。" : "已按当前文本实时计算。"}
          actions={<CopyButton text={empty ? "" : summary} label="复制统计" ariaLabel="复制全部统计结果" />}
        >
          {empty ? (
            <div className="rounded-[18px] edge border-dashed border-ink/30 bg-cream/40 px-4 py-16 text-center">
              <p className="text-[13.5px] font-extrabold">还没有文本</p>
              <p className="mt-1.5 text-[12px] text-ink-soft">左侧输入或粘贴内容后，这里会显示各项指标。</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <StatTile value={stats.chineseChars.toLocaleString("zh-CN")} label="中文字数" accent="sun" />
                <StatTile value={stats.englishWords.toLocaleString("zh-CN")} label="英文单词" accent="blue" />
                <StatTile
                  value={stats.charactersNoSpaces.toLocaleString("zh-CN")}
                  label="字符（不含空格）"
                  accent="mint"
                />
                <StatTile value={stats.characters.toLocaleString("zh-CN")} label="字符（含空格）" accent="sky" />
                <StatTile value={stats.paragraphs} label="段落" accent="coral" />
                <StatTile value={stats.lines} label="行数" accent="cream" />
              </div>

              <div className="mt-3 rounded-[16px] edge-2 bg-cream/60 px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] font-extrabold text-ink-soft">中文 / 英文构成</span>
                  <span className="text-[11.5px] font-bold">
                    中文 {chinesePercent}% · 英文 {100 - chinesePercent}%
                  </span>
                </div>
                <div className="mt-2 flex h-3 overflow-hidden rounded-full edge-2 bg-paper">
                  <div className="h-full bg-sun" style={{ width: `${chinesePercent}%` }} aria-hidden="true" />
                  <div className="h-full flex-1 bg-blue" aria-hidden="true" />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-[16px] edge-2 bg-paper px-3 py-2.5">
                  <p className="text-[10.5px] font-bold text-ink-soft">预计阅读时长</p>
                  <p className="mt-0.5 font-[family-name:var(--font-display)] text-[20px] leading-none">
                    {formatDuration(stats.readingSeconds)}
                  </p>
                </div>
                <div className="rounded-[16px] edge-2 bg-paper px-3 py-2.5">
                  <p className="text-[10.5px] font-bold text-ink-soft">标点符号</p>
                  <p className="mt-0.5 font-[family-name:var(--font-display)] text-[20px] leading-none">
                    {stats.punctuation.toLocaleString("zh-CN")}
                  </p>
                </div>
              </div>

              <Notice tone="info" className="mt-3">
                阅读时长按中文 350 字/分钟、英文 220 词/分钟估算，实际会因内容和阅读习惯不同而变化。
              </Notice>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
