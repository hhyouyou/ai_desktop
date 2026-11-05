/**
 * 用户模块的共享「展示层」模型：
 * - 只做类型转发与纯函数，不引入数据库 / node 专有 API，客户端组件可以安全引用。
 * - 数据类型的事实来源仍是 lib/todos.ts 与 lib/schedules.ts（仅 type 引用，编译期擦除）。
 */

import { localDateKey } from "@/lib/utils";
import type { Todo, TodoCounts, TodoFilter, TodoPriority } from "@/lib/todos";
import type { Schedule, ScheduleRepeat } from "@/lib/schedules";

export type { Todo, TodoCounts, TodoFilter, TodoPriority, TodoInput, TodoPatch, TodoAnalysis } from "@/lib/todos";
export type {
  Schedule,
  ScheduleCounts,
  ScheduleInput,
  SchedulePatch,
  ScheduleRepeat,
} from "@/lib/schedules";

/* ------------------------------ 待办展示 ------------------------------ */

export const PRIORITY_META: Record<
  TodoPriority,
  { short: string; label: string; barClass: string; tagClass: string; description: string }
> = {
  1: { short: "高", label: "高优先级", barClass: "bg-coral", tagClass: "tag-coral", description: "今天就做" },
  2: { short: "中", label: "中优先级", barClass: "bg-sun", tagClass: "tag-sun", description: "本周内做" },
  3: { short: "低", label: "低优先级", barClass: "bg-mint", tagClass: "tag-mint", description: "有空再做" },
};

export const TODO_FILTERS: { key: TodoFilter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "today", label: "今天" },
  { key: "open", label: "未完成" },
  { key: "done", label: "已完成" },
];

export function isTodoFilter(value: unknown): value is TodoFilter {
  return value === "all" || value === "today" || value === "open" || value === "done";
}

export function compareTodos(a: Todo, b: Todo): number {
  if (a.done !== b.done) return a.done ? 1 : -1;
  if (a.priority !== b.priority) return a.priority - b.priority;
  return b.createdAt - a.createdAt;
}

export function sortTodos(list: Todo[]): Todo[] {
  return [...list].sort(compareTodos);
}

export function matchesFilter(todo: Todo, filter: TodoFilter, today: string = localDateKey()): boolean {
  if (filter === "today") return todo.dueDate === today;
  if (filter === "open") return !todo.done;
  if (filter === "done") return todo.done;
  return true;
}

export function filterTodos(
  list: Todo[],
  filter: TodoFilter,
  today: string = localDateKey(),
): Todo[] {
  return sortTodos(list.filter((todo) => matchesFilter(todo, filter, today)));
}

export function countTodos(list: Todo[], today: string = localDateKey()): TodoCounts {
  let open = 0;
  let done = 0;
  let todayCount = 0;
  let todayOpen = 0;
  let overdue = 0;
  for (const todo of list) {
    if (todo.done) done += 1;
    else open += 1;
    if (todo.dueDate === today) {
      todayCount += 1;
      if (!todo.done) todayOpen += 1;
    }
    if (!todo.done && todo.dueDate !== null && todo.dueDate < today) overdue += 1;
  }
  const total = list.length;
  return {
    total,
    open,
    done,
    today: todayCount,
    todayOpen,
    overdue,
    completionRate: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

export type DueInfo = { text: string; overdue: boolean; isToday: boolean };

function diffDays(fromKey: string, toKey: string): number {
  const from = Date.parse(`${fromKey}T00:00:00`);
  const to = Date.parse(`${toKey}T00:00:00`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((from - to) / 86_400_000);
}

/** 把 2026-10-19 转成「10月19日」，今天/明天等相对说法单独处理。 */
export function formatDateKey(key: string): string {
  const parts = key.split("-");
  if (parts.length !== 3) return key;
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isInteger(month) || !Number.isInteger(day)) return key;
  return `${month}月${day}日`;
}

export function dueInfo(todo: Todo, today: string = localDateKey()): DueInfo | null {
  if (todo.dueDate === null) return null;
  const diff = diffDays(todo.dueDate, today);
  if (diff < 0) return { text: `${formatDateKey(todo.dueDate)} · 逾期 ${-diff} 天`, overdue: true, isToday: false };
  if (diff === 0) return { text: "今天到期", overdue: false, isToday: true };
  if (diff === 1) return { text: "明天到期", overdue: false, isToday: false };
  return { text: `${formatDateKey(todo.dueDate)} 到期`, overdue: false, isToday: false };
}

/* ------------------------------ 本地偏好 ------------------------------ */

export const LIST_DENSITY_KEY = "bs_todo_density";
export const DEFAULT_FILTER_KEY = "bs_todo_default_filter";

export type ListDensity = "comfortable" | "compact";

export const DENSITY_OPTIONS: { key: ListDensity; label: string; hint: string }[] = [
  { key: "comfortable", label: "舒适", hint: "每行留白更多" },
  { key: "compact", label: "紧凑", hint: "一屏看到更多条" },
];

export function isListDensity(value: unknown): value is ListDensity {
  return value === "comfortable" || value === "compact";
}

/* ------------------------------ 已安排展示 ------------------------------ */

export const REPEAT_META: Record<ScheduleRepeat, { label: string; tagClass: string }> = {
  none: { label: "不重复", tagClass: "tag-sun" },
  daily: { label: "每天", tagClass: "tag-blue" },
  weekly: { label: "每周", tagClass: "tag-violet" },
};

export type ScheduleState = "paused" | "due" | "upcoming";

export function scheduleState(schedule: Schedule, now: number): ScheduleState {
  if (!schedule.enabled) return "paused";
  if (schedule.runAt <= now) return "due";
  return "upcoming";
}

/** 下一次运行时间（毫秒）：不重复且已过期返回 null；暂停返回 null。 */
export function nextRunAt(schedule: Schedule, now: number): number | null {
  if (!schedule.enabled) return null;
  if (schedule.runAt >= now) return schedule.runAt;
  if (schedule.repeat === "none") return null;
  const step = schedule.repeat === "daily" ? 86_400_000 : 7 * 86_400_000;
  const steps = Math.ceil((now - schedule.runAt) / step);
  return schedule.runAt + steps * step;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** 毫秒 → datetime-local 输入框需要的本地时间字符串。 */
export function toDateTimeLocal(ms: number): string {
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(
    date.getHours(),
  )}:${pad2(date.getMinutes())}`;
}

/** datetime-local 字符串 → 毫秒（按本地时区解析），非法返回 null。 */
export function fromDateTimeLocal(value: string): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function formatDateTime(ms: number): string {
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return "-";
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  const dayPart = sameYear
    ? `${date.getMonth() + 1}月${date.getDate()}日`
    : `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  return `${dayPart} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** 距离某个时间点的中文描述，例如「2 小时后」「3 天前」。 */
export function formatRelativeTime(ms: number, now: number): string {
  const diff = ms - now;
  const abs = Math.abs(diff);
  const suffix = diff >= 0 ? "后" : "前";
  if (abs < 60_000) return "刚刚";
  if (abs < 3_600_000) return `${Math.floor(abs / 60_000)} 分钟${suffix}`;
  if (abs < 86_400_000) return `${Math.floor(abs / 3_600_000)} 小时${suffix}`;
  return `${Math.floor(abs / 86_400_000)} 天${suffix}`;
}

export function compareSchedules(a: Schedule, b: Schedule): number {
  if (a.runAt !== b.runAt) return a.runAt - b.runAt;
  return b.createdAt - a.createdAt;
}

export function sortSchedules(list: Schedule[]): Schedule[] {
  return [...list].sort(compareSchedules);
}

/* ------------------------------ API 返回约定 ------------------------------ */

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };
