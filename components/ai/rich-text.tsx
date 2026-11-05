import type { ReactNode } from "react";

/**
 * 轻量 Markdown 渲染（只支持模型常用的几种语法，全部用 React 节点输出，不用 innerHTML，避免 XSS）。
 * 支持：## 标题、- / 1. 列表、- [ ] 任务项、> 引用、``` 代码块、**粗体**、`行内代码`、--- 分割线。
 */

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "quote"; lines: string[] }
  | { kind: "code"; text: string }
  | { kind: "hr" };

function parseBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push({ kind: "code", text: code.join("\n") });
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      blocks.push({ kind: "hr" });
      index += 1;
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (heading) {
      blocks.push({ kind: heading[1].length <= 2 ? "h2" : "h3", text: heading[2] });
      index += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quote.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ kind: "quote", lines: quote });
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    if (/^\d+[.、)]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+[.、)]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+[.、)]\s+/, ""));
        index += 1;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,4}\s|>|[-*]\s|\d+[.、)]\s|```|---+$)/.test(lines[index].trim())
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ kind: "p", lines: paragraph });
  }

  return blocks;
}

/** 行内语法：**粗体**、`代码` */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = pattern.exec(text);
  let key = 0;
  while (match) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${key}`} className="font-extrabold text-ink">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      nodes.push(
        <code
          key={`${keyPrefix}-c-${key}`}
          className="rounded-md border border-ink/15 bg-paper px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[12px]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }
    lastIndex = match.index + token.length;
    key += 1;
    match = pattern.exec(text);
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function renderLines(lines: string[], keyPrefix: string): ReactNode {
  return lines.map((line, index) => (
    <span key={`${keyPrefix}-l-${index}`}>
      {index > 0 ? <br /> : null}
      {renderInline(line, `${keyPrefix}-${index}`)}
    </span>
  ));
}

function TaskItem({ text }: { text: string }) {
  const done = /^\[x\]\s*/i.test(text);
  const label = text.replace(/^\[[ xX]\]\s*/, "");
  return (
    <li className="flex items-start gap-2">
      <span
        className={`mt-[3px] flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[4px] edge-2 ${
          done ? "bg-mint" : "bg-paper"
        }`}
        aria-hidden="true"
      >
        {done ? <span className="block h-[6px] w-[6px] rounded-[1px] bg-ink" /> : null}
      </span>
      <span className={done ? "line-through opacity-60" : ""}>{renderInline(label, "task")}</span>
    </li>
  );
}

export function RichText({ text, streaming = false }: { text: string; streaming?: boolean }) {
  const blocks = parseBlocks(text);

  if (blocks.length === 0 && !streaming) {
    return <span className="text-[13px] text-ink-soft">（空回复）</span>;
  }

  const lastIndex = blocks.length - 1;

  return (
    <div className="space-y-2 text-[14px] leading-[1.8] text-ink">
      {blocks.map((block, index) => {
        const cursor = streaming && index === lastIndex ? <span className="stream-cursor" /> : null;

        if (block.kind === "h2") {
          return (
            <h2 key={index} className="!mt-4 text-[17px] leading-tight">
              {renderInline(block.text, `h2-${index}`)}
              {cursor}
            </h2>
          );
        }
        if (block.kind === "h3") {
          return (
            <h3 key={index} className="!mt-3.5 text-[15px] leading-snug">
              {renderInline(block.text, `h3-${index}`)}
              {cursor}
            </h3>
          );
        }
        if (block.kind === "hr") {
          return <hr key={index} className="my-3 border-t-2 border-dashed border-ink/20" />;
        }
        if (block.kind === "code") {
          return (
            <pre
              key={index}
              className="my-2 overflow-x-auto rounded-[16px] edge bg-ink px-3.5 py-3 font-[family-name:var(--font-mono)] text-[12px] leading-relaxed text-paper"
            >
              <code>
                {block.text}
                {cursor}
              </code>
            </pre>
          );
        }
        if (block.kind === "quote") {
          return (
            <blockquote
              key={index}
              className="my-2 rounded-r-[14px] border-l-[6px] border-coral bg-cream px-3.5 py-2.5 text-[13.5px] font-semibold"
            >
              {renderLines(block.lines, `q-${index}`)}
              {cursor}
            </blockquote>
          );
        }
        if (block.kind === "ul") {
          const isTask = block.items.some((item) => /^\[[ xX]\]\s/.test(item));
          if (isTask) {
            return (
              <ul key={index} className="my-2 space-y-1.5">
                {block.items.map((item, itemIndex) => (
                  <TaskItem key={itemIndex} text={item} />
                ))}
              </ul>
            );
          }
          return (
            <ul key={index} className="my-2 space-y-1.5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex items-start gap-2">
                  <span className="mt-[9px] block h-[7px] w-[7px] shrink-0 rounded-[2px] bg-coral" />
                  <span>{renderInline(item, `ul-${index}-${itemIndex}`)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.kind === "ol") {
          return (
            <ol key={index} className="my-2 space-y-1.5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex items-start gap-2.5">
                  <span className="mt-[2px] flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full edge-2 bg-sun text-[10px] font-extrabold">
                    {itemIndex + 1}
                  </span>
                  <span>{renderInline(item, `ol-${index}-${itemIndex}`)}</span>
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p key={index} className="whitespace-pre-wrap">
            {renderLines(block.lines, `p-${index}`)}
            {cursor}
          </p>
        );
      })}
    </div>
  );
}
