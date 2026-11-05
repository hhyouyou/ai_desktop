"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { EmptyState } from "@/components/ui/section-heading";
import { requestJson } from "@/components/user/api";
import {
  REPEAT_META,
  formatDateTime,
  formatRelativeTime,
  fromDateTimeLocal,
  nextRunAt,
  scheduleState,
  sortSchedules,
  toDateTimeLocal,
  type Schedule,
  type ScheduleRepeat,
} from "@/components/user/model";
import { cn } from "@/lib/utils";

type Props = {
  initialSchedules: Schedule[];
  serverNow: number;
};

type DeleteResult = { id: string; deleted: boolean };

export function ScheduleBoard({ initialSchedules, serverNow }: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>(() => sortSchedules(initialSchedules));
  const [now, setNow] = useState(serverNow);

  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [time, setTime] = useState("");
  const [repeat, setRepeat] = useState<ScheduleRepeat>("none");
  const [creating, setCreating] = useState(false);

  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const titleRef = useRef<HTMLInputElement | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setNow(Date.now());
    setTime(toDateTimeLocal(Date.now() + 60 * 60 * 1000));
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      window.clearInterval(timer);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  const counts = useMemo(() => {
    let enabled = 0;
    let due = 0;
    for (const schedule of schedules) {
      if (schedule.enabled) enabled += 1;
      if (schedule.enabled && schedule.runAt <= now) due += 1;
    }
    return { total: schedules.length, enabled, due };
  }, [schedules, now]);

  function flash(message: string) {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 2600);
  }

  function isBusy(id: string): boolean {
    return busyIds.includes(id);
  }

  function markBusy(id: string, busy: boolean) {
    setBusyIds((prev) => (busy ? [...prev, id] : prev.filter((item) => item !== id)));
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setError("请填写计划标题");
      titleRef.current?.focus();
      return;
    }
    const runAt = fromDateTimeLocal(time);
    if (runAt === null) {
      setError("请选择有效的运行时间");
      return;
    }

    setCreating(true);
    setError("");
    const result = await requestJson<Schedule>("/api/schedule", {
      method: "POST",
      body: { title: trimmed, note: note.trim(), runAt, repeat },
    });
    setCreating(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSchedules((prev) => sortSchedules([...prev, result.data]));
    setTitle("");
    setNote("");
    setRepeat("none");
    setTime(toDateTimeLocal(Date.now() + 60 * 60 * 1000));
    flash("已加入计划清单");
    titleRef.current?.focus();
  }

  async function toggleEnabled(schedule: Schedule) {
    if (isBusy(schedule.id)) return;
    markBusy(schedule.id, true);
    setError("");
    const result = await requestJson<Schedule>(`/api/schedule/${schedule.id}`, {
      method: "PATCH",
      body: { enabled: !schedule.enabled },
    });
    markBusy(schedule.id, false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSchedules((prev) =>
      sortSchedules(prev.map((item) => (item.id === result.data.id ? result.data : item))),
    );
    flash(result.data.enabled ? "已启用" : "已暂停");
  }

  async function removeSchedule(schedule: Schedule) {
    if (isBusy(schedule.id)) return;
    if (!window.confirm(`删除计划「${schedule.title}」？`)) return;

    markBusy(schedule.id, true);
    setError("");
    const result = await requestJson<DeleteResult>(`/api/schedule/${schedule.id}`, {
      method: "DELETE",
    });
    markBusy(schedule.id, false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSchedules((prev) => prev.filter((item) => item.id !== schedule.id));
    flash("已删除");
  }

  return (
    <div className="space-y-6">
      <div className="surface-tight flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-[13px] font-bold">
        <span>
          共 <span className="font-[family-name:var(--font-mono)] text-[15px]">{counts.total}</span> 条计划
        </span>
        <span className="text-ink-soft">启用中 {counts.enabled} 条</span>
        {counts.due > 0 ? (
          <span className="tag tag-coral">已到期 {counts.due} 条</span>
        ) : (
          <span className="tag tag-mint">暂无到期项</span>
        )}
        <span className="ml-auto text-[11.5px] font-semibold text-ink-soft">
          到期项只会高亮提醒，不会自动执行
        </span>
      </div>

      <form onSubmit={handleCreate} className="surface p-4 md:p-5" noValidate>
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.7fr)]">
            <div className="min-w-0">
              <label htmlFor="schedule-title" className="label">
                计划标题
              </label>
              <input
                id="schedule-title"
                ref={titleRef}
                className="field"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={60}
                placeholder="例如：周五交周报"
                autoComplete="off"
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="schedule-time" className="label">
                运行时间
              </label>
              <input
                id="schedule-time"
                type="datetime-local"
                className="field"
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="schedule-repeat" className="label">
                重复
              </label>
              <select
                id="schedule-repeat"
                className="field"
                value={repeat}
                onChange={(event) => {
                  const value = event.target.value;
                  setRepeat(value === "daily" || value === "weekly" ? value : "none");
                }}
              >
                <option value="none">不重复</option>
                <option value="daily">每天</option>
                <option value="weekly">每周</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="schedule-note" className="label">
              备注（可选）
            </label>
            <input
              id="schedule-note"
              className="field"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={200}
              placeholder="补充说明，例如：整理本周数据"
              autoComplete="off"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11.5px] text-ink-soft">
              时间按本地时区保存；重复计划会按周期推算「下次运行」。
            </p>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              <Icon name="plus" size={16} />
              {creating ? "添加中…" : "加入计划"}
            </button>
          </div>
        </div>
        {error ? (
          <p className="mt-3 text-[13px] font-bold text-coral" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="mt-3 text-[13px] font-bold text-mint" role="status">
            {notice}
          </p>
        ) : null}
      </form>

      {schedules.length === 0 ? (
        <EmptyState
          icon={<Icon name="clock" size={30} />}
          title="还没有计划"
          desc="把将来要做的事排在时间轴上，到期后这里会高亮提醒你。"
          action={
            <button type="button" className="btn btn-primary" onClick={() => titleRef.current?.focus()}>
              添加第一条计划
            </button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {schedules.map((schedule) => {
            const state = scheduleState(schedule, now);
            const due = state === "due";
            const next = nextRunAt(schedule, now);
            const repeatMeta = REPEAT_META[schedule.repeat];
            const busy = isBusy(schedule.id);
            return (
              <li
                key={schedule.id}
                className={cn(
                  "surface-tight bg-paper transition-all duration-200 hover:shadow-hard-sm",
                  due && "border-coral bg-coral/5",
                )}
              >
                <div className="flex flex-wrap items-start gap-3 p-3 md:p-4">
                  <span
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] edge-2",
                      due ? "bg-coral text-white" : schedule.enabled ? "bg-sun" : "bg-cream",
                    )}
                    aria-hidden="true"
                  >
                    <Icon name="clock" size={18} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words text-[15px] font-extrabold">{schedule.title}</p>
                      {state === "due" ? (
                        <span className="tag tag-coral">已到期</span>
                      ) : state === "paused" ? (
                        <span className="tag bg-cream">已暂停</span>
                      ) : (
                        <span className="tag tag-mint">等待中</span>
                      )}
                      <span className={cn("tag", repeatMeta.tagClass)}>{repeatMeta.label}</span>
                    </div>
                    {schedule.note ? (
                      <p className="mt-1 break-words text-[12.5px] text-ink-soft">{schedule.note}</p>
                    ) : null}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-soft">
                      <span className="font-bold">计划时间：{formatDateTime(schedule.runAt)}</span>
                      <span className={cn(due && "font-bold text-coral")}>
                        {due
                          ? `已到期 ${formatRelativeTime(schedule.runAt, now)}`
                          : `还有 ${formatRelativeTime(schedule.runAt, now)}`}
                      </span>
                      {schedule.enabled && next !== null ? (
                        <span>下次运行：{formatDateTime(next)}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={schedule.enabled}
                      aria-label={`${schedule.enabled ? "暂停" : "启用"}计划「${schedule.title}」`}
                      onClick={() => void toggleEnabled(schedule)}
                      disabled={busy}
                      className={cn(
                        "relative h-7 w-12 shrink-0 rounded-full edge transition-colors",
                        schedule.enabled ? "bg-mint" : "bg-cream",
                        busy && "opacity-50",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-[2px] h-[18px] w-[18px] rounded-full edge-2 bg-paper transition-all duration-150",
                          schedule.enabled ? "left-[22px]" : "left-[2px]",
                        )}
                      />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost px-2 text-coral hover:bg-coral/10"
                      onClick={() => void removeSchedule(schedule)}
                      aria-label={`删除计划「${schedule.title}」`}
                      disabled={busy}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
