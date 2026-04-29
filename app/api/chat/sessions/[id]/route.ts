import { NextResponse } from "next/server";
import { logSupabaseError } from "@/lib/api-errors";
import { brainSchemaMissingMessage, isMissingBrainSchemaError } from "@/lib/documents";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ChatMessage, ChatSession, ChatSource } from "@/types";

export const runtime = "nodejs";

interface ChatSessionRouteContext {
  params: {
    id: string;
  };
}

interface DbChatSession {
  id: string;
  title: string | null;
  created_at: string;
}

interface DbChatMessage {
  id: string;
  session_id: string;
  role: string;
  content: string;
  sources: unknown;
  created_at: string;
}

function mapSession(row: DbChatSession): ChatSession {
  return {
    id: row.id,
    title: row.title || "New Chat",
    createdAt: row.created_at,
    latestMessagePreview: null,
  };
}

function isChatSource(value: unknown): value is ChatSource {
  if (!value || typeof value !== "object") {
    return false;
  }

  const source = value as Partial<ChatSource>;
  return (
    typeof source.chunk_id === "string" &&
    typeof source.document_id === "string" &&
    typeof source.document_title === "string" &&
    typeof source.excerpt === "string" &&
    typeof source.similarity === "number"
  );
}

function normalizeSources(value: unknown): ChatSource[] {
  return Array.isArray(value) ? value.filter(isChatSource) : [];
}

function mapMessage(row: DbChatMessage): ChatMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role === "user" ? "user" : "assistant",
    content: row.content,
    sources: normalizeSources(row.sources),
    createdAt: row.created_at,
  };
}

async function getSession(supabase: ReturnType<typeof getSupabaseServerClient>, id: string) {
  return supabase.from("chat_sessions").select("id,title,created_at").eq("id", id).maybeSingle();
}

export async function GET(_request: Request, { params }: ChatSessionRouteContext) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: session, error: sessionError } = await getSession(supabase, params.id);

  if (sessionError) {
    logSupabaseError("chat.sessions.id.GET.session", sessionError);

    if (isMissingBrainSchemaError(sessionError)) {
      return NextResponse.json({ error: brainSchemaMissingMessage, setupRequired: true }, { status: 503 });
    }

    return NextResponse.json({ error: "Could not load chat session." }, { status: 500 });
  }

  if (!session) {
    return NextResponse.json({ error: "Chat session not found." }, { status: 404 });
  }

  const { data: messages, error: messagesError } = await supabase
    .from("chat_messages")
    .select("id,session_id,role,content,sources,created_at")
    .eq("session_id", params.id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    logSupabaseError("chat.sessions.id.GET.messages", messagesError);
    return NextResponse.json({ error: "Could not load chat messages." }, { status: 500 });
  }

  return NextResponse.json({
    session: mapSession(session as DbChatSession),
    messages: ((messages ?? []) as DbChatMessage[]).map(mapMessage),
  });
}

export async function PATCH(request: Request, { params }: ChatSessionRouteContext) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { title?: unknown } | null;
  const title = typeof body?.title === "string" ? body.title.replace(/\s+/g, " ").trim() : "";

  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("chat_sessions")
    .update({ title: title.length > 80 ? `${title.slice(0, 77)}...` : title })
    .eq("id", params.id)
    .select("id,title,created_at")
    .maybeSingle();

  if (error) {
    logSupabaseError("chat.sessions.id.PATCH", error);
    return NextResponse.json({ error: "Could not update chat session." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Chat session not found." }, { status: 404 });
  }

  return NextResponse.json({ session: mapSession(data as DbChatSession) });
}

export async function DELETE(_request: Request, { params }: ChatSessionRouteContext) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: messagesError } = await supabase.from("chat_messages").delete().eq("session_id", params.id);

  if (messagesError) {
    logSupabaseError("chat.sessions.id.DELETE.messages", messagesError);
    return NextResponse.json({ error: "Could not delete chat messages." }, { status: 500 });
  }

  const { error } = await supabase.from("chat_sessions").delete().eq("id", params.id);

  if (error) {
    logSupabaseError("chat.sessions.id.DELETE.session", error);
    return NextResponse.json({ error: "Could not delete chat session." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
