import { db } from "@/lib/db";
import { uid } from "@/lib/utils";

/* ==========================================================================
   已安排（计划清单）· 数据访问层
   个人站没有后台常驻进程，这里只存计划、展示与到期高亮，不做自动执行。
   ========================================================================== */

export type ScheduleRepeat = "none" | "daily" | "weekly";

export type Schedule = {
  id: string;
  userId: string;
  title: string;
  note: string;
  runAt: number;
  repeat: ScheduleRepeat;
  enabled: boolean;
  lastRunAt: number | null;
  createdAt: number;
};

export type ScheduleInput = {
  title: string;
  note?: string;
  runAt: number;
  repeat?: ScheduleRepeat;
  enabled?: boolean;
};

export type SchedulePatch = {
  title?: string;
  note?: string;
  runAt?: number;
  repeat?: ScheduleRepeat;
  enabled?: boolean;
};

export type ScheduleCounts = {
  total: number;
  enabled: number;
  due: number;
};

type ScheduleRow = {
  id: string;
  user_id: string;
  title: string;
  note: string;
  run_at: number;
  repeat: string;
  enabled: number;
  last_run_at: number | null;
  created_at: number;
};

const TITLE_MAX = 60;
const NOTE_MAX = 200;
const MIN_TIME = new Date(2000, 0, 1).getTime();
const MAX_TIME = new Date(2100, 0, 1).getTime();

function toSchedule(row: ScheduleRow): Schedule {
  const repeat: ScheduleRepeat =
    row.repeat === "daily" || row.repeat === "weekly" ? row.repeat : "none";
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    note: row.note,
    runAt: row.run_at,
    repeat,
    enabled: row.enabled === 1,
    lastRunAt: row.last_run_at,
    createdAt: row.created_at,
  };
}

export function isScheduleRepeat(value: unknown): value is ScheduleRepeat {
  return value === "none" || value === "daily" || value === "weekly";
}

function parseRunAt(raw: unknown): number | null {
  let value: number;
  if (typeof raw === "number") value = raw;
  else if (typeof raw === "string" && raw.trim()) value = new Date(raw.trim()).getTime();
  else return null;
  if (!Number.isFinite(value)) return null;
  if (value < MIN_TIME || value > MAX_TIME) return null;
  return Math.round(value);
}

export type ScheduleNormalizeResult =
  | {
      ok: true;
      value: {
        title?: string;
        note?: string;
        runAt?: number;
        repeat?: ScheduleRepeat;
        enabled?: boolean;
      };
    }
  | { ok: false; error: string };

/** 归一化已安排写入参数：POST 时 partial=false（必须带标题与时间）。 */
export function normalizeScheduleInput(
  body: Record<string, unknown>,
  partial: boolean,
): ScheduleNormalizeResult {
  const value: {
    title?: string;
    note?: string;
    runAt?: number;
    repeat?: ScheduleRepeat;
    enabled?: boolean;
  } = {};

  if ("title" in body) {
    if (typeof body.title !== "string") return { ok: false, error: "标题必须是文本" };
    const title = body.title.trim();
    if (!title) return { ok: false, error: "请填写计划标题" };
    if (title.length > TITLE_MAX) return { ok: false, error: `标题最多 ${TITLE_MAX} 个字` };
    value.title = title;
  } else if (!partial) {
    return { ok: false, error: "请填写计划标题" };
  }

  if ("note" in body) {
    if (typeof body.note !== "string") return { ok: false, error: "备注必须是文本" };
    const note = body.note.trim();
    if (note.length > NOTE_MAX) return { ok: false, error: `备注最多 ${NOTE_MAX} 个字` };
    value.note = note;
  }

  if ("runAt" in body) {
    const runAt = parseRunAt(body.runAt);
    if (runAt === null) return { ok: false, error: "运行时间不合法，请重新选择" };
    value.runAt = runAt;
  } else if (!partial) {
    return { ok: false, error: "请选择运行时间" };
  }

  if ("repeat" in body) {
    if (!isScheduleRepeat(body.repeat)) return { ok: false, error: "重复方式只能是 none、daily 或 weekly" };
    value.repeat = body.repeat;
  }

  if ("enabled" in body) {
    if (typeof body.enabled !== "boolean") return { ok: false, error: "启用状态必须是布尔值" };
    value.enabled = body.enabled;
  }

  if (partial && Object.keys(value).length === 0) {
    return { ok: false, error: "没有需要更新的字段" };
  }

  return { ok: true, value };
}

/* ------------------------------ 查询 ------------------------------ */

export function listSchedules(userId: string): Schedule[] {
  const rows = db
    .prepare("SELECT * FROM schedules WHERE user_id = ? ORDER BY run_at ASC, created_at DESC")
    .all(userId) as ScheduleRow[];
  return rows.map(toSchedule);
}

export function getSchedule(userId: string, id: string): Schedule | null {
  const row = db
    .prepare("SELECT * FROM schedules WHERE id = ? AND user_id = ?")
    .get(id, userId) as ScheduleRow | undefined;
  return row ? toSchedule(row) : null;
}

export function scheduleCounts(userId: string): ScheduleCounts {
  const now = Date.now();
  const row = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         COALESCE(SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END), 0) AS enabled,
         COALESCE(SUM(CASE WHEN enabled = 1 AND run_at <= ? THEN 1 ELSE 0 END), 0) AS due
       FROM schedules WHERE user_id = ?`,
    )
    .get(now, userId) as { total: number; enabled: number; due: number } | undefined;
  return { total: row?.total ?? 0, enabled: row?.enabled ?? 0, due: row?.due ?? 0 };
}

/* ------------------------------ 写入 ------------------------------ */

export function createSchedule(userId: string, input: ScheduleInput): Schedule {
  const id = uid("sch");
  db.prepare(
    `INSERT INTO schedules (id, user_id, title, note, run_at, repeat, enabled, last_run_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
  ).run(
    id,
    userId,
    input.title,
    input.note ?? "",
    input.runAt,
    input.repeat ?? "none",
    input.enabled === false ? 0 : 1,
    Date.now(),
  );

  const created = getSchedule(userId, id);
  if (!created) throw new Error("计划创建失败");
  return created;
}

export function updateSchedule(userId: string, id: string, patch: SchedulePatch): Schedule | null {
  const existing = getSchedule(userId, id);
  if (!existing) return null;

  const sets: string[] = [];
  const params: (string | number)[] = [];

  if (patch.title !== undefined) {
    sets.push("title = ?");
    params.push(patch.title);
  }
  if (patch.note !== undefined) {
    sets.push("note = ?");
    params.push(patch.note);
  }
  if (patch.runAt !== undefined) {
    sets.push("run_at = ?");
    params.push(patch.runAt);
  }
  if (patch.repeat !== undefined) {
    sets.push("repeat = ?");
    params.push(patch.repeat);
  }
  if (patch.enabled !== undefined) {
    sets.push("enabled = ?");
    params.push(patch.enabled ? 1 : 0);
  }

  if (sets.length === 0) return existing;

  params.push(id, userId);
  db.prepare(`UPDATE schedules SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`).run(...params);
  return getSchedule(userId, id);
}

export function deleteSchedule(userId: string, id: string): boolean {
  const result = db.prepare("DELETE FROM schedules WHERE id = ? AND user_id = ?").run(id, userId);
  return result.changes > 0;
}
