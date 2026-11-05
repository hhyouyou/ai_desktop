import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "blockset.db");

type GlobalDb = typeof globalThis & { __blocksetDb?: Database.Database };

function createDb(): Database.Database {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const instance = new Database(DB_FILE);
  instance.pragma("journal_mode = WAL");
  instance.pragma("foreign_keys = ON");
  migrate(instance);
  return instance;
}

function migrate(instance: Database.Database): void {
  instance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      kind        TEXT NOT NULL DEFAULT 'anon',
      identity    TEXT NOT NULL UNIQUE,
      name        TEXT,
      pass_hash   TEXT,
      pass_salt   TEXT,
      created_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS todos (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      title       TEXT NOT NULL,
      note        TEXT NOT NULL DEFAULT '',
      priority    INTEGER NOT NULL DEFAULT 2,
      due_date    TEXT,
      done        INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL,
      completed_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user_id, done);

    CREATE TABLE IF NOT EXISTS favorites (
      user_id     TEXT NOT NULL,
      tool_slug   TEXT NOT NULL,
      created_at  INTEGER NOT NULL,
      PRIMARY KEY (user_id, tool_slug)
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      title       TEXT NOT NULL,
      note        TEXT NOT NULL DEFAULT '',
      run_at      INTEGER NOT NULL,
      repeat      TEXT NOT NULL DEFAULT 'none',
      enabled     INTEGER NOT NULL DEFAULT 1,
      last_run_at INTEGER,
      created_at  INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_schedules_user ON schedules(user_id, enabled);

    CREATE TABLE IF NOT EXISTS threads (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      title       TEXT NOT NULL DEFAULT '新对话',
      mode        TEXT NOT NULL DEFAULT 'chat',
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_threads_user ON threads(user_id, updated_at);

    CREATE TABLE IF NOT EXISTS messages (
      id          TEXT PRIMARY KEY,
      thread_id   TEXT NOT NULL,
      role        TEXT NOT NULL,
      content     TEXT NOT NULL,
      created_at  INTEGER NOT NULL,
      FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, created_at);

    CREATE TABLE IF NOT EXISTS drawings (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      prompt      TEXT NOT NULL,
      model       TEXT NOT NULL DEFAULT '',
      status      TEXT NOT NULL DEFAULT 'done',
      payload     TEXT NOT NULL DEFAULT '',
      mime        TEXT NOT NULL DEFAULT 'image/svg+xml',
      created_at  INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_drawings_user ON drawings(user_id, created_at);

    CREATE TABLE IF NOT EXISTS announcements (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      body        TEXT NOT NULL,
      pinned      INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS briefs (
      id          TEXT PRIMARY KEY,
      date        TEXT NOT NULL UNIQUE,
      payload     TEXT NOT NULL,
      created_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hot_cache (
      source      TEXT PRIMARY KEY,
      payload     TEXT NOT NULL,
      fetched_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meta (
      key         TEXT PRIMARY KEY,
      value       TEXT NOT NULL
    );
  `);
}

export const db: Database.Database = ((globalThis as GlobalDb).__blocksetDb ??= createDb());

export function nowMs(): number {
  return Date.now();
}

export function getMeta(key: string): string | null {
  const row = db.prepare("SELECT value FROM meta WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setMeta(key: string, value: string): void {
  db.prepare(
    "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(key, value);
}
