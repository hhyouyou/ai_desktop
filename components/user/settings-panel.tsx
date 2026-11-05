"use client";

import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { requestJson } from "@/components/user/api";
import {
  DEFAULT_FILTER_KEY,
  DENSITY_OPTIONS,
  LIST_DENSITY_KEY,
  TODO_FILTERS,
  isListDensity,
  isTodoFilter,
  type ListDensity,
  type Todo,
  type TodoCounts,
  type TodoFilter,
} from "@/components/user/model";
import type { Viewer } from "@/lib/auth";
import { downloadBlob, localDateKey } from "@/lib/utils";

type Props = {
  viewer: Viewer;
  counts: TodoCounts;
  scheduleTotal: number;
};

type MeData = {
  viewer: { id: string; name: string; email: string | null; kind: string; anonymous: boolean };
};

function SettingCard({
  eyebrow,
  title,
  desc,
  children,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <section className="surface p-5 md:p-6">
      <p className="eyebrow mb-1.5">{eyebrow}</p>
      <h2 className="text-[18px] font-extrabold">{title}</h2>
      {desc ? <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{desc}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function SettingsPanel({ viewer, counts, scheduleTotal }: Props) {
  const router = useRouter();

  const [name, setName] = useState(viewer.name);
  const [savingName, setSavingName] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [density, setDensity] = useState<ListDensity>("comfortable");
  const [defaultFilter, setDefaultFilter] = useState<TodoFilter>("all");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const storedDensity = window.localStorage.getItem(LIST_DENSITY_KEY);
    if (isListDensity(storedDensity)) setDensity(storedDensity);
    const storedFilter = window.localStorage.getItem(DEFAULT_FILTER_KEY);
    if (isTodoFilter(storedFilter)) setDefaultFilter(storedFilter);
  }, []);

  function flash(message: string) {
    setNotice(message);
    setError("");
  }

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingName) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("昵称不能为空");
      setNotice("");
      return;
    }

    setSavingName(true);
    setError("");
    setNotice("");
    const result = await requestJson<MeData>("/api/auth/me", {
      method: "PATCH",
      body: { name: trimmed },
    });
    setSavingName(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setName(result.data.viewer.name);
    flash("昵称已保存");
    router.refresh();
  }

  async function exportTodos() {
    if (exporting) return;
    setExporting(true);
    setError("");
    setNotice("");

    const result = await requestJson<Todo[]>("/api/todo?filter=all");
    setExporting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    const payload = {
      site: "块集 BlockSet",
      kind: "todos",
      exportedAt: new Date().toISOString(),
      count: result.data.length,
      todos: result.data,
    };
    downloadBlob(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
      `blockset-todos-${localDateKey()}.json`,
    );
    flash(`已导出 ${result.data.length} 条待办`);
  }

  async function clearAllTodos() {
    if (clearing) return;
    if (counts.total === 0) {
      setError("当前没有待办需要清空");
      setNotice("");
      return;
    }
    const confirmed = window.confirm(
      `将删除全部 ${counts.total} 条待办（包含已完成），且不可恢复。确定继续？`,
    );
    if (!confirmed) return;

    setClearing(true);
    setError("");
    setNotice("");
    const result = await requestJson<{ deleted: number }>("/api/todo", { method: "DELETE" });
    setClearing(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    flash(`已清空 ${result.data.deleted} 条待办`);
    router.refresh();
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setError("");
    setNotice("");
    const result = await requestJson<{ loggedOut: boolean }>("/api/auth/logout", {
      method: "POST",
    });
    setLoggingOut(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    flash("已退出登录，当前回到匿名身份");
    router.refresh();
  }

  function chooseDensity(next: ListDensity) {
    setDensity(next);
    window.localStorage.setItem(LIST_DENSITY_KEY, next);
    flash("列表密度已保存在本浏览器");
  }

  function chooseDefaultFilter(next: TodoFilter) {
    setDefaultFilter(next);
    window.localStorage.setItem(DEFAULT_FILTER_KEY, next);
    flash("默认筛选已保存在本浏览器");
  }

  return (
    <div className="mx-auto max-w-[980px] space-y-5">
      {error ? (
        <p className="rounded-[14px] border-2 border-coral bg-coral/10 px-4 py-3 text-[13px] font-bold text-coral" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-[14px] border-2 border-mint bg-mint/10 px-4 py-3 text-[13px] font-bold" role="status">
          {notice}
        </p>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <SettingCard eyebrow="ACCOUNT" title="账号信息" desc="昵称会显示在顶栏，可以随时修改。">
          <div className="flex flex-wrap items-center gap-2">
            {viewer.anonymous ? (
              <span className="tag tag-sun">匿名访客</span>
            ) : (
              <span className="tag tag-mint">邮箱账号</span>
            )}
            <span className="text-[12.5px] text-ink-soft">
              {viewer.anonymous ? "未绑定邮箱，数据按 IP + 浏览器 UA 归属" : viewer.email ?? ""}
            </span>
          </div>

          <form onSubmit={saveName} className="mt-4" noValidate>
            <label htmlFor="settings-name" className="label">
              昵称
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                id="settings-name"
                className="field min-w-[160px] flex-1"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={24}
                autoComplete="nickname"
              />
              <button type="submit" className="btn btn-primary" disabled={savingName}>
                {savingName ? "保存中…" : "保存"}
              </button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {viewer.anonymous ? (
              <Link href="/auth/login" className="btn btn-sm btn-ink">
                <Icon name="lock" size={14} />
                注册 / 登录并保留数据
              </Link>
            ) : (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => void handleLogout()}
                disabled={loggingOut}
              >
                {loggingOut ? "退出中…" : "退出登录"}
              </button>
            )}
          </div>
          {viewer.anonymous ? (
            <p className="mt-3 text-[11.5px] leading-relaxed text-ink-soft">
              注册会把当前匿名身份升级为邮箱账号，已有待办与计划都不会丢。
            </p>
          ) : null}
        </SettingCard>

        <SettingCard eyebrow="DATA" title="数据管理" desc="导出为 JSON 备份，或清空当前账号的全部待办。">
          <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
            <span className="tag">待办 {counts.total}</span>
            <span className="tag tag-sun">未完成 {counts.open}</span>
            <span className="tag tag-mint">已完成 {counts.done}</span>
            <Link href="/scheduled-tasks" className="tag bg-paper hover:bg-cream">
              已安排 {scheduleTotal} 条 →
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-sm btn-blue"
              onClick={() => void exportTodos()}
              disabled={exporting}
            >
              <Icon name="download" size={14} />
              {exporting ? "导出中…" : "导出待办 JSON"}
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => void clearAllTodos()}
              disabled={clearing}
            >
              <Icon name="trash" size={14} />
              {clearing ? "清空中…" : "清空全部待办"}
            </button>
          </div>
          <p className="mt-3 text-[11.5px] leading-relaxed text-ink-soft">
            导出文件包含标题、备注、优先级、截止日期与完成状态。清空操作不可恢复，请先导出备份。
          </p>
        </SettingCard>
      </div>

      <SettingCard
        eyebrow="LOCAL PREFERENCES"
        title="本地偏好"
        desc="只保存在当前浏览器，不影响账号数据。"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="label">列表密度</p>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="列表密度">
              {DENSITY_OPTIONS.map((option) => {
                const active = density === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => chooseDensity(option.key)}
                    className={
                      active
                        ? "rounded-[14px] edge bg-ink px-3 py-2 text-[13px] font-bold text-paper shadow-hard-sm"
                        : "rounded-[14px] edge bg-paper px-3 py-2 text-[13px] font-bold hover:bg-cream"
                    }
                  >
                    {option.label}
                    <span className={active ? "mt-0.5 block text-[10.5px] font-semibold text-paper/70" : "mt-0.5 block text-[10.5px] font-semibold text-ink-soft"}>
                      {option.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="settings-default-filter" className="label">
              打开待办页时的默认筛选
            </label>
            <select
              id="settings-default-filter"
              className="field"
              value={defaultFilter}
              onChange={(event) => {
                const next = event.target.value;
                if (isTodoFilter(next)) chooseDefaultFilter(next);
              }}
            >
              {TODO_FILTERS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </SettingCard>

      <SettingCard eyebrow="ABOUT DATA" title="关于数据与演示">
        <ul className="space-y-2 text-[12.5px] leading-relaxed text-ink-soft">
          <li className="flex gap-2">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ink" aria-hidden="true" />
            待办与已安排保存在本站自带的 SQLite 数据库，仅用于演示与自用。
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ink" aria-hidden="true" />
            匿名身份由 IP 与浏览器 UA 派生：换网络或清除浏览器数据后，可能变成新的匿名身份。
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ink" aria-hidden="true" />
            已安排只是计划清单，到期高亮提醒，不做自动执行，也不发送通知。
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ink" aria-hidden="true" />
            想长期保存数据：注册邮箱账号后，数据会跟随账号 id，不会因为更换网络而丢失。
          </li>
        </ul>
      </SettingCard>
    </div>
  );
}
