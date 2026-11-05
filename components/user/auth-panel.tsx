"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { requestJson } from "@/components/user/api";
import type { Viewer } from "@/lib/auth";
import { cn } from "@/lib/utils";

type Props = {
  viewer: Viewer;
};

type Mode = "login" | "register";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  kind: string;
  anonymous: boolean;
};

export function AuthPanel({ viewer }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("请填写邮箱和密码");
      return;
    }
    if (mode === "register" && password.length < 6) {
      setError("密码至少 6 位");
      return;
    }

    setPending(true);
    setError("");
    const result = await requestJson<AuthUser>(
      mode === "login" ? "/api/auth/login" : "/api/auth/register",
      {
        method: "POST",
        body:
          mode === "login"
            ? { email: trimmedEmail, password }
            : { email: trimmedEmail, password, name: name.trim() },
      },
    );
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push("/user/todo");
    router.refresh();
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setError("");
    const result = await requestJson<{ loggedOut: boolean }>("/api/auth/logout", {
      method: "POST",
    });
    setLoggingOut(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (!viewer.anonymous) {
    return (
      <div className="mx-auto max-w-[560px]">
        <div className="surface p-6 md:p-8">
          <p className="eyebrow mb-2">SIGNED IN</p>
          <h2 className="text-[22px] font-extrabold">已登录为 {viewer.name}</h2>
          <p className="mt-2 text-[13.5px] text-ink-soft">
            {viewer.email ? `邮箱账号：${viewer.email}` : "当前账号没有绑定邮箱。"}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="tag tag-mint">邮箱账号</span>
            <span className="tag">数据已跟随账号</span>
          </div>

          {error ? (
            <p className="mt-4 text-[13px] font-bold text-coral" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/user/todo" className="btn btn-primary">
              <Icon name="check" size={16} />
              前往待办
            </Link>
            <Link href="/settings" className="btn">
              <Icon name="settings" size={16} />
              设置
            </Link>
            <button
              type="button"
              className="btn btn-ink"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
            >
              {loggingOut ? "退出中…" : "退出登录"}
            </button>
          </div>
          <p className="mt-4 text-[11.5px] text-ink-soft">
            退出后回到匿名身份，当前浏览器仍会自动创建一个匿名账号，数据保存在这台服务器上。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[560px]">
      <div className="surface p-5 md:p-7">
        <div className="mb-5 grid grid-cols-2 gap-2" role="tablist" aria-label="登录或注册">
          {(
            [
              { key: "login", label: "登录" },
              { key: "register", label: "注册" },
            ] as { key: Mode; label: string }[]
          ).map((item) => {
            const active = mode === item.key;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setMode(item.key);
                  setError("");
                }}
                className={cn(
                  "rounded-full edge px-4 py-2.5 text-[14px] font-extrabold transition-all",
                  active ? "bg-ink text-paper shadow-hard-sm" : "bg-paper text-ink hover:bg-cream",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} role="tabpanel" noValidate>
          {mode === "register" ? (
            <div className="mb-3">
              <label htmlFor="auth-name" className="label">
                昵称
              </label>
              <input
                id="auth-name"
                className="field"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={24}
                placeholder="例如：小集"
                autoComplete="nickname"
              />
            </div>
          ) : null}

          <div className="mb-3">
            <label htmlFor="auth-email" className="label">
              邮箱
            </label>
            <input
              id="auth-email"
              type="email"
              className="field"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="mb-1">
            <label htmlFor="auth-password" className="label">
              密码
            </label>
            <input
              id="auth-password"
              type="password"
              className="field"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={mode === "register" ? "至少 6 位" : "输入密码"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
          </div>

          <p className="mb-4 mt-2 text-[11.5px] leading-relaxed text-ink-soft">
            {mode === "login"
              ? "登录后会把数据绑定到邮箱账号，换设备登录即可找回。"
              : "注册会把当前匿名身份升级为邮箱账号，已有待办与计划都会保留。"}
          </p>

          {error ? (
            <p className="mb-3 rounded-[12px] border-2 border-coral bg-coral/10 px-3 py-2 text-[13px] font-bold text-coral" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="btn btn-primary w-full" disabled={pending}>
            <Icon name={mode === "login" ? "lock" : "plus"} size={16} />
            {pending ? "提交中…" : mode === "login" ? "登录" : "注册并保留数据"}
          </button>
        </form>

        <p className="mt-4 text-[11.5px] leading-relaxed text-ink-soft">
          登录不是必须的：匿名访问也能使用待办和已安排。当前匿名数据保存在这台服务器的 SQLite
          数据库里，清除浏览器数据或更换网络后可能变成新的匿名身份。
        </p>
      </div>
    </div>
  );
}
