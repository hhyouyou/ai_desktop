/**
 * 逐行文本对比：基于最长公共子序列（LCS）。
 * 相邻的删除 + 新增配对成“修改”，并在行内标出变化片段。
 */

export type InlineParts = [prefix: string, changed: string, suffix: string];

export type DiffRow =
  | { kind: "equal"; leftNo: number; rightNo: number; text: string }
  | { kind: "del"; leftNo: number; text: string }
  | { kind: "add"; rightNo: number; text: string }
  | { kind: "mod"; leftNo: number; rightNo: number; left: string; right: string; leftParts: InlineParts; rightParts: InlineParts };

export type DiffStats = {
  added: number;
  deleted: number;
  changed: number;
  unchanged: number;
};

export type DiffResult = {
  rows: DiffRow[];
  stats: DiffStats;
};

export type DiffOptions = {
  ignoreWhitespace: boolean;
};

export const MAX_DIFF_LINES = 1500;

export function splitLines(text: string): string[] {
  if (text === "") return [];
  return text.replace(/\r\n?/g, "\n").split("\n");
}

function normalize(line: string, ignoreWhitespace: boolean): string {
  if (!ignoreWhitespace) return line;
  return line.trim().replace(/\s+/g, " ");
}

export function lineCount(text: string): number {
  if (text === "") return 0;
  return text.replace(/\r\n?/g, "\n").split("\n").length;
}

type Op = { kind: "equal"; left: string; right: string } | { kind: "del"; text: string } | { kind: "add"; text: string };

export function diffLines(leftText: string, rightText: string, options: DiffOptions): DiffResult {
  const left = splitLines(leftText);
  const right = splitLines(rightText);

  const width = right.length + 1;
  const dp = new Uint32Array((left.length + 1) * width);
  const eq = (a: string, b: string) => normalize(a, options.ignoreWhitespace) === normalize(b, options.ignoreWhitespace);

  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      dp[i * width + j] = eq(left[i], right[j])
        ? dp[(i + 1) * width + j + 1] + 1
        : Math.max(dp[(i + 1) * width + j], dp[i * width + j + 1]);
    }
  }

  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (eq(left[i], right[j])) {
      ops.push({ kind: "equal", left: left[i], right: right[j] });
      i += 1;
      j += 1;
    } else if (dp[(i + 1) * width + j] >= dp[i * width + j + 1]) {
      ops.push({ kind: "del", text: left[i] });
      i += 1;
    } else {
      ops.push({ kind: "add", text: right[j] });
      j += 1;
    }
  }
  while (i < left.length) {
    ops.push({ kind: "del", text: left[i] });
    i += 1;
  }
  while (j < right.length) {
    ops.push({ kind: "add", text: right[j] });
    j += 1;
  }

  const rows: DiffRow[] = [];
  const stats: DiffStats = { added: 0, deleted: 0, changed: 0, unchanged: 0 };
  let leftNo = 1;
  let rightNo = 1;

  let cursor = 0;
  while (cursor < ops.length) {
    const op = ops[cursor];
    if (op.kind === "equal") {
      rows.push({ kind: "equal", leftNo, rightNo, text: op.left });
      stats.unchanged += 1;
      leftNo += 1;
      rightNo += 1;
      cursor += 1;
      continue;
    }

    const deleted: string[] = [];
    const added: string[] = [];
    while (cursor < ops.length && ops[cursor].kind !== "equal") {
      const current = ops[cursor];
      if (current.kind === "del") deleted.push(current.text);
      else if (current.kind === "add") added.push(current.text);
      cursor += 1;
    }

    const paired = Math.min(deleted.length, added.length);
    for (let k = 0; k < paired; k += 1) {
      const parts = splitChange(deleted[k], added[k]);
      rows.push({
        kind: "mod",
        leftNo,
        rightNo,
        left: deleted[k],
        right: added[k],
        leftParts: parts.left,
        rightParts: parts.right,
      });
      stats.changed += 1;
      leftNo += 1;
      rightNo += 1;
    }
    for (let k = paired; k < deleted.length; k += 1) {
      rows.push({ kind: "del", leftNo, text: deleted[k] });
      stats.deleted += 1;
      leftNo += 1;
    }
    for (let k = paired; k < added.length; k += 1) {
      rows.push({ kind: "add", rightNo, text: added[k] });
      stats.added += 1;
      rightNo += 1;
    }
  }

  return { rows, stats };
}

/** 行内 diff：取公共前缀 / 公共后缀，中间部分作为变化片段。 */
export function splitChange(before: string, after: string): { left: InlineParts; right: InlineParts } {
  const a = Array.from(before);
  const b = Array.from(after);

  let prefix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix += 1;

  let suffix = 0;
  while (
    suffix < a.length - prefix &&
    suffix < b.length - prefix &&
    a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  return {
    left: [a.slice(0, prefix).join(""), a.slice(prefix, a.length - suffix).join(""), a.slice(a.length - suffix).join("")],
    right: [b.slice(0, prefix).join(""), b.slice(prefix, b.length - suffix).join(""), b.slice(b.length - suffix).join("")],
  };
}
