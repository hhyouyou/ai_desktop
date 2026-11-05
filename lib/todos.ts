import { db } from "@/lib/db";
import { localDateKey, uid } from "@/lib/utils";

/* ==========================================================================
   待办清单 · 数据访问层
   所有查询都按 user_id 隔离，调用方先通过 getViewer() 拿到 viewer.id。
   ========================================================================== */

export type TodoPriority = 1 | 2 | 3;
export type TodoFilter = "all" | "today" | "open" | "done";

export type Todo = {
  id: string;
  userId: string;
  title: string;
  note: string;
  priority: TodoPriority;
  dueDate: string | null;
  done: boolean;
  createdAt: number;
  completedAt: number | null;
};

export type TodoInput = {
  title: string;
  note?: string;
  priority?: TodoPriority;
  dueDate?: string | null;
};

export type TodoPatch = {
  title?: string;
  note?: string;
  priority?: TodoPriority;
  dueDate?: string | null;
  done?: boolean;
};

export type TodoCounts = {
  total: number;
  open: number;
  done: number;
  today: number;
  todayOpen: number;
  overdue: number;
  completionRate: number;
};

type TodoRow = {
  id: string;
  user_id: string;
  title: string;
  note: string;
  priority: number;
  due_date: string | null;
  done: number;
  created_at: number;
  completed_at: number | null;
};

const TITLE_MAX = 120;
const NOTE_MAX = 500;
const DAY_MS = 86_400_000;

const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function toTodo(row: TodoRow): Todo {
  const priority: TodoPriority = row.priority === 1 || row.priority === 3 ? row.priority : 2;
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    note: row.note,
    priority,
    dueDate: row.due_date,
    done: row.done === 1,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

/* ------------------------------ 校验 ------------------------------ */

export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parts = value.split("-").map((part) => Number(part));
  const [year, month, day] = parts;
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function isTodoPriority(value: unknown): value is TodoPriority {
  return value === 1 || value === 2 || value === 3;
}

export type TodoDraft = {
  title?: string;
  note?: string;
  priority?: TodoPriority;
  dueDate?: string | null;
  done?: boolean;
};

export type TodoNormalizeResult = { ok: true; value: TodoDraft } | { ok: false; error: string };

/**
 * 归一化待办写入参数：POST 时 partial=false（必须带标题），PATCH 时 partial=true。
 * 返回中文错误信息，路由层直接以 400 返回。
 */
export function normalizeTodoInput(body: Record<string, unknown>, partial: boolean): TodoNormalizeResult {
  const value: TodoDraft = {};

  if ("title" in body) {
    if (typeof body.title !== "string") return { ok: false, error: "标题必须是文本" };
    const title = body.title.trim();
    if (!title) return { ok: false, error: "请填写待办标题" };
    if (title.length > TITLE_MAX) return { ok: false, error: `标题最多 ${TITLE_MAX} 个字` };
    value.title = title;
  } else if (!partial) {
    return { ok: false, error: "请填写待办标题" };
  }

  if ("note" in body) {
    if (typeof body.note !== "string") return { ok: false, error: "备注必须是文本" };
    const note = body.note.trim();
    if (note.length > NOTE_MAX) return { ok: false, error: `备注最多 ${NOTE_MAX} 个字` };
    value.note = note;
  }

  if ("priority" in body) {
    const raw = body.priority;
    const parsed = typeof raw === "string" ? Number(raw) : raw;
    if (!isTodoPriority(parsed)) return { ok: false, error: "优先级只能是 1（高）、2（中）、3（低）" };
    value.priority = parsed;
  }

  if ("dueDate" in body) {
    const raw = body.dueDate;
    if (raw === null || raw === "") {
      value.dueDate = null;
    } else if (typeof raw !== "string") {
      return { ok: false, error: "截止日期格式应为 YYYY-MM-DD" };
    } else {
      const dueDate = raw.trim();
      if (!isValidDateKey(dueDate)) return { ok: false, error: "截止日期格式应为 YYYY-MM-DD" };
      value.dueDate = dueDate;
    }
  }

  if ("done" in body) {
    if (typeof body.done !== "boolean") return { ok: false, error: "完成状态必须是布尔值" };
    value.done = body.done;
  }

  if (partial && Object.keys(value).length === 0) {
    return { ok: false, error: "没有需要更新的字段" };
  }

  return { ok: true, value };
}

/* ------------------------------ 查询 ------------------------------ */

export function listTodos(userId: string, filter: TodoFilter = "all"): Todo[] {
  const where: string[] = ["user_id = ?"];
  const params: (string | number)[] = [userId];

  if (filter === "today") {
    where.push("due_date = ?");
    params.push(localDateKey());
  } else if (filter === "open") {
    where.push("done = 0");
  } else if (filter === "done") {
    where.push("done = 1");
  }

  const rows = db
    .prepare(
      `SELECT * FROM todos WHERE ${where.join(" AND ")}
       ORDER BY done ASC, priority ASC, created_at DESC`,
    )
    .all(...params) as TodoRow[];

  return rows.map(toTodo);
}

export function getTodo(userId: string, id: string): Todo | null {
  const row = db.prepare("SELECT * FROM todos WHERE id = ? AND user_id = ?").get(id, userId) as
    | TodoRow
    | undefined;
  return row ? toTodo(row) : null;
}

export function todoCounts(userId: string): TodoCounts {
  const today = localDateKey();
  const row = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         COALESCE(SUM(CASE WHEN done = 0 THEN 1 ELSE 0 END), 0) AS open,
         COALESCE(SUM(CASE WHEN done = 1 THEN 1 ELSE 0 END), 0) AS done,
         COALESCE(SUM(CASE WHEN due_date = ? THEN 1 ELSE 0 END), 0) AS today,
         COALESCE(SUM(CASE WHEN due_date = ? AND done = 0 THEN 1 ELSE 0 END), 0) AS today_open,
         COALESCE(SUM(CASE WHEN done = 0 AND due_date IS NOT NULL AND due_date < ? THEN 1 ELSE 0 END), 0) AS overdue
       FROM todos WHERE user_id = ?`,
    )
    .get(today, today, today, userId) as
    | { total: number; open: number; done: number; today: number; today_open: number; overdue: number }
    | undefined;

  const total = row?.total ?? 0;
  const done = row?.done ?? 0;
  return {
    total,
    open: row?.open ?? 0,
    done,
    today: row?.today ?? 0,
    todayOpen: row?.today_open ?? 0,
    overdue: row?.overdue ?? 0,
    completionRate: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

/* ------------------------------ 写入 ------------------------------ */

export function createTodo(userId: string, input: TodoInput): Todo {
  const id = uid("todo");
  const now = Date.now();
  db.prepare(
    `INSERT INTO todos (id, user_id, title, note, priority, due_date, done, created_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, NULL)`,
  ).run(id, userId, input.title, input.note ?? "", input.priority ?? 2, input.dueDate ?? null, now);

  const created = getTodo(userId, id);
  if (!created) throw new Error("待办创建失败");
  return created;
}

export function updateTodo(userId: string, id: string, patch: TodoPatch): Todo | null {
  const existing = getTodo(userId, id);
  if (!existing) return null;

  const sets: string[] = [];
  const params: (string | number | null)[] = [];

  if (patch.title !== undefined) {
    sets.push("title = ?");
    params.push(patch.title);
  }
  if (patch.note !== undefined) {
    sets.push("note = ?");
    params.push(patch.note);
  }
  if (patch.priority !== undefined) {
    sets.push("priority = ?");
    params.push(patch.priority);
  }
  if (patch.dueDate !== undefined) {
    sets.push("due_date = ?");
    params.push(patch.dueDate);
  }
  if (patch.done !== undefined) {
    sets.push("done = ?");
    params.push(patch.done ? 1 : 0);
    if (patch.done && existing.completedAt === null) {
      sets.push("completed_at = ?");
      params.push(Date.now());
    }
    if (!patch.done) sets.push("completed_at = NULL");
  }

  if (sets.length === 0) return existing;

  params.push(id, userId);
  db.prepare(`UPDATE todos SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`).run(...params);
  return getTodo(userId, id);
}

export function deleteTodo(userId: string, id: string): boolean {
  const result = db.prepare("DELETE FROM todos WHERE id = ? AND user_id = ?").run(id, userId);
  return result.changes > 0;
}

export function clearTodos(userId: string): number {
  const result = db.prepare("DELETE FROM todos WHERE user_id = ?").run(userId);
  return result.changes;
}

/* ------------------------------ 分析 ------------------------------ */

export type TodoAnalysisDay = {
  key: string;
  label: string;
  weekday: string;
  created: number;
  completed: number;
};

export type TodoPriorityBucket = {
  priority: TodoPriority;
  count: number;
};

export type TodoWeekdayBucket = {
  weekday: number;
  label: string;
  count: number;
};

export type TodoAnalysis = {
  hasData: boolean;
  total: number;
  open: number;
  done: number;
  overdue: number;
  completionRate: number;
  days: TodoAnalysisDay[];
  priority: TodoPriorityBucket[];
  weekday: TodoWeekdayBucket[];
  bestWeekday: TodoWeekdayBucket | null;
  avgCompletionHours: number | null;
  streakDays: number;
  insights: string[];
};

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} 分钟`;
  if (hours < 48) return `${hours.toFixed(1)} 小时`;
  return `${(hours / 24).toFixed(1)} 天`;
}

export function analyzeTodos(userId: string): TodoAnalysis {
  const todos = listTodos(userId, "all");
  const counts = todoCounts(userId);
  const nowMs = Date.now();

  const today = new Date();
  const dayKeys: string[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    dayKeys.push(localDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)));
  }

  const createdMap = new Map<string, number>(dayKeys.map((key) => [key, 0]));
  const completedMap = new Map<string, number>(dayKeys.map((key) => [key, 0]));
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
  const completedDays = new Set<string>();
  let completionMs = 0;
  let completionSamples = 0;
  let last7Completed = 0;
  let prev7Completed = 0;

  for (const todo of todos) {
    const createdKey = localDateKey(new Date(todo.createdAt));
    if (createdMap.has(createdKey)) createdMap.set(createdKey, (createdMap.get(createdKey) ?? 0) + 1);

    if (todo.completedAt === null) continue;
    const completedDate = new Date(todo.completedAt);
    const completedKey = localDateKey(completedDate);
    completedDays.add(completedKey);
    if (completedMap.has(completedKey)) {
      completedMap.set(completedKey, (completedMap.get(completedKey) ?? 0) + 1);
    }
    weekdayCounts[completedDate.getDay()] += 1;
    completionMs += Math.max(0, todo.completedAt - todo.createdAt);
    completionSamples += 1;

    if (todo.completedAt >= nowMs - 7 * DAY_MS) last7Completed += 1;
    else if (todo.completedAt >= nowMs - 14 * DAY_MS) prev7Completed += 1;
  }

  const days: TodoAnalysisDay[] = dayKeys.map((key) => {
    const parts = key.split("-").map((part) => Number(part));
    const [year, month, day] = parts;
    const date = new Date(year, month - 1, day);
    return {
      key,
      label: `${month}/${day}`,
      weekday: WEEKDAY_LABELS[date.getDay()],
      created: createdMap.get(key) ?? 0,
      completed: completedMap.get(key) ?? 0,
    };
  });

  const priority: TodoPriorityBucket[] = [1, 2, 3].map((item) => ({
    priority: item as TodoPriority,
    count: todos.filter((todo) => todo.priority === item).length,
  }));

  const weekday: TodoWeekdayBucket[] = WEEKDAY_LABELS.map((label, index) => ({
    weekday: index,
    label,
    count: weekdayCounts[index] ?? 0,
  }));

  let bestWeekday: TodoWeekdayBucket | null = null;
  for (const bucket of weekday) {
    if (bucket.count > 0 && (bestWeekday === null || bucket.count > bestWeekday.count)) {
      bestWeekday = bucket;
    }
  }

  // 连续完成天数：从今天（或昨天，如果今天还没完成）往前数
  let streakDays = 0;
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!completedDays.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (streakDays < 400 && completedDays.has(localDateKey(cursor))) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const avgCompletionHours =
    completionSamples === 0 ? null : completionMs / completionSamples / 3_600_000;

  const insights: string[] = [];
  if (counts.total > 0) {
    if (last7Completed + prev7Completed >= 2) {
      if (last7Completed > prev7Completed) {
        insights.push(`近 7 天完成 ${last7Completed} 条，比上一周多 ${last7Completed - prev7Completed} 条。`);
      } else if (last7Completed < prev7Completed) {
        insights.push(`近 7 天完成 ${last7Completed} 条，比上一周少 ${prev7Completed - last7Completed} 条。`);
      } else {
        insights.push(`近 7 天与上一周都完成了 ${last7Completed} 条，节奏稳定。`);
      }
    }

    if (bestWeekday && bestWeekday.count >= 2) {
      insights.push(`${bestWeekday.label}是你最常完成任务的一天，累计 ${bestWeekday.count} 条。`);
    }

    if (counts.overdue > 0) {
      insights.push(`有 ${counts.overdue} 条待办已过截止日期，建议先处理这些。`);
    } else if (counts.done === 0) {
      insights.push("还没有完成的记录，先挑一条 5 分钟内能做完的小事开始。");
    } else if (counts.completionRate >= 60) {
      insights.push(`整体完成率 ${counts.completionRate}%，收尾节奏不错。`);
    } else {
      insights.push(`整体完成率 ${counts.completionRate}%，把大任务拆成更小的待办会更容易推进。`);
    }

    if (avgCompletionHours !== null && insights.length < 3) {
      insights.push(`平均每 ${formatHours(avgCompletionHours)} 完成一条待办。`);
    }

    if (insights.length < 2) {
      insights.push(`当前共 ${counts.total} 条待办：${counts.open} 条未完成、${counts.done} 条已完成。`);
    }
    if (insights.length < 2) {
      insights.push("给待办加上截止日期，这里能看到更细的时间节奏。");
    }
  }

  return {
    hasData: counts.total > 0,
    total: counts.total,
    open: counts.open,
    done: counts.done,
    overdue: counts.overdue,
    completionRate: counts.completionRate,
    days,
    priority,
    weekday,
    bestWeekday,
    avgCompletionHours,
    streakDays,
    insights: insights.slice(0, 3),
  };
}
