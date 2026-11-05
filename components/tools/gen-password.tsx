"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { CopyButton, Notice, Panel, Toggle } from "./ui";

const POOLS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?/",
};

const AMBIGUOUS = new Set(["0", "O", "1", "l", "I", "|", "`", "'", "\"", "o"]);

type Options = { lower: boolean; upper: boolean; digits: boolean; symbols: boolean };

/** 无偏随机整数（拒绝采样），依赖浏览器密码学随机源 */
function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 1) return 0;
  const range = 0x100000000;
  const limit = Math.floor(range / maxExclusive) * maxExclusive;
  const buffer = new Uint32Array(1);
  for (;;) {
    if (typeof crypto === "undefined" || typeof crypto.getRandomValues !== "function") {
      return Math.floor(Math.random() * maxExclusive);
    }
    crypto.getRandomValues(buffer);
    if (buffer[0] < limit) return buffer[0] % maxExclusive;
  }
}

function shuffle(chars: string[]): string[] {
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    const temp = chars[i];
    chars[i] = chars[j];
    chars[j] = temp;
  }
  return chars;
}

type EntropyInfo = { bits: number; label: string; barClass: string; barWidth: number; tone: "error" | "warn" | "success" };

function entropyInfo(bits: number): EntropyInfo {
  const width = Math.max(4, Math.min(100, Math.round((bits / 128) * 100)));
  if (bits >= 100) return { bits, label: "很强", barClass: "bg-mint", barWidth: width, tone: "success" };
  if (bits >= 80) return { bits, label: "强", barClass: "bg-mint", barWidth: width, tone: "success" };
  if (bits >= 60) return { bits, label: "中等", barClass: "bg-sun", barWidth: width, tone: "warn" };
  if (bits >= 40) return { bits, label: "偏弱", barClass: "bg-coral", barWidth: width, tone: "warn" };
  return { bits, label: "很弱", barClass: "bg-coral", barWidth: width, tone: "error" };
}

export default function GenPasswordTool() {
  const [length, setLength] = useState(16);
  const [options, setOptions] = useState<Options>({ lower: true, upper: true, digits: true, symbols: true });
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(true);
  const [count, setCount] = useState(5);
  const [passwords, setPasswords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const poolInfo = useMemo(() => {
    const pools: string[] = [];
    if (options.lower) pools.push(POOLS.lower);
    if (options.upper) pools.push(POOLS.upper);
    if (options.digits) pools.push(POOLS.digits);
    if (options.symbols) pools.push(POOLS.symbols);

    const filtered = pools.map((pool) =>
      excludeAmbiguous ? Array.from(pool).filter((ch) => !AMBIGUOUS.has(ch)).join("") : pool,
    );
    const combined = Array.from(new Set(filtered.join(""))).join("");
    return { pools: filtered, combined, size: combined.length };
  }, [excludeAmbiguous, options]);

  const entropy = useMemo(() => (poolInfo.size > 0 ? length * Math.log2(poolInfo.size) : 0), [length, poolInfo.size]);
  const info = entropyInfo(entropy);

  const generate = useCallback(() => {
    if (poolInfo.size === 0 || poolInfo.pools.length === 0) {
      setError("请至少选择一种字符类型");
      setPasswords([]);
      return;
    }
    if (length < poolInfo.pools.length) {
      setError(`长度至少为 ${poolInfo.pools.length}，才能保证每种字符都出现`);
      setPasswords([]);
      return;
    }

    const need = length;
    const list: string[] = [];
    for (let n = 0; n < count; n += 1) {
      const chars: string[] = [];
      // 先保证每种选中的字符集至少出现一次
      for (const pool of poolInfo.pools) {
        chars.push(pool[randomInt(pool.length)]);
      }
      while (chars.length < need) {
        chars.push(poolInfo.combined[randomInt(poolInfo.combined.length)]);
      }
      list.push(shuffle(chars).join(""));
    }
    setError(null);
    setPasswords(list);
  }, [count, length, poolInfo]);

  useEffect(() => {
    generate();
  }, [generate]);

  const toggle = (key: keyof Options) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const copyAll = passwords.join("\n");

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Panel title="生成设置" desc="每次修改都会重新生成一批候选密码。">
        <div>
          <div className="flex items-end justify-between">
            <label className="label mb-0" htmlFor="pw-length">
              密码长度
            </label>
            <span className="font-[family-name:var(--font-mono)] text-[15px] font-extrabold">{length} 位</span>
          </div>
          <input
            id="pw-length"
            type="range"
            min={4}
            max={64}
            step={1}
            value={length}
            onChange={(event) => setLength(Number(event.target.value))}
            className="mt-2 w-full accent-coral"
            aria-label="密码长度"
          />
          <div className="mt-1 flex justify-between text-[10.5px] text-ink-soft">
            <span>4</span>
            <span>16</span>
            <span>32</span>
            <span>64</span>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Toggle checked={options.lower} onChange={() => toggle("lower")} label="小写字母" hint="a-z" />
          <Toggle checked={options.upper} onChange={() => toggle("upper")} label="大写字母" hint="A-Z" />
          <Toggle checked={options.digits} onChange={() => toggle("digits")} label="数字" hint="0-9" />
          <Toggle checked={options.symbols} onChange={() => toggle("symbols")} label="符号" hint="!@#$…" />
        </div>

        <div className="mt-2">
          <Toggle
            checked={excludeAmbiguous}
            onChange={setExcludeAmbiguous}
            label="排除易混字符"
            hint="0 O 1 l I | 等，抄写时不容易看错"
          />
        </div>

        <div className="mt-4">
          <div className="flex items-end justify-between">
            <label className="label mb-0" htmlFor="pw-count">
              生成数量
            </label>
            <span className="font-[family-name:var(--font-mono)] text-[15px] font-extrabold">{count} 条</span>
          </div>
          <input
            id="pw-count"
            type="range"
            min={1}
            max={20}
            step={1}
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
            className="mt-2 w-full accent-blue"
            aria-label="生成数量"
          />
        </div>

        <div className="mt-4 rounded-[18px] edge-2 bg-cream/70 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-extrabold">随机熵</span>
            <span className="font-[family-name:var(--font-mono)] text-[13px] font-extrabold">
              {entropy.toFixed(1)} bit
            </span>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full edge-2 bg-paper">
            <div
              className={cn("h-full rounded-full transition-all", info.barClass)}
              style={{ width: `${info.barWidth}%` }}
              aria-hidden="true"
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-ink-soft">
            <span>强度：{info.label}</span>
            <span>字符池 {poolInfo.size} 个 · {length} 位</span>
          </div>
        </div>

        {info.tone !== "success" && poolInfo.size > 0 ? (
          <Notice tone="warn" className="mt-3">
            当前熵值偏低，重要账号建议 16 位以上，或同时使用四类字符。
          </Notice>
        ) : null}

        <button type="button" className="btn btn-primary mt-4 w-full" onClick={generate}>
          重新生成
        </button>
      </Panel>

      <Panel
        title={`候选密码（${passwords.length}）`}
        desc="点击复制按钮即可使用。全部内容只存在于当前页面。"
        actions={
          passwords.length > 0 ? (
            <CopyButton text={copyAll} label="复制全部" ariaLabel="复制全部密码" />
          ) : null
        }
      >
        {error ? (
          <Notice tone="error" className="mb-3">
            {error}
          </Notice>
        ) : null}

        {passwords.length === 0 ? (
          <div className="rounded-[18px] edge border-dashed border-ink/30 bg-cream/40 px-4 py-12 text-center">
            <p className="text-[13.5px] font-extrabold">还没有生成密码</p>
            <p className="mt-1.5 text-[12px] text-ink-soft">选择字符类型后点「重新生成」。</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {passwords.map((password, index) => (
              <li
                key={`${index}-${password}`}
                className="flex flex-col gap-2 rounded-[16px] edge-2 bg-cream/50 px-3 py-2.5 sm:flex-row sm:items-center"
              >
                <span className="min-w-0 flex-1 break-all font-[family-name:var(--font-mono)] text-[14px] font-bold leading-snug sm:text-[15px]">
                  {password}
                </span>
                <CopyButton text={password} label="复制" className="shrink-0 self-start sm:self-auto" />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
