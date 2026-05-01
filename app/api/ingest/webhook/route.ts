import { NextResponse } from "next/server";
import { logSupabaseError } from "@/lib/api-errors";
import { chunkText } from "@/lib/chunker";
import { getSafeFileName, mapDbDocumentToDocument, type DbDocumentRow } from "@/lib/documents";
import { isItemType, mapDbItemToItem, type DbItemRow } from "@/lib/items";
import { embedDocumentText, getGeminiApiKey } from "@/lib/server/gemini";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { normalizeTags } from "@/lib/tagging";

export const runtime = "nodejs";

const maxDocumentContentLength = 100_000;

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readTags(value: unknown) {
  return normalizeTags(value).slice(0, 15);
}

function safeErrorMessage(message: string) {
  return message.replace(/\s+/g, " ").trim() || "Ingestion failed.";
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";

  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  return request.headers.get("x-ingest-secret")?.trim() ?? "";
}

function isAuthorized(request: Request) {
  const expectedSecret = process.env.N8N_INGEST_SECRET?.trim();
  const actualSecret = getBearerToken(request);

  return Boolean(expectedSecret && actualSecret && actualSecret === expectedSecret);
}

function getIngestUserId() {
  return process.env.N8N_INGEST_USER_ID?.trim() || null;
}

function defaultCategoryIcon(target: "item" | "document", type?: string) {
  if (target === "document") {
    return "file-text";
  }

  if (type === "prompt") return "brain";
  if (type === "note") return "book";
  if (type === "command") return "terminal";
  if (type === "link") return "link";
  if (type === "snippet") return "code";
  return "folder";
}

async function resolveCategoryId({
  categoryName,
  icon,
  supabase,
  userId,
}: {
  categoryName: string;
  icon: string;
  supabase: ReturnType<typeof getSupabaseServiceClient>;
  userId: string;
}) {
  if (!categoryName) {
    return null;
  }

  const { data: existing, error: lookupError } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", userId)
    .ilike("name", categoryName)
    .maybeSingle();

  if (lookupError) {
    logSupabaseError("n8n-ingest.category.lookup", lookupError);
    throw new Error(`Could not resolve category: ${lookupError.message}`);
  }

  if (existing) {
    console.info("[n8n-ingest] category resolved", { created: false });
    return (existing as { id: string }).id;
  }

  const { data: created, error: createError } = await supabase
    .from("categories")
    .insert({
      user_id: userId,
      name: categoryName,
      color: "#F59E0B",
      icon,
      parent_id: null,
      sort_order: 0,
    })
    .select("*")
    .single();

  if (createError) {
    logSupabaseError("n8n-ingest.category.create", createError);
    throw new Error(`Could not create category: ${createError.message}`);
  }

  console.info("[n8n-ingest] category resolved", { created: true });
  return (created as { id: string }).id;
}

async function markDocumentError({
  documentId,
  message,
  supabase,
  userId,
}: {
  documentId: string | null;
  message: string;
  supabase: ReturnType<typeof getSupabaseServiceClient>;
  userId: string;
}) {
  if (!documentId) {
    return;
  }

  const { error } = await supabase
    .from("documents")
    .update({ status: "error", error_message: safeErrorMessage(message), chunk_count: 0 })
    .eq("id", documentId)
    .eq("user_id", userId);

  if (error) {
    logSupabaseError("n8n-ingest.document.error", error);
  }
}

export async function POST(request: Request) {
  console.info("[n8n-ingest] request received");

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized ingestion request." }, { status: 401 });
  }

  console.info("[n8n-ingest] auth ok");

  const userId = getIngestUserId();

  if (!userId) {
    return NextResponse.json({ error: "N8N ingestion user id is not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const target = readString(body.target);
  const title = readString(body.title);
  const content = readString(body.content);
  const tags = readTags(body.tags);
  const categoryName = readString(body.categoryName);
  const sourceUrl = readString(body.sourceUrl) || null;
  const supabase = getSupabaseServiceClient();

  if (target !== "item" && target !== "document") {
    return NextResponse.json({ error: "target must be item or document." }, { status: 400 });
  }

  if (!title) {
    return NextResponse.json({ error: "title is required." }, { status: 400 });
  }

  console.info("[n8n-ingest] target", target);

  try {
    if (target === "item") {
      const type = readString(body.type);
      const url = readString(body.url) || null;
      const command = readString(body.command) || null;

      if (!isItemType(type)) {
        return NextResponse.json({ error: "Invalid item type." }, { status: 400 });
      }

      if (!content && !url && !command) {
        return NextResponse.json({ error: "Item ingestion requires content, url, or command." }, { status: 400 });
      }

      const categoryId = await resolveCategoryId({
        categoryName,
        icon: defaultCategoryIcon("item", type),
        supabase,
        userId,
      });

      const { data, error } = await supabase
        .from("items")
        .insert({
          user_id: userId,
          type,
          title,
          content: content || null,
          url,
          command,
          variables: [],
          tags,
          category_id: categoryId,
          is_pinned: Boolean(body.isPinned),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) {
        logSupabaseError("n8n-ingest.item.insert", error);
        throw new Error(`Could not insert item: ${error.message}`);
      }

      console.info("[n8n-ingest] item inserted");
      console.info("[n8n-ingest] complete", { target });

      return NextResponse.json({
        success: true,
        target,
        item: mapDbItemToItem(data as DbItemRow),
      });
    }

    if (!content) {
      return NextResponse.json({ error: "Document ingestion requires non-empty content." }, { status: 400 });
    }

    if (content.length > maxDocumentContentLength) {
      return NextResponse.json({ error: "Document content exceeds the 100,000 character MVP limit." }, { status: 400 });
    }

    const apiKey = getGeminiApiKey();

    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is not configured." }, { status: 500 });
    }

    const categoryId = await resolveCategoryId({
      categoryName,
      icon: defaultCategoryIcon("document"),
      supabase,
      userId,
    });
    const documentId = crypto.randomUUID();
    const fileName = getSafeFileName(`${title}.txt`);
    const fileSize = new TextEncoder().encode(content).length;

    const { data: createdDocument, error: createDocumentError } = await supabase
      .from("documents")
      .insert({
        id: documentId,
        user_id: userId,
        title,
        file_name: fileName,
        file_path: null,
        file_type: "txt",
        file_size: fileSize,
        source_url: sourceUrl,
        status: "processing",
        error_message: null,
        chunk_count: 0,
        category_id: categoryId,
        tags,
      })
      .select("*")
      .single();

    if (createDocumentError) {
      logSupabaseError("n8n-ingest.document.create", createDocumentError);
      throw new Error(`Could not create document: ${createDocumentError.message}`);
    }

    console.info("[n8n-ingest] document created");

    try {
      const chunks = chunkText(content);
      console.info("[n8n-ingest] chunks created", { count: chunks.length });

      if (chunks.length === 0) {
        throw new Error("Chunking returned no chunks.");
      }

      const chunkRows = [];

      for (const chunk of chunks) {
        const embedding = await embedDocumentText(chunk.content, apiKey, title);
        chunkRows.push({
          document_id: documentId,
          content: chunk.content,
          embedding,
          chunk_index: chunk.chunkIndex,
          token_count: chunk.tokenCount,
        });
      }

      console.info("[n8n-ingest] embeddings generated", { count: chunkRows.length });

      const { data: insertedChunks, error: insertChunksError } = await supabase.from("chunks").insert(chunkRows).select("id");

      if (insertChunksError) {
        logSupabaseError("n8n-ingest.chunks.insert", insertChunksError);
        throw new Error(`Could not insert chunks: ${insertChunksError.message}`);
      }

      console.info("[n8n-ingest] chunks inserted", { count: insertedChunks?.length ?? 0 });

      const { data: readyDocument, error: readyError } = await supabase
        .from("documents")
        .update({ status: "ready", chunk_count: chunks.length, error_message: null })
        .eq("id", documentId)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (readyError) {
        logSupabaseError("n8n-ingest.document.ready", readyError);
        throw new Error(`Could not mark document ready: ${readyError.message}`);
      }

      console.info("[n8n-ingest] complete", { target, chunks: chunks.length });

      return NextResponse.json({
        success: true,
        target,
        document: mapDbDocumentToDocument((readyDocument ?? createdDocument) as DbDocumentRow),
        chunks: chunks.length,
      });
    } catch (documentError) {
      const message = documentError instanceof Error ? documentError.message : "Document ingestion failed.";
      console.error("[n8n-ingest] failed", safeErrorMessage(message));
      await markDocumentError({ documentId, message, supabase, userId });
      return NextResponse.json({ error: safeErrorMessage(message) }, { status: 500 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingestion failed.";
    console.error("[n8n-ingest] failed", safeErrorMessage(message));
    return NextResponse.json({ error: safeErrorMessage(message) }, { status: 500 });
  }
}
