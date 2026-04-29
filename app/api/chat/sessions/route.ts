import { NextResponse } from "next/server";
import { logSupabaseError } from "@/lib/api-errors";
import { brainSchemaMissingMessage, isMissingBrainSchemaError } from "@/lib/documents";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ChatSession } from "@/types";

export const runtime = "nodejs";

interface DbChatSession {
  id: string;
  title: string | null;
  created_at: string;
}

interface DbLatestMessage {
  session_id: string;
  content: string | null;
  created_at: string;
}

function mapSession(row: DbChatSession, latestMessagePreview?: string | null): ChatSession {
  return {
    id: row.id,
    title: row.title || "New Chat",
    createdAt: row.created_at,
    latestMessagePreview: latestMessagePreview ?? null,
  };
}

function previewText(content: string | null | undefined) {
  const normalized = content?.replace(/\s+/g, " ").trim() ?? "";
  return normalized.length > 90 ? `${normalized.slice(0, 87)}...` : normalized || null;
}

export async function GET() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: sessions, error: sessionsError } = await supabase
    .from("chat_sessions")
    .select("id,title,created_at")
    .order("created_at", { ascending: false });

  if (sessionsError) {
    logSupabaseError("chat.sessions.GET", sessionsError);

    if (isMissingBrainSchemaError(sessionsError)) {
      return NextResponse.json({ error: brainSchemaMissingMessage, setupRequired: true }, { status: 503 });
    }

    return NextResponse.json({ error: "Could not load chat sessions." }, { status: 500 });
  }

  const sessionRows = (sessions ?? []) as DbChatSession[];
  const sessionIds = sessionRows.map((session) => session.id);
  const latestPreviewBySessionId = new Map<string, string | null>();

  if (sessionIds.length > 0) {
    const { data: messages, error: messagesError } = await supabase
      .from("chat_messages")
      .select("session_id,content,created_at")
      .in("session_id", sessionIds)
      .order("created_at", { ascending: false });

    if (messagesError) {
      logSupabaseError("chat.sessions.latestMessage", messagesError);
      return NextResponse.json({ error: "Could not load latest chat previews." }, { status: 500 });
    }

    for (const message of (messages ?? []) as DbLatestMessage[]) {
      if (!latestPreviewBySessionId.has(message.session_id)) {
        latestPreviewBySessionId.set(message.session_id, previewText(message.content));
      }
    }
  }

  return NextResponse.json({
    sessions: sessionRows.map((session) => mapSession(session, latestPreviewBySessionId.get(session.id))),
  });
}

export async function POST() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ title: "New Chat" })
    .select("id,title,created_at")
    .single();

  if (error) {
    logSupabaseError("chat.sessions.POST", error);

    if (isMissingBrainSchemaError(error)) {
      return NextResponse.json({ error: brainSchemaMissingMessage, setupRequired: true }, { status: 503 });
    }

    return NextResponse.json({ error: "Could not create chat session." }, { status: 500 });
  }

  return NextResponse.json({ session: mapSession(data as DbChatSession) }, { status: 201 });
}
