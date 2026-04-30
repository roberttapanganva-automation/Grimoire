import { NextResponse } from "next/server";
import { logSupabaseError } from "@/lib/api-errors";
import { brainSchemaMissingMessage, isMissingBrainSchemaError } from "@/lib/documents";
import { embedDocumentText, embedQueryText, generateAnswerFromContext, getGeminiApiKey } from "@/lib/server/gemini";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ChatMode, ChatResponseStyle } from "@/types";

export const runtime = "nodejs";

const noAnswerMessage = "I could not find this in your uploaded documents yet.";
const maxQuestionLength = 2000;
const matchCount = 6;
const matchThreshold = 0.35;
const maxBackfillChunks = 50;

interface ChatRequestBody {
  message?: unknown;
  sessionId?: unknown;
  mode?: unknown;
  responseStyle?: unknown;
}

interface MatchChunkRow {
  chunk_id: string;
  document_id: string;
  content: string;
  similarity: number;
}

interface Source {
  chunk_id: string;
  document_id: string;
  document_title: string;
  excerpt: string;
  similarity: number;
}

interface DbChatSession {
  id: string;
  title: string | null;
  created_at: string;
}

const chatModes: ChatMode[] = ["ask_documents", "job_application", "interview_coach", "kiss"];
const chatResponseStyles: ChatResponseStyle[] = ["direct", "kiss", "detailed", "natural_proposal", "interview_answer"];

function isChatMode(value: unknown): value is ChatMode {
  return typeof value === "string" && chatModes.includes(value as ChatMode);
}

function isChatResponseStyle(value: unknown): value is ChatResponseStyle {
  return typeof value === "string" && chatResponseStyles.includes(value as ChatResponseStyle);
}

function safeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected chat error.";
}

function clientErrorMessage(error: unknown) {
  const message = safeErrorMessage(error);

  if (message.includes("chat_sessions") || message.includes("chat_messages")) {
    return "Could not save chat history. Check the chat session tables and policies.";
  }

  return message;
}

function createSessionTitle(message: string) {
  const title = message.replace(/\s+/g, " ").trim();

  if (title.length <= 60) {
    return title || "New Chat";
  }

  return `${title.slice(0, 57)}...`;
}

function excerptText(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length > 320 ? `${normalized.slice(0, 317)}...` : normalized;
}

function normalizeSimilarity(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? Math.max(0, Math.min(1, numberValue)) : 0;
}

async function backfillMissingChunkEmbeddings({
  apiKey,
  supabase,
  userId,
}: {
  apiKey: string;
  supabase: ReturnType<typeof getSupabaseServerClient>;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("chunks")
    .select("id,content,documents!inner(user_id,status)")
    .eq("documents.user_id", userId)
    .eq("documents.status", "ready")
    .is("embedding", null)
    .limit(maxBackfillChunks);

  if (error) {
    logSupabaseError("chat.chunks.backfill.select", error);
    throw new Error(`Could not load chunks for embedding backfill: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{ id: string; content: string }>;

  for (const row of rows) {
    const embedding = await embedDocumentText(row.content, apiKey);
    const { error: updateError } = await supabase.from("chunks").update({ embedding }).eq("id", row.id);

    if (updateError) {
      logSupabaseError("chat.chunks.backfill.update", updateError);
      throw new Error(`Could not save chunk embedding: ${updateError.message}`);
    }
  }

  return rows.length;
}

async function getOrCreateSession({
  message,
  sessionId,
  supabase,
}: {
  message: string;
  sessionId: string | null;
  supabase: ReturnType<typeof getSupabaseServerClient>;
}) {
  if (sessionId) {
    const { data, error } = await supabase.from("chat_sessions").select("id,title,created_at").eq("id", sessionId).maybeSingle();

    if (error) {
      logSupabaseError("chat.session.lookup", error);
      throw new Error(`Could not load chat session: ${error.message}`);
    }

    if (!data) {
      throw new Error("Chat session not found.");
    }

    return data as DbChatSession;
  }

  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ title: createSessionTitle(message) })
    .select("id,title,created_at")
    .single();

  if (error) {
    logSupabaseError("chat.session.create", error);
    throw new Error(`Could not create chat session: ${error.message}`);
  }

  return data as DbChatSession;
}

async function saveChatMessage({
  content,
  role,
  sessionId,
  sources = [],
  supabase,
}: {
  content: string;
  role: "user" | "assistant";
  sessionId: string;
  sources?: Source[];
  supabase: ReturnType<typeof getSupabaseServerClient>;
}) {
  const { error } = await supabase.from("chat_messages").insert({
    session_id: sessionId,
    role,
    content,
    sources,
  });

  if (error) {
    logSupabaseError("chat.message.save", error);
    throw new Error(`Could not save ${role} message: ${error.message}`);
  }
}

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return NextResponse.json({ error: `Authentication failed: ${authError.message}` }, { status: 401 });
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as ChatRequestBody | null;
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const requestedSessionId = typeof body?.sessionId === "string" && body.sessionId.trim() ? body.sessionId.trim() : null;
  const mode = body?.mode === undefined ? "ask_documents" : body.mode;
  const responseStyle = body?.responseStyle === undefined ? "kiss" : body.responseStyle;

  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  if (!isChatMode(mode)) {
    return NextResponse.json({ error: "Invalid chat mode." }, { status: 400 });
  }

  if (!isChatResponseStyle(responseStyle)) {
    return NextResponse.json({ error: "Invalid response style." }, { status: 400 });
  }

  if (message.length > maxQuestionLength) {
    return NextResponse.json({ error: `Message is too long. Keep questions under ${maxQuestionLength} characters.` }, { status: 400 });
  }

  try {
    const session = await getOrCreateSession({ message, sessionId: requestedSessionId, supabase });
    const sessionId = session.id;
    await saveChatMessage({ content: message, role: "user", sessionId, supabase });

    const { count: readyDocumentCount, error: readyDocumentError } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "ready")
      .gt("chunk_count", 0);

    if (readyDocumentError) {
      logSupabaseError("chat.documents.ready", readyDocumentError);

      if (isMissingBrainSchemaError(readyDocumentError)) {
        return NextResponse.json({ error: brainSchemaMissingMessage, setupRequired: true, sessionId }, { status: 503 });
      }

      return NextResponse.json({ error: "Could not check ready documents.", sessionId }, { status: 500 });
    }

    if (!readyDocumentCount) {
      return NextResponse.json({ error: "No ready/chunked documents exist yet. Upload and process a TXT document first.", sessionId }, { status: 409 });
    }

    const apiKey = getGeminiApiKey();

    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is missing. Add GEMINI_API_KEY to .env.local and restart the dev server.", sessionId }, { status: 500 });
    }

    await backfillMissingChunkEmbeddings({ apiKey, supabase, userId: user.id });

    const questionEmbedding = await embedQueryText(message, apiKey);
    const { data: matches, error: matchError } = await supabase.rpc("match_chunks", {
      query_embedding: questionEmbedding,
      match_count: matchCount,
      match_threshold: matchThreshold,
    });

    if (matchError) {
      logSupabaseError("chat.match_chunks", matchError);
      return NextResponse.json({ error: "Supabase RPC match_chunks failed. Run the updated supabase/brain_schema.sql, then try again.", sessionId }, { status: 500 });
    }

    const matchRows = ((matches ?? []) as MatchChunkRow[]).filter((row) => row.content?.trim());

    if (matchRows.length === 0) {
      await saveChatMessage({ content: noAnswerMessage, role: "assistant", sessionId, sources: [], supabase });
      return NextResponse.json({ answer: noAnswerMessage, sources: [], sessionId });
    }

    const documentIds = Array.from(new Set(matchRows.map((row) => row.document_id)));
    const { data: documents, error: documentsError } = await supabase
      .from("documents")
      .select("id,title")
      .eq("user_id", user.id)
      .in("id", documentIds);

    if (documentsError) {
      logSupabaseError("chat.documents.titles", documentsError);
      return NextResponse.json({ error: "Could not load source document titles.", sessionId }, { status: 500 });
    }

    const titleByDocumentId = new Map((documents ?? []).map((document) => [document.id as string, document.title as string]));
    const sources: Source[] = matchRows.map((row) => ({
      chunk_id: row.chunk_id,
      document_id: row.document_id,
      document_title: titleByDocumentId.get(row.document_id) ?? "Untitled document",
      excerpt: excerptText(row.content),
      similarity: normalizeSimilarity(row.similarity),
    }));

    const context = matchRows
      .map((row, index) => {
        const title = titleByDocumentId.get(row.document_id) ?? "Untitled document";
        return [`[Source ${index + 1}] ${title}`, row.content.trim()].join("\n");
      })
      .join("\n\n---\n\n");

    const answer = await generateAnswerFromContext({ apiKey, question: message, context, mode, responseStyle });
    await saveChatMessage({ content: answer, role: "assistant", sessionId, sources, supabase });

    return NextResponse.json({ answer, sources, sessionId });
  } catch (error) {
    console.error("[chat] failed", {
      message: safeErrorMessage(error),
    });

    return NextResponse.json({ error: clientErrorMessage(error) }, { status: 500 });
  }
}
