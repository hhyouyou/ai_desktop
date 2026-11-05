import { PRIORITY_META } from "@/components/user/model";
import type {
  TodoAnalysisDay,
  TodoPriorityBucket,
  TodoWeekdayBucket,
} from "@/lib/todos";

/* ==========================================================================
   待办分析 · 手写 SVG / CSS 图表（不依赖任何图表库）
   ========================================================================== */

const INK = "var(--color-ink)";
const CREAM = "var(--color-cream)";
const SUN = "var(--color-sun)";
const MINT = "var(--color-mint)";
const BLUE = "var(--color-blue)";
const CORAL = "var(--color-coral)";
const SOFT = "var(--color-ink-soft)";

/** 完成率环形图 */
export function CompletionRing({
  rate,
  done,
  total,
}: {
  rate: number;
  done: number;
  total: number;
}) {
  const safeRate = Math.max(0, Math.min(100, rate));
  const size = 200;
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (safeRate / 100) * circumference;

  return (
    <div className="relative mx-auto h-[190px] w-[190px]" role="img" aria-label={`完成率 ${safeRate}%`}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={CREAM}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={MINT}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-[family-name:var(--font-display)] text-[40px] leading-none">{safeRate}%</span>
        <span className="mt-1 text-[12px] font-bold text-ink-soft">
          {done} / {total} 已完成
        </span>
      </div>
    </div>
  );
}

/** 近 7 天每日新增 / 完成柱状图 */
export function DailyBars({ days }: { days: TodoAnalysisDay[] }) {
  const width = 600;
  const height = 250;
  const padLeft = 34;
  const padRight = 14;
  const padTop = 22;
  const padBottom = 42;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const maxValue = Math.max(1, ...days.map((day) => Math.max(day.created, day.completed)));
  const slot = plotWidth / Math.max(1, days.length);
  const barWidth = Math.min(16, slot / 3);
  const ticks = [0, 0.5, 1];

  const y = (value: number) => padTop + plotHeight - (value / maxValue) * plotHeight;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="近 7 天每日新增与完成待办数量柱状图"
      >
        {ticks.map((ratio) => {
          const value = Math.round(maxValue * ratio);
          const yPos = y(value);
          return (
            <g key={ratio}>
              <line x1={padLeft} y1={yPos} x2={width - padRight} y2={yPos} stroke={CREAM} strokeWidth={2} />
              <text x={padLeft - 8} y={yPos + 4} textAnchor="end" fontSize={10.5} fill={SOFT} fontWeight={700}>
                {value}
              </text>
            </g>
          );
        })}

        {days.map((day, index) => {
          const center = padLeft + index * slot + slot / 2;
          const createdHeight = Math.max(day.created > 0 ? 3 : 0, (day.created / maxValue) * plotHeight);
          const completedHeight = Math.max(day.completed > 0 ? 3 : 0, (day.completed / maxValue) * plotHeight);
          return (
            <g key={day.key}>
              <rect
                x={center - barWidth - 2}
                y={padTop + plotHeight - createdHeight}
                width={barWidth}
                height={createdHeight}
                rx={4}
                fill={SUN}
                stroke={INK}
                strokeWidth={2}
              />
              <rect
                x={center + 2}
                y={padTop + plotHeight - completedHeight}
                width={barWidth}
                height={completedHeight}
                rx={4}
                fill={MINT}
                stroke={INK}
                strokeWidth={2}
              />
              {day.created > 0 ? (
                <text
                  x={center - barWidth / 2 - 2}
                  y={padTop + plotHeight - createdHeight - 6}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={800}
                  fill={SOFT}
                >
                  {day.created}
                </text>
              ) : null}
              {day.completed > 0 ? (
                <text
                  x={center + barWidth / 2 + 2}
                  y={padTop + plotHeight - completedHeight - 6}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={800}
                  fill={SOFT}
                >
                  {day.completed}
                </text>
              ) : null}
              <text
                x={center}
                y={height - 22}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill={INK}
              >
                {day.label}
              </text>
              <text
                x={center}
                y={height - 7}
                textAnchor="middle"
                fontSize={9.5}
                fill={SOFT}
              >
                {day.weekday}
              </text>
            </g>
          );
        })}

        <line
          x1={padLeft}
          y1={padTop + plotHeight}
          x2={width - padRight}
          y2={padTop + plotHeight}
          stroke={INK}
          strokeWidth={2.5}
        />
      </svg>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-[12px] font-bold text-ink-soft">
        <span className="flex items-center gap-2">
          <span className="inline-block h-3.5 w-3.5 rounded-[4px] edge-2 bg-sun" aria-hidden="true" />
          新增
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3.5 w-3.5 rounded-[4px] edge-2 bg-mint" aria-hidden="true" />
          完成
        </span>
      </div>
    </div>
  );
}

/** 优先级分布 · 水平条（CSS） */
export function PriorityBars({ buckets }: { buckets: TodoPriorityBucket[] }) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  return (
    <ul className="space-y-3.5">
      {buckets.map((bucket) => {
        const meta = PRIORITY_META[bucket.priority];
        const width = total === 0 ? 0 : Math.round((bucket.count / total) * 100);
        return (
          <li key={bucket.priority}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-[12.5px] font-bold">
              <span className="flex items-center gap-2">
                <span className={`inline-block h-3 w-3 rounded-[3px] edge-2 ${meta.barClass}`} aria-hidden="true" />
                {meta.label}
                <span className="text-[11px] font-semibold text-ink-soft">{meta.description}</span>
              </span>
              <span className="font-[family-name:var(--font-mono)] text-[12px] text-ink-soft">
                {bucket.count} 条 · {width}%
              </span>
            </div>
            <div className="h-4 overflow-hidden rounded-full edge-2 bg-cream" role="img" aria-label={`${meta.label} ${bucket.count} 条`}>
              <div className={`h-full rounded-full ${meta.barClass}`} style={{ width: `${width}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** 完成任务的工作日分布 · 竖直条（SVG） */
export function WeekdayBars({ buckets }: { buckets: TodoWeekdayBucket[] }) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const width = 420;
  const height = 200;
  const padBottom = 30;
  const padTop = 24;
  const slot = width / buckets.length;
  const plotHeight = height - padBottom - padTop;
  const maxValue = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const colors = [SUN, MINT, BLUE, CORAL, SUN, MINT, BLUE];

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="完成任务的工作日分布"
      >
        {buckets.map((bucket, index) => {
          const center = slot * index + slot / 2;
          const barHeight = bucket.count === 0 ? 0 : Math.max(4, (bucket.count / maxValue) * plotHeight);
          const barWidth = Math.min(30, slot * 0.5);
          return (
            <g key={bucket.weekday}>
              <rect
                x={center - barWidth / 2}
                y={padTop + plotHeight - barHeight}
                width={barWidth}
                height={barHeight}
                rx={6}
                fill={colors[index] ?? SUN}
                stroke={INK}
                strokeWidth={2}
              />
              {bucket.count > 0 ? (
                <text
                  x={center}
                  y={padTop + plotHeight - barHeight - 6}
                  textAnchor="middle"
                  fontSize={10.5}
                  fontWeight={800}
                  fill={SOFT}
                >
                  {bucket.count}
                </text>
              ) : null}
              <text x={center} y={height - 10} textAnchor="middle" fontSize={10} fill={SOFT} fontWeight={700}>
                {bucket.label.replace("周", "")}
              </text>
            </g>
          );
        })}
        <line
          x1={0}
          y1={padTop + plotHeight}
          x2={width}
          y2={padTop + plotHeight}
          stroke={INK}
          strokeWidth={2.5}
        />
      </svg>
      <p className="mt-2 text-[11.5px] text-ink-soft">横轴为周一至周日，共 {total} 条完成记录。</p>
    </div>
  );
}

/** 小程序用不到，但保留一个安全的时间格式辅助，避免各页面重复实现。 */
export function formatHoursLabel(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} 分钟`;
  if (hours < 48) return `${hours.toFixed(1)} 小时`;
  return `${(hours / 24).toFixed(1)} 天`;
}

