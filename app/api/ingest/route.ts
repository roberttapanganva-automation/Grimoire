import { NextResponse } from "next/server";
import { logSupabaseError, safeApiError } from "@/lib/api-errors";
import { chunkText } from "@/lib/chunker";
import { extractTextFromDocument } from "@/lib/documentText";
import { brainSchemaMissingMessage, isMissingBrainSchemaError, mapDbDocumentToDocument, type DbDocumentRow } from "@/lib/documents";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function safeErrorMessage(message: string) {
  return message.replace(/\s+/g, " ").trim() || "Could not process document.";
}

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;

  const body = (await request.json().catch(() => null)) as { documentId?: unknown } | null;
  const documentId = typeof body?.documentId === "string" && body.documentId.trim().length > 0 ? body.documentId.trim() : null;

  if (!documentId) {
    return NextResponse.json({ error: "documentId is required." }, { status: 400 });
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (documentError) {
    logSupabaseError("ingest.document.select", documentError);
    console.error("[Ingest] document lookup failure", { documentId, message: documentError.message });

    if (isMissingBrainSchemaError(documentError)) {
      return NextResponse.json({ error: brainSchemaMissingMessage, setupRequired: true }, { status: 503 });
    }

    return NextResponse.json(safeApiError("Could not load document", documentError.message), { status: 500 });
  }

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const documentRow = document as DbDocumentRow;

  if (!documentRow.file_path) {
    console.error("[Ingest] document has no file_path", { documentId });
    await supabase
      .from("documents")
      .update({ status: "error", chunk_count: 0, error_message: "Document has no storage file path." })
      .eq("id", documentId)
      .eq("user_id", userId);
    return NextResponse.json(safeApiError("Could not process document", "Document has no storage file path."), { status: 500 });
  }

  const { error: processingError } = await supabase
    .from("documents")
    .update({ status: "processing", error_message: null })
    .eq("id", documentId)
    .eq("user_id", userId);

  if (processingError) {
    logSupabaseError("ingest.document.processing", processingError);

    if (isMissingBrainSchemaError(processingError)) {
      return NextResponse.json({ error: brainSchemaMissingMessage, setupRequired: true }, { status: 503 });
    }

    return NextResponse.json(safeApiError("Could not update document status", processingError.message), { status: 500 });
  }

  async function markDocumentError(message: string) {
    const safeMessage = safeErrorMessage(message);
    const { error: statusError } = await supabase
      .from("documents")
      .update({ status: "error", chunk_count: 0, error_message: safeMessage })
      .eq("id", documentId)
      .eq("user_id", userId);

    if (statusError) {
      logSupabaseError("ingest.document.error", statusError);
    }

    return safeMessage;
  }

  try {
    const { data: fileBlob, error: downloadError } = await supabase.storage.from("documents").download(documentRow.file_path);

    if (downloadError) {
      logSupabaseError("ingest.storage.download", downloadError);
      console.error("[Ingest] storage download failure", { documentId, filePath: documentRow.file_path, message: downloadError.message });
      throw new Error(`Storage download failed: ${downloadError.message}`);
    }

    if (!fileBlob) {
      console.error("[Ingest] storage download returned no data", { documentId, filePath: documentRow.file_path });
      throw new Error("Storage download returned no file data.");
    }

    const text = await extractTextFromDocument(documentRow.file_type, fileBlob);
    console.error("[Ingest] extracted text length", { documentId, length: text.length });
    const chunks = chunkText(text);
    console.error("[Ingest] chunk count", { documentId, count: chunks.length });

    if (chunks.length === 0) {
      throw new Error("No readable chunks could be created from this document.");
    }

    const { error: deleteChunksError } = await supabase.from("chunks").delete().eq("document_id", documentId);

    if (deleteChunksError) {
      logSupabaseError("ingest.chunks.delete", deleteChunksError);
      throw new Error(`Chunk delete failed: ${deleteChunksError.message}`);
    }

    const { error: insertChunksError } = await supabase.from("chunks").insert(
      chunks.map((chunk) => ({
        document_id: documentId,
        content: chunk.content,
        chunk_index: chunk.chunkIndex,
        token_count: chunk.tokenCount,
      })),
    );

    if (insertChunksError) {
      logSupabaseError("ingest.chunks.insert", insertChunksError);
      console.error("[Ingest] chunk insert failure", { documentId, count: chunks.length, message: insertChunksError.message });
      throw new Error(`Chunk insert failed: ${insertChunksError.message}`);
    }

    const { data: updatedDocument, error: readyError } = await supabase
      .from("documents")
      .update({ status: "ready", chunk_count: chunks.length, error_message: null })
      .eq("id", documentId)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (readyError) {
      logSupabaseError("ingest.document.ready", readyError);
      throw new Error(readyError.message);
    }

    return NextResponse.json({ document: mapDbDocumentToDocument(updatedDocument as DbDocumentRow) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not process document.";
    const safeMessage = await markDocumentError(message);
    return NextResponse.json(safeApiError("Could not process document", safeMessage), { status: 500 });
  }
}
