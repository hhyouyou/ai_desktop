import { NextRequest, NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { deleteTodo, getTodo, normalizeTodoInput, updateTodo } from "@/lib/todos";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function readBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const payload: unknown = await req.json();
    if (payload === null || typeof payload !== "object" || Array.isArray(payload)) return null;
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** PATCH /api/todo/[id]  任意 { title?, note?, priority?, dueDate?, done? } */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await readBody(req);
  if (!body) return NextResponse.json({ ok: false, error: "请求体必须是 JSON 对象" }, { status: 400 });

  const normalized = normalizeTodoInput(body, true);
  if (!normalized.ok) return NextResponse.json({ ok: false, error: normalized.error }, { status: 400 });

  const viewer = await getViewer();
  if (!getTodo(viewer.id, id)) {
    return NextResponse.json({ ok: false, error: "待办不存在或无权访问" }, { status: 404 });
  }

  const todo = updateTodo(viewer.id, id, normalized.value);
  if (!todo) return NextResponse.json({ ok: false, error: "待办不存在或无权访问" }, { status: 404 });
  return NextResponse.json({ ok: true, data: todo });
}

/** DELETE /api/todo/[id] */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const viewer = await getViewer();
  const deleted = deleteTodo(viewer.id, id);
  if (!deleted) return NextResponse.json({ ok: false, error: "待办不存在或无权访问" }, { status: 404 });
  return NextResponse.json({ ok: true, data: { id, deleted: true } });
}
