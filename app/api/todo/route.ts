import { NextRequest, NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import {
  clearTodos,
  createTodo,
  listTodos,
  normalizeTodoInput,
  todoCounts,
  type TodoFilter,
} from "@/lib/todos";

export const dynamic = "force-dynamic";

const FILTERS: TodoFilter[] = ["all", "today", "open", "done"];

function isFilter(value: string): value is TodoFilter {
  return (FILTERS as string[]).includes(value);
}

async function readBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const payload: unknown = await req.json();
    if (payload === null || typeof payload !== "object" || Array.isArray(payload)) return null;
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** GET /api/todo?filter=all|today|open|done */
export async function GET(req: NextRequest) {
  const viewer = await getViewer();
  const raw = req.nextUrl.searchParams.get("filter") ?? "all";
  if (!isFilter(raw)) {
    return NextResponse.json(
      { ok: false, error: "筛选参数无效，可选 all / today / open / done" },
      { status: 400 },
    );
  }

  const todos = listTodos(viewer.id, raw);
  return NextResponse.json({ ok: true, data: todos, counts: todoCounts(viewer.id) });
}

/** POST /api/todo  body: { title, note?, priority?, dueDate? } */
export async function POST(req: NextRequest) {
  const body = await readBody(req);
  if (!body) return NextResponse.json({ ok: false, error: "请求体必须是 JSON 对象" }, { status: 400 });

  const normalized = normalizeTodoInput(body, false);
  if (!normalized.ok) return NextResponse.json({ ok: false, error: normalized.error }, { status: 400 });

  const viewer = await getViewer();
  const todo = createTodo(viewer.id, {
    title: normalized.value.title ?? "",
    note: normalized.value.note,
    priority: normalized.value.priority,
    dueDate: normalized.value.dueDate,
  });

  return NextResponse.json({ ok: true, data: todo }, { status: 201 });
}

/** DELETE /api/todo 清空当前用户的全部待办（设置页使用，需前端二次确认） */
export async function DELETE() {
  const viewer = await getViewer();
  const deleted = clearTodos(viewer.id);
  return NextResponse.json({ ok: true, data: { deleted } });
}
