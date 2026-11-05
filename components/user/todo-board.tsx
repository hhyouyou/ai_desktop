"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { EmptyState, Stat } from "@/components/ui/section-heading";
import { requestJson } from "@/components/user/api";
import {
  DEFAULT_FILTER_KEY,
  LIST_DENSITY_KEY,
  PRIORITY_META,
  TODO_FILTERS,
  countTodos,
  dueInfo,
  filterTodos,
  formatDateTime,
  isListDensity,
  isTodoFilter,
  sortTodos,
  type ListDensity,
  type Todo,
  type TodoFilter,
  type TodoPriority,
} from "@/components/user/model";
import { cn, localDateKey } from "@/lib/utils";

type Props = {
  initialTodos: Todo[];
  today: string;
};

type DeleteResult = { id: string; deleted: boolean };

export function TodoBoard({ initialTodos, today: serverToday }: Props) {
  const [todos, setTodos] = useState<Todo[]>(() => sortTodos(initialTodos));
  const [filter, setFilter] = useState<TodoFilter>("all");
  const [density, setDensity] = useState<ListDensity>("comfortable");
  const [today, setToday] = useState(serverToday);

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TodoPriority>(2);
  const [dueDate, setDueDate] = useState("");
  const [adding, setAdding] = useState(false);

  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const inputRef = useRef<HTMLInputElement | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setToday(localDateKey());
    const storedDensity = window.localStorage.getItem(LIST_DENSITY_KEY);
    if (isListDensity(storedDensity)) setDensity(storedDensity);
    const storedFilter = window.localStorage.getItem(DEFAULT_FILTER_KEY);
    if (isTodoFilter(storedFilter)) setFilter(storedFilter);
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  const counts = useMemo(() => countTodos(todos, today), [todos, today]);
  const visible = useMemo(() => filterTodos(todos, filter, today), [todos, filter, today]);
  const filterCounts: Record<TodoFilter, number> = {
    all: todos.length,
    today: counts.today,
    open: counts.open,
    done: counts.done,
  };

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

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (adding) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setError("先写一条待办再提交");
      inputRef.current?.focus();
      return;
    }

    setAdding(true);
    setError("");
    const result = await requestJson<Todo>("/api/todo", {
      method: "POST",
      body: { title: trimmed, priority, dueDate: dueDate || null },
    });
    setAdding(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setTodos((prev) => sortTodos([result.data, ...prev]));
    setTitle("");
    setDueDate("");
    flash("已添加一条待办");
    inputRef.current?.focus();
  }

  async function toggleDone(todo: Todo) {
    if (isBusy(todo.id)) return;
    markBusy(todo.id, true);
    setError("");

    const result = await requestJson<Todo>(`/api/todo/${todo.id}`, {
      method: "PATCH",
      body: { done: !todo.done },
    });

    markBusy(todo.id, false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTodos((prev) => sortTodos(prev.map((item) => (item.id === result.data.id ? result.data : item))));
    flash(result.data.done ? "完成一条" : "已恢复为未完成");
  }

  async function removeTodo(todo: Todo) {
    if (isBusy(todo.id)) return;
    if (!window.confirm(`删除「${todo.title}」？此操作不可恢复。`)) return;

    markBusy(todo.id, true);
    setError("");
    const result = await requestJson<DeleteResult>(`/api/todo/${todo.id}`, { method: "DELETE" });
    markBusy(todo.id, false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTodos((prev) => prev.filter((item) => item.id !== todo.id));
    if (editingId === todo.id) setEditingId(null);
    flash("已删除");
  }

  function startEdit(todo: Todo) {
    setEditingId(todo.id);
    setEditingTitle(todo.title);
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingTitle("");
  }

  async function saveEdit(todo: Todo) {
    if (savingEdit) return;
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      setError("标题不能为空");
      return;
    }
    if (trimmed === todo.title) {
      cancelEdit();
      return;
    }

    setSavingEdit(true);
    setError("");
    const result = await requestJson<Todo>(`/api/todo/${todo.id}`, {
      method: "PATCH",
      body: { title: trimmed },
    });
    setSavingEdit(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTodos((prev) => sortTodos(prev.map((item) => (item.id === result.data.id ? result.data : item))));
    cancelEdit();
    flash("标题已更新");
  }

  const emptyCopy: Record<TodoFilter, { title: string; desc: string }> = {
    all: { title: "还没有待办", desc: "把要做的事写下来，一条一条划掉。" },
    today: { title: "今天没有到期的事", desc: "给待办加上今天的截止日期，就会出现在这里。" },
    open: { title: "没有未完成的待办", desc: "当前所有待办都已经完成，给自己一点休息时间。" },
    done: { title: "还没有完成记录", desc: "勾掉第一条待办后，这里会留下完成记录。" },
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Stat value={counts.todayOpen} label="今日待办" accent="sun" />
        <Stat value={counts.open} label="未完成" accent="coral" />
        <Stat value={counts.done} label="已完成" accent="mint" />
        <Stat value={`${counts.completionRate}%`} label="完成率" accent="blue" />
      </div>

      <form onSubmit={handleAdd} className="surface p-4 md:p-5" noValidate>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="todo-title" className="label">
              快速添加
            </label>
            <input
              id="todo-title"
              ref={inputRef}
              className="field"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              placeholder="写下要做的事，按回车即可添加"
              autoComplete="off"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-end">
            <div className="min-w-0">
              <label htmlFor="todo-priority" className="label">
                优先级
              </label>
              <select
                id="todo-priority"
                className="field"
                value={priority}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setPriority(next === 1 || next === 3 ? next : 2);
                }}
              >
                <option value={1}>高 · 今天做</option>
                <option value={2}>中 · 本周做</option>
                <option value={3}>低 · 有空做</option>
              </select>
            </div>
            <div className="min-w-0">
              <label htmlFor="todo-due" className="label">
                截止日期
              </label>
              <input
                id="todo-due"
                type="date"
                className="field"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary lg:w-auto" disabled={adding}>
            <Icon name="plus" size={16} />
            {adding ? "添加中…" : "添加待办"}
          </button>
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="筛选待办">
          {TODO_FILTERS.map((item) => {
            const active = filter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                aria-pressed={active}
                className={cn(
                  "tag transition-colors",
                  active ? "bg-ink text-paper" : "bg-paper hover:bg-cream",
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10.5px]",
                    active ? "bg-paper/25 text-paper" : "bg-cream text-ink-soft",
                  )}
                >
                  {filterCounts[item.key]}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[12px] text-ink-soft">
          {density === "compact" ? "紧凑视图" : "舒适视图"} · 共 {todos.length} 条
        </p>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Icon name="check" size={30} />}
          title={emptyCopy[filter].title}
          desc={emptyCopy[filter].desc}
          action={
            filter === "all" ? (
              <button type="button" className="btn btn-primary" onClick={() => inputRef.current?.focus()}>
                写下第一条待办
              </button>
            ) : (
              <button type="button" className="btn" onClick={() => setFilter("all")}>
                查看全部待办
              </button>
            )
          }
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((todo) => {
            const meta = PRIORITY_META[todo.priority];
            const due = dueInfo(todo, today);
            const busy = isBusy(todo.id);
            const editing = editingId === todo.id;
            return (
              <li
                key={todo.id}
                className={cn(
                  "surface-tight bg-paper transition-all duration-300 hover:shadow-hard-sm",
                  density === "compact" ? "px-3 py-2" : "px-3 py-3 md:px-4",
                  todo.done && "bg-cream/70",
                )}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => void toggleDone(todo)}
                    disabled={busy}
                    aria-pressed={todo.done}
                    aria-label={todo.done ? `把「${todo.title}」标记为未完成` : `把「${todo.title}」标记为已完成`}
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] edge transition-all duration-200",
                      todo.done ? "bg-mint" : "bg-paper hover:bg-sun",
                      busy && "opacity-50",
                    )}
                  >
                    <Icon
                      name="check"
                      size={16}
                      className={cn("transition-opacity duration-200", todo.done ? "opacity-100" : "opacity-0")}
                    />
                  </button>

                  <span className={cn("mt-1 h-6 w-1.5 shrink-0 rounded-full", meta.barClass)} aria-hidden="true" />

                  <div className="min-w-0 flex-1">
                    {editing ? (
                      <form
                        className="flex flex-wrap items-center gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void saveEdit(todo);
                        }}
                      >
                        <input
                          className="field field-sm min-w-[160px] flex-1"
                          value={editingTitle}
                          onChange={(event) => setEditingTitle(event.target.value)}
                          maxLength={120}
                          aria-label="编辑待办标题"
                          autoFocus
                        />
                        <button type="submit" className="btn btn-sm btn-mint" disabled={savingEdit}>
                          {savingEdit ? "保存中…" : "保存"}
                        </button>
                        <button type="button" className="btn btn-sm" onClick={cancelEdit} disabled={savingEdit}>
                          取消
                        </button>
                      </form>
                    ) : (
                      <p
                        className={cn(
                          "break-words text-[15px] font-bold leading-snug transition-all duration-300",
                          todo.done && "text-ink-soft line-through decoration-[2px]",
                        )}
                      >
                        {todo.title}
                      </p>
                    )}

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-ink-soft">
                      <span className={cn("tag px-2 py-0.5", meta.tagClass)}>{meta.short}优先级</span>
                      {due ? (
                        <span
                          className={cn(
                            "font-bold",
                            due.overdue ? "text-coral" : due.isToday ? "text-blue" : "text-ink-soft",
                          )}
                        >
                          {due.text}
                        </span>
                      ) : null}
                      {todo.done && todo.completedAt !== null ? (
                        <span>完成于 {formatDateTime(todo.completedAt)}</span>
                      ) : null}
                      {todo.note ? <span className="min-w-0 truncate">{todo.note}</span> : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost px-2"
                      onClick={() => startEdit(todo)}
                      aria-label={`编辑「${todo.title}」`}
                      disabled={busy || editing}
                    >
                      <Icon name="pen" size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost px-2 text-coral hover:bg-coral/10"
                      onClick={() => void removeTodo(todo)}
                      aria-label={`删除「${todo.title}」`}
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
