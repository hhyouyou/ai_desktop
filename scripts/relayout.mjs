/**
 * 一次性脚本：把小镇整体放大。
 *
 * 位置 ×P（地块变大、间距同比拉开），建筑占地 ×S（建筑相对地块更大），
 * 高度 ×H（长得比原来高一点，但不至于变塔）。
 *
 * 用法：node scripts/relayout.mjs [--dry]
 */

import fs from "node:fs";

const P = 1.25; // 位置
const S = 1.55; // 建筑占地（宽、深）
const H = 1.25; // 建筑高度

const FILE = "lib/town/data.ts";
let src = fs.readFileSync(FILE, "utf8");

const round = (n) => Math.round(n * 100) / 100;

/** 取出某个 export 块的文本范围 */
function section(name, endMarker) {
  const start = src.indexOf(`export const ${name}`);
  if (start < 0) throw new Error(`找不到 ${name}`);
  const end = src.indexOf(endMarker, start);
  if (end < 0) throw new Error(`${name} 结尾未找到`);
  return { start, end: end + endMarker.length };
}

/** 在某个块里替换字段值 */
function scaleFields(text, fields, factor) {
  let out = text;
  for (const field of fields) {
    const re = new RegExp(`(\\b${field}:\\s*)(-?\\d+(?:\\.\\d+)?)`, "g");
    out = out.replace(re, (_, prefix, value) => `${prefix}${round(Number(value) * factor)}`);
  }
  return out;
}

const jobs = [];

// 街道、小径：两端点 ×P，宽度 ×P
jobs.push({
  name: "STREETS",
  end: "\n];",
  apply: (t) => scaleFields(scaleFields(t, ["x1", "z1", "x2", "z2"], P), ["width"], P),
});
jobs.push({
  name: "PATHS",
  end: "\n];",
  apply: (t) => scaleFields(scaleFields(t, ["x1", "z1", "x2", "z2"], P), ["width"], P),
});

// 广场、公园、池塘、凉亭
jobs.push({ name: "PLAZA", end: " as const;", apply: (t) => scaleFields(scaleFields(t, ["x", "z"], P), ["radius"], S) });
jobs.push({
  name: "PARK",
  end: " as const;",
  apply: (t) => scaleFields(scaleFields(t, ["x", "z"], P), ["w", "d"], S),
});
jobs.push({
  name: "POND",
  end: " as const;",
  apply: (t) => scaleFields(scaleFields(t, ["x", "z"], P), ["rx", "rz"], S),
});
jobs.push({ name: "GAZEBO", end: " as const;", apply: (t) => scaleFields(scaleFields(t, ["x", "z"], P), ["radius"], S) });

// 建筑：位置 ×P，占地 ×S，高度 ×H
jobs.push({
  name: "BUILDINGS",
  end: "\n];",
  apply: (t) => {
    let out = scaleFields(t, ["x", "z"], P);
    out = scaleFields(out, ["w", "d"], S);
    out = scaleFields(out, ["h"], H);
    return out;
  },
});

// 地点附属物：位置 ×P
jobs.push({ name: "SITES", end: "\n];", apply: (t) => scaleFields(t, ["x", "z"], P) });

// 装饰建筑
jobs.push({
  name: "DECOR",
  end: "\n];",
  apply: (t) => {
    let out = scaleFields(t, ["x", "z"], P);
    out = scaleFields(out, ["w", "d"], S);
    return scaleFields(out, ["h"], H);
  },
});

// 后院草地
jobs.push({
  name: "YARDS",
  end: "\n];",
  apply: (t) => scaleFields(scaleFields(t, ["x", "z"], P), ["w", "d"], S),
});

// 纯数字点对 / 三元组
const pairs = ["LAMPS", "BINS", "PARK_GATES"];
pairs.forEach((name) =>
  jobs.push({
    name,
    end: "\n];",
    apply: (t) =>
      t.replace(/\[\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\s*\]/g, (_, x, z) => `[${round(x * P)}, ${round(z * P)}]`),
  }),
);

["PARK_TREES", "STREET_TREES"].forEach((name) =>
  jobs.push({
    name,
    end: "\n];",
    apply: (t) =>
      t.replace(
        /\[\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\s*\]/g,
        (_, x, z, s) => `[${round(x * P)}, ${round(z * P)}, ${s}]`,
      ),
  }),
);

// 带 x/z 的点位对象
const spots = [
  "BENCHES",
  "PLANTERS",
  "STALLS",
  "BUSHES",
  "FLOWERS",
  "FENCES",
  "BICYCLES",
  "CLOTHESLINES",
  "CRATES",
  "POTS",
  "BARRELS",
  "SIGNPOSTS",
];
spots.forEach((name) => jobs.push({ name, end: "\n];", apply: (t) => scaleFields(t, ["x", "z"], P) }));

// 逐个替换（从后往前，避免位置错乱）
const resolved = jobs.map((job) => {
  const range = section(job.name, job.end);
  return { ...job, range };
});

resolved.sort((a, b) => b.range.start - a.range.start);

for (const job of resolved) {
  const block = src.slice(job.range.start, job.range.end);
  src = src.slice(0, job.range.start) + job.apply(block) + src.slice(job.range.end);
}

// 地块尺寸
src = src.replace(/export const TOWN_SIZE = \d+;/, `export const TOWN_SIZE = ${Math.round(32 * P)};`);

if (process.argv.includes("--dry")) {
  console.log("dry run：未写盘");
} else {
  fs.writeFileSync(FILE, src);
  console.log(`完成：位置 ×${P}，占地 ×${S}，高度 ×${H}，TOWN_SIZE = ${Math.round(32 * P)}`);
}
