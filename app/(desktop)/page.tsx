import Link from "next/link";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getViewer } from "@/lib/auth";
import { Icon } from "@/components/icons";
import { THEME_COOKIE, normalizeTheme } from "@/lib/theme";
import { DeskClock } from "@/components/desktop/desk-clock";
import { ThemePicker } from "@/components/desktop/theme-picker";
import { getCachedBoard } from "@/lib/hot";
import { TOOLS } from "@/lib/site";
import { percent } from "@/lib/utils";

export const metadata: Metadata = {
  title: "在线桌面",
  description:
    "块集在线桌面：日常工具、可切换模型的 AI 对话、待办规划与聚合热点，都在同一屏。",
};

type TodoRow = { id: string; title: string; done: number; priority: number };
type ThreadRow = { id: string; title: string; updated_at: number };
type MessageRow = { role: string; content: string };

const NAV = [
  { label: "桌面", href: "/", active: true },
  { label: "工具", href: "/apps" },
  { label: "AI", href: "/ai/app/chat" },
  { label: "待办", href: "/user/todo" },
  { label: "热点", href: "/daily-hot" },
];

const APPS = [
  { name: "小镇", href: "/town", icon: "house" as const },
  { name: "工具", href: "/apps", icon: "grid" as const },
  { name: "AI 对话", href: "/ai/app/chat", icon: "spark" as const },
  { name: "待办", href: "/user/todo", icon: "check" as const },
  { name: "热点", href: "/daily-hot", icon: "flame" as const },
  { name: "画图", href: "/drawing/create", icon: "brush" as const },
  { name: "设置", href: "/settings", icon: "settings" as const },
];

function relative(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return `${Math.floor(diff / 86_400_000)} 天前`;
}

export default async function DesktopPage({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string }>;
}) {
  const [store, params] = await Promise.all([cookies(), searchParams]);
  const viewer = await getViewer();
  const theme = normalizeTheme(params.theme ?? store.get(THEME_COOKIE)?.value);

  const todos = db
    .prepare(
      `SELECT id, title, done, priority FROM todos
        WHERE user_id = ? ORDER BY done ASC, priority ASC, created_at DESC LIMIT 5`,
    )
    .all(viewer.id) as TodoRow[];
  const counts = db
    .prepare(
      `SELECT COUNT(*) AS total, COALESCE(SUM(done), 0) AS done
         FROM todos WHERE user_id = ?`,
    )
    .get(viewer.id) as { total: number; done: number };

  const threads = db
    .prepare("SELECT id, title, updated_at FROM threads WHERE user_id = ? ORDER BY updated_at DESC LIMIT 3")
    .all(viewer.id) as ThreadRow[];
  const threadCount = (
    db.prepare("SELECT COUNT(*) AS c FROM threads WHERE user_id = ?").get(viewer.id) as { c: number }
  ).c;

  const messages = threads[0]
    ? (db
        .prepare(
          "SELECT role, content FROM messages WHERE thread_id = ? ORDER BY created_at DESC LIMIT 4",
        )
        .all(threads[0].id) as MessageRow[]).reverse()
    : [];

  const board = getCachedBoard("weibo");
  const hotItems = board.items.slice(0, 5);
  const toolList = TOOLS.filter((tool) => tool.hot).slice(0, 4);

  const clock = new Date();
  const initialTime = clock.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const initialDate = clock.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  const donePercent = percent(counts.done, counts.total);

  return (
    <div className="desk-root" data-theme={theme}>
      <div className="wallpaper" aria-hidden="true" />
      <h1 className="sr-only">块集在线桌面：工具、AI 对话、待办与热点</h1>

      <header className="bar">
        <Link href="/" className="bar-left" aria-label="块集在线桌面">
          <span className="logo" />
          <span className="wordmark">块集</span>
          <span className="wm-en">BLOCKSET</span>
        </Link>
        <nav className="bar-nav" aria-label="主导航">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={item.active ? "on" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="bar-right">
          <Link href="/apps" className="bar-search">
            <Icon name="search" size={13} />
            <span>找工具</span>
          </Link>
          <DeskClock initialTime={initialTime} initialDate={initialDate} variant="bar" />
          <Link href="/settings" className="bar-avatar" title="设置">
            {viewer.name.slice(0, 1).toUpperCase()}
          </Link>
        </div>
      </header>

      <main className="desk">
        <aside className="rail" aria-label="应用">
          {APPS.map((app) => (
            <Link key={app.href} href={app.href} className="rail-app" title={app.name}>
              <span className="rail-ic">
                <Icon name={app.icon} size={21} />
              </span>
              <span className="rail-name">{app.name}</span>
            </Link>
          ))}
        </aside>

        <section className="stage">
          <div className="stage-head">
            <p className="slogan">在线桌面</p>
            <p className="slogan-sub">DESKTOP ONLINE · 工具 · AI · 待办 · 热点</p>
          </div>

          <article className="win win-chat">
            <header className="win-bar">
              <span className="win-title">AI 对话</span>
              <span className="win-meta">
                <Link href="/ai/app/chat">{threadCount} 个会话</Link>
              </span>
            </header>
            <div className="chat-body">
              <aside className="chat-side">
                <p className="side-label">最近会话</p>
                {threads.length === 0 ? (
                  <span className="empty-hint">还没有会话</span>
                ) : (
                  threads.map((thread, index) => (
                    <Link
                      key={thread.id}
                      href="/ai/app/chat"
                      className={`conv${index === 0 ? " on" : ""}`}
                      title={thread.title}
                    >
                      {thread.title}
                    </Link>
                  ))
                )}
                <p className="side-label">模型</p>
                <span className="model-chip">DeepSeek</span>
                <span className="model-chip">通义千问</span>
              </aside>
              <div className="chat-main">
                <div className="chat-scroll">
                  {messages.length === 0 ? (
                    <div className="empty-hint">
                      还没有对话记录。
                      <br />
                      打开 AI 对话，模型会记住上下文与会话历史。
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <div key={index} className={`msg ${message.role === "user" ? "me" : "ai"}`}>
                        {message.role === "assistant" ? <span className="who">块集 AI</span> : null}
                        {message.content}
                      </div>
                    ))
                  )}
                </div>
                <Link href="/ai/app/chat" className="composer">
                  <span>继续追问，或粘贴一段要处理的文字…</span>
                  <kbd>↵</kbd>
                </Link>
              </div>
            </div>
          </article>

          <article className="win win-todo">
            <header className="win-bar">
              <span className="win-title">待办</span>
              <span className="win-meta">
                <Link href="/user/todo">
                  今天 · {counts.done}/{counts.total}
                </Link>
              </span>
            </header>
            <div className="todo-body">
              <div className="progress" aria-hidden="true">
                <span className="progress-fill" style={{ width: `${donePercent}%` }} />
              </div>
              <ul className="todo-list">
                {todos.length === 0 ? (
                  <li className="empty-hint">今天还没有待办，先写下一件小事。</li>
                ) : (
                  todos.map((todo) => (
                    <li key={todo.id} className={`todo${todo.done ? " done" : ""}`}>
                      <span className="box" aria-hidden="true">
                        {todo.done ? "✓" : ""}
                      </span>
                      <span className="todo-text">{todo.title}</span>
                    </li>
                  ))
                )}
              </ul>
              <Link href="/user/todo" className="todo-add">
                ＋ 添加待办（回车）
              </Link>
            </div>
          </article>

          <article className="win win-tools">
            <header className="win-bar">
              <span className="win-title">常用工具</span>
              <span className="win-meta">
                <Link href="/apps">全部 {TOOLS.length} 款</Link>
              </span>
            </header>
            <div className="tool-row">
              {toolList.map((tool) => (
                <Link key={tool.slug} href={`/apps/${tool.slug}`} className="tool">
                  <span className="tool-name">{tool.title}</span>
                  <span className="tool-hint">{tool.tags.slice(0, 2).join(" · ")}</span>
                </Link>
              ))}
            </div>
          </article>
        </section>

        <aside className="widgets">
          <div className="wgt wgt-clock">
            <p className="wgt-label">今天</p>
            <DeskClock initialTime={initialTime} initialDate={initialDate} />
          </div>
          <div className="wgt wgt-hot">
            <div className="wgt-head">
              <p className="wgt-label">今日热点</p>
              <span className="wgt-live">{board.live ? "实时 8/8" : "示例数据"}</span>
            </div>
            <ol className="hot-list">
              {hotItems.map((item) => (
                <li key={item.title}>
                  {item.url ? (
                    <a
                      className="hot-item"
                      href={item.url}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      <span className="hot-i">{item.rank}</span>
                      <span className="hot-t">{item.title}</span>
                      <span className="hot-h">{item.hot ?? ""}</span>
                    </a>
                  ) : (
                    <span className="hot-item">
                      <span className="hot-i">{item.rank}</span>
                      <span className="hot-t">{item.title}</span>
                      <span className="hot-h">{item.hot ?? ""}</span>
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
          <div className="wgt wgt-note">
            <p className="wgt-label">一句话</p>
            <p>
              打开浏览器，就是你的桌面。<Link href="/about">了解块集 →</Link>
            </p>
          </div>
        </aside>
      </main>

      <nav className="dock" aria-label="快捷应用">
        {APPS.map((app) => (
          <Link key={app.href} href={app.href} className="dock-ic" title={app.name}>
            <Icon name={app.icon} size={19} />
          </Link>
        ))}
      </nav>

      <ThemePicker initialTheme={theme} />
    </div>
  );
}
