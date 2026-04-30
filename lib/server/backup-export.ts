import "server-only";
import { isMissingBrainSchemaError } from "@/lib/documents";
import type { getSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseServerClient = ReturnType<typeof getSupabaseServerClient>;
type ExportType = "all" | "chats" | "documents" | "library";

interface ExportWarning {
  table: string;
  message: string;
}

function backupEnvelope(exportType: ExportType, data: Record<string, unknown>, warnings: ExportWarning[] = []) {
  return {
    app: "Grimoire",
    exportType,
    exportedAt: new Date().toISOString(),
    version: 1,
    data: {
      ...data,
      ...(warnings.length > 0 ? { warnings } : {}),
    },
  };
}

function safeWarning(table: string, message: string): ExportWarning {
  return {
    table,
    message: isMissingBrainSchemaError({ message }) ? `${table} table is unavailable.` : `Could not export ${table}.`,
  };
}

async function fetchCategories(supabase: SupabaseServerClient, userId: string) {
  return supabase
    .from("categories")
    .select("id,name,color,icon,parent_id,sort_order,created_at")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
}

async function fetchItems(supabase: SupabaseServerClient, userId: string) {
  return supabase
    .from("items")
    .select("id,type,title,content,url,command,variables,tags,category_id,is_pinned,copy_count,use_count,created_at,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
}

async function fetchDocuments(supabase: SupabaseServerClient, userId: string) {
  return supabase
    .from("documents")
    .select("id,title,file_name,file_type,file_size,source_url,status,error_message,chunk_count,category_id,tags,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

async function fetchChunks(supabase: SupabaseServerClient, documentIds: string[]) {
  if (documentIds.length === 0) {
    return { data: [], error: null };
  }

  return supabase
    .from("chunks")
    .select("id,document_id,content,chunk_index,token_count,created_at")
    .in("document_id", documentIds)
    .order("chunk_index", { ascending: true });
}

async function fetchChatSessions(supabase: SupabaseServerClient) {
  return supabase
    .from("chat_sessions")
    .select("id,title,created_at")
    .order("created_at", { ascending: false });
}

async function fetchChatMessages(supabase: SupabaseServerClient, sessionIds: string[]) {
  if (sessionIds.length === 0) {
    return { data: [], error: null };
  }

  return supabase
    .from("chat_messages")
    .select("id,session_id,role,content,sources,created_at")
    .in("session_id", sessionIds)
    .order("created_at", { ascending: true });
}

export async function buildDocumentsExport(supabase: SupabaseServerClient, userId: string) {
  const documentsResult = await fetchDocuments(supabase, userId);

  if (documentsResult.error) {
    return { error: documentsResult.error.message };
  }

  const documents = documentsResult.data ?? [];
  const chunksResult = await fetchChunks(supabase, documents.map((document) => document.id as string));

  if (chunksResult.error) {
    return { error: chunksResult.error.message };
  }

  return {
    payload: backupEnvelope("documents", {
      documents,
      chunks: chunksResult.data ?? [],
    }),
  };
}

export async function buildChatsExport(supabase: SupabaseServerClient) {
  const sessionsResult = await fetchChatSessions(supabase);

  if (sessionsResult.error) {
    return { error: sessionsResult.error.message };
  }

  const chatSessions = sessionsResult.data ?? [];
  const messagesResult = await fetchChatMessages(supabase, chatSessions.map((session) => session.id as string));

  if (messagesResult.error) {
    return { error: messagesResult.error.message };
  }

  return {
    payload: backupEnvelope("chats", {
      chat_sessions: chatSessions,
      chat_messages: messagesResult.data ?? [],
    }),
  };
}

export async function buildLibraryExport(supabase: SupabaseServerClient, userId: string) {
  const [categoriesResult, itemsResult] = await Promise.all([
    fetchCategories(supabase, userId),
    fetchItems(supabase, userId),
  ]);

  if (categoriesResult.error || itemsResult.error) {
    return {
      error: "Library tables are unavailable. Could not export library data.",
      detail: categoriesResult.error?.message ?? itemsResult.error?.message ?? null,
    };
  }

  return {
    payload: backupEnvelope("library", {
      categories: categoriesResult.data ?? [],
      items: itemsResult.data ?? [],
    }),
  };
}

export async function buildAllExport(supabase: SupabaseServerClient, userId: string) {
  const warnings: ExportWarning[] = [];
  const [categoriesResult, itemsResult, documentsResult, chatsResult] = await Promise.all([
    fetchCategories(supabase, userId),
    fetchItems(supabase, userId),
    buildDocumentsExport(supabase, userId),
    buildChatsExport(supabase),
  ]);

  if (categoriesResult.error) {
    warnings.push(safeWarning("categories", categoriesResult.error.message));
  }

  if (itemsResult.error) {
    warnings.push(safeWarning("items", itemsResult.error.message));
  }

  if (documentsResult.error) {
    return { error: documentsResult.error };
  }

  if (chatsResult.error) {
    return { error: chatsResult.error };
  }

  const documentsData = documentsResult.payload?.data as { documents?: unknown; chunks?: unknown } | undefined;
  const chatsData = chatsResult.payload?.data as { chat_sessions?: unknown; chat_messages?: unknown } | undefined;

  if (!documentsData || !chatsData) {
    return { error: "Could not assemble export data." };
  }

  return {
    payload: backupEnvelope(
      "all",
      {
        categories: categoriesResult.error ? [] : categoriesResult.data ?? [],
        items: itemsResult.error ? [] : itemsResult.data ?? [],
        documents: documentsData.documents ?? [],
        chunks: documentsData.chunks ?? [],
        chat_sessions: chatsData.chat_sessions ?? [],
        chat_messages: chatsData.chat_messages ?? [],
      },
      warnings,
    ),
  };
}

export function jsonExportResponse(payload: unknown, filename: string) {
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
