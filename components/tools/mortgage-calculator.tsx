"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Field, Notice, Panel, Segmented, StatTile } from "./ui";

type RepayMode = "equal" | "principal";

type YearPoint = { year: number; principal: number; interest: number; balance: number };

type PlanResult = {
  monthly: number;
  firstMonth: number;
  lastMonth: number;
  totalInterest: number;
  totalPayment: number;
  interestRatio: number;
  monthlyDecrease: number;
  years: YearPoint[];
};

function computePlan(amount: number, annualRate: number, years: number, mode: RepayMode): PlanResult {
  const months = Math.max(1, Math.round(years * 12));
  const monthlyRate = annualRate / 100 / 12;
  const equalMonthly =
    monthlyRate === 0
      ? amount / months
      : (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  const principalPart = amount / months;

  let balance = amount;
  let totalInterest = 0;
  let firstMonth = 0;
  let lastMonth = 0;
  const yearPoints: YearPoint[] = [];

  for (let month = 1; month <= months; month += 1) {
    const interest = balance * monthlyRate;
    const principal = mode === "equal" ? equalMonthly - interest : principalPart;
    const payment = principal + interest;

    if (month === 1) firstMonth = payment;
    if (month === months) lastMonth = payment;

    balance = Math.max(0, balance - principal);
    totalInterest += interest;

    const yearIndex = Math.ceil(month / 12) - 1;
    const point = yearPoints[yearIndex];
    if (point) {
      point.principal += principal;
      point.interest += interest;
      point.balance = balance;
    } else {
      yearPoints[yearIndex] = {
        year: yearIndex + 1,
        principal,
        interest,
        balance,
      };
    }
  }

  return {
    monthly: equalMonthly,
    firstMonth,
    lastMonth,
    totalInterest,
    totalPayment: amount + totalInterest,
    interestRatio: amount > 0 ? (totalInterest / amount) * 100 : 0,
    monthlyDecrease: firstMonth - lastMonth,
    years: yearPoints,
  };
}

function money(value: number): string {
  return `¥${Math.round(value).toLocaleString("zh-CN")}`;
}

function wan(value: number): string {
  if (value >= 10000) return `${(value / 10000).toFixed(1)} 万`;
  return `${Math.round(value).toLocaleString("zh-CN")}`;
}

function parseNumber(text: string): number {
  const value = Number(text.trim());
  return Number.isFinite(value) ? value : Number.NaN;
}

const CHART_WIDTH = 640;
const CHART_HEIGHT = 200;
const PAD_LEFT = 48;
const PAD_RIGHT = 10;
const PAD_TOP = 14;
const PAD_BOTTOM = 26;

function AmortizationChart({ points }: { points: YearPoint[] }) {
  if (points.length === 0) return null;
  const innerWidth = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
  const innerHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const slot = innerWidth / points.length;
  const gap = points.length > 20 ? 2 : 4;
  const barWidth = Math.max(3, slot - gap);
  const maxTotal = Math.max(...points.map((point) => point.principal + point.interest), 1);
  const ticks = [0, 0.5, 1];
  const labelEvery = points.length <= 12 ? 1 : Math.ceil(points.length / 8);

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-extrabold">每年还款构成</p>
        <div className="flex items-center gap-3 text-[10.5px] font-bold text-ink-soft">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-[2px] border border-ink bg-mint" />
            本金
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-[2px] border border-ink bg-coral" />
            利息
          </span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="mt-1 h-auto w-full"
        role="img"
        aria-label="每年偿还本金与利息构成柱状图"
      >
        {ticks.map((tick) => {
          const y = PAD_TOP + innerHeight * (1 - tick);
          return (
            <g key={tick}>
              <line
                x1={PAD_LEFT}
                y1={y}
                x2={CHART_WIDTH - PAD_RIGHT}
                y2={y}
                stroke="#14110F"
                strokeOpacity={tick === 0 ? 0.6 : 0.15}
                strokeWidth={tick === 0 ? 2 : 1}
                strokeDasharray={tick === 0 ? undefined : "4 4"}
              />
              <text x={PAD_LEFT - 6} y={y + 3.5} textAnchor="end" fontSize="10" fill="#58514A">
                {wan(maxTotal * tick)}
              </text>
            </g>
          );
        })}

        {points.map((point, index) => {
          const total = point.principal + point.interest;
          const height = (total / maxTotal) * innerHeight;
          const interestHeight = (point.interest / maxTotal) * innerHeight;
          const principalHeight = Math.max(0, height - interestHeight);
          const x = PAD_LEFT + slot * index + gap / 2;
          const baseY = PAD_TOP + innerHeight;
          return (
            <g key={point.year}>
              <rect
                x={x}
                y={baseY - interestHeight}
                width={barWidth}
                height={Math.max(interestHeight, 0.5)}
                fill="#FF5A36"
                stroke="#14110F"
                strokeWidth={1}
              />
              <rect
                x={x}
                y={baseY - interestHeight - principalHeight}
                width={barWidth}
                height={Math.max(principalHeight, 0.5)}
                fill="#00C48C"
                stroke="#14110F"
                strokeWidth={1}
              />
              {index % labelEvery === 0 || index === points.length - 1 ? (
                <text
                  x={x + barWidth / 2}
                  y={baseY + 14}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#58514A"
                >
                  {point.year}
                </text>
              ) : null}
            </g>
          );
        })}
        <text
          x={CHART_WIDTH - PAD_RIGHT}
          y={CHART_HEIGHT - 3}
          textAnchor="end"
          fontSize="9.5"
          fill="#58514A"
        >
          年
        </text>
      </svg>
    </div>
  );
}

export default function MortgageCalculatorTool() {
  const [amountText, setAmountText] = useState("100");
  const [rateText, setRateText] = useState("3.1");
  const [yearsText, setYearsText] = useState("30");
  const [mode, setMode] = useState<RepayMode>("equal");

  const amountWan = parseNumber(amountText);
  const rate = parseNumber(rateText);
  const years = parseNumber(yearsText);

  const validation = useMemo(() => {
    if (!Number.isFinite(amountWan) || amountWan <= 0) return "请输入大于 0 的贷款金额";
    if (amountWan > 100000) return "贷款金额过大，请不超过 100000 万元";
    if (!Number.isFinite(rate) || rate < 0) return "年利率不能为负数";
    if (rate > 24) return "年利率请不超过 24%";
    if (!Number.isFinite(years) || years <= 0) return "请输入大于 0 的贷款年限";
    if (years > 40) return "贷款年限请不超过 40 年";
    return null;
  }, [amountWan, rate, years]);

  const result = useMemo(() => {
    if (validation) return null;
    return computePlan(amountWan * 10000, rate, years, mode);
  }, [amountWan, mode, rate, validation, years]);

  const comparison = useMemo(() => {
    if (validation) return null;
    const equal = computePlan(amountWan * 10000, rate, years, "equal");
    const principal = computePlan(amountWan * 10000, rate, years, "principal");
    return { equalInterest: equal.totalInterest, principalInterest: principal.totalInterest };
  }, [amountWan, rate, validation, years]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <Panel title="贷款信息" desc="金额单位为万元，利率为年化利率。">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="贷款金额（万元）" htmlFor="loan-amount">
            <input
              id="loan-amount"
              className="field"
              type="number"
              min={1}
              max={100000}
              step={1}
              inputMode="decimal"
              value={amountText}
              onChange={(event) => setAmountText(event.target.value)}
            />
          </Field>
          <Field label="年利率（%）" htmlFor="loan-rate">
            <input
              id="loan-rate"
              className="field"
              type="number"
              min={0}
              max={24}
              step={0.01}
              inputMode="decimal"
              value={rateText}
              onChange={(event) => setRateText(event.target.value)}
            />
          </Field>
          <Field label="贷款年限（年）" htmlFor="loan-years">
            <input
              id="loan-years"
              className="field"
              type="number"
              min={1}
              max={40}
              step={1}
              inputMode="numeric"
              value={yearsText}
              onChange={(event) => setYearsText(event.target.value)}
            />
          </Field>
          <div>
            <p className="label">年限快捷</p>
            <div className="flex flex-wrap gap-1.5">
              {[10, 20, 25, 30].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setYearsText(String(preset))}
                  className={cn(
                    "rounded-full edge-2 px-3 py-1.5 text-[12.5px] font-extrabold transition-colors",
                    yearsText === String(preset) ? "bg-ink text-paper" : "bg-paper hover:bg-cream",
                  )}
                  aria-pressed={yearsText === String(preset)}
                >
                  {preset} 年
                </button>
              ))}
            </div>
          </div>
        </div>

        <Segmented<RepayMode>
          className="mt-4"
          label="还款方式"
          value={mode}
          onChange={setMode}
          options={[
            { value: "equal", label: "等额本息（每月相同）" },
            { value: "principal", label: "等额本金（前高后低）" },
          ]}
        />

        {validation ? (
          <Notice tone="error" className="mt-4">
            {validation}
          </Notice>
        ) : null}

        <div className="mt-4 rounded-[18px] edge-2 bg-cream/60 p-3 text-[12px] leading-relaxed text-ink-soft">
          <p className="font-extrabold text-ink">两种方式怎么选</p>
          <p className="mt-1">
            等额本息月供固定、前期压力小；等额本金前期还得多、总利息更少。收入稳定但预算紧时选前者，
            想省利息且能承担前期月供时选后者。
          </p>
        </div>
      </Panel>

      <Panel title="计算结果" desc={result ? `${mode === "equal" ? "等额本息" : "等额本金"} · ${years} 年（${years * 12} 期）` : "填写左侧信息后自动计算。"}>
        {!result ? (
          <div className="rounded-[18px] edge border-dashed border-ink/30 bg-cream/40 px-4 py-12 text-center">
            <p className="text-[13.5px] font-extrabold">还没有结果</p>
            <p className="mt-1.5 text-[12px] text-ink-soft">修正左侧输入后会自动重新计算。</p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {mode === "equal" ? (
                <StatTile value={money(result.monthly)} label="每月月供" accent="coral" />
              ) : (
                <StatTile value={money(result.firstMonth)} label="首月月供" accent="coral" />
              )}
              <StatTile value={money(result.totalInterest)} label="利息总额" accent="sun" />
              <StatTile value={money(result.totalPayment)} label="还款总额" accent="mint" />
              <StatTile value={`${result.interestRatio.toFixed(1)}%`} label="利息 / 本金" accent="sky" />
            </div>

            {mode === "principal" ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <StatTile value={money(result.lastMonth)} label="末月月供" accent="cream" />
                <StatTile value={money(result.monthlyDecrease)} label="月供降幅（首月 − 末月）" accent="cream" />
              </div>
            ) : null}

            {comparison ? (
              <Notice tone="info" className="mt-3">
                {comparison.principalInterest < comparison.equalInterest
                  ? `同条件下等额本金比等额本息少付利息 ${money(
                      comparison.equalInterest - comparison.principalInterest,
                    )}，代价是前期月供更高。`
                  : "当前利率下两种方式利息接近，可按月供承受能力选择。"}
              </Notice>
            ) : null}

            <div className="mt-4 rounded-[18px] edge-2 bg-paper p-3">
              <AmortizationChart points={result.years} />
            </div>

            <Notice tone="warn" className="mt-3">
              结果按整月、固定利率估算，未考虑提前还款、利率调整、公积金组合贷与银行手续费，仅供预算参考。
            </Notice>
          </div>
        )}
      </Panel>
    </div>
  );
}
