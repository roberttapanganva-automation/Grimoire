import { NextResponse } from "next/server";
import { logSupabaseError } from "@/lib/api-errors";
import { chunkText } from "@/lib/chunker";
import { brainSchemaMissingMessage, isDocumentFileType, isMissingBrainSchemaError, mapDbDocumentToDocument, type DbDocumentRow } from "@/lib/documents";
import { mergeTags, suggestTagsFromText } from "@/lib/server/autoTag";
import { extractDocumentText } from "@/lib/server/extractDocumentText";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function safeErrorMessage(message: string) {
  return message.replace(/\s+/g, " ").trim() || "Could not process document.";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

export async function POST(request: Request) {
  let supabase: ReturnType<typeof getSupabaseServerClient> | null = null;
  let userId: string | null = null;
  let documentId: string | null = null;

  async function fail(message: string, details?: unknown, status = 500) {
    const safeMessage = safeErrorMessage(message);
    console.error("[ingest] failed", safeMessage, details);

    if (!supabase || !documentId || !userId) {
      return NextResponse.json({ error: safeMessage }, { status });
    }

    const { data: updatedDocument, error: updateError } = await supabase
      .from("documents")
      .update({ status: "error", chunk_count: 0, error_message: safeMessage })
      .eq("id", documentId)
      .eq("user_id", userId)
      .select("id,error_message,status,chunk_count")
      .maybeSingle();

    if (updateError) {
      console.error("[Brain ingest error_message save failed]", updateError);
      logSupabaseError("ingest.document.error", updateError);

      return NextResponse.json(
        {
          error: `Original error: ${safeMessage}. Also failed to save error_message: ${updateError.message}`,
        },
        { status: 500 },
      );
    }

    if (!updatedDocument && status !== 404) {
      console.error("[Brain ingest error_message save failed]", {
        message: "No document row was updated.",
        documentId,
      });

      return NextResponse.json(
        {
          error: `Original error: ${safeMessage}. Also failed to save error_message: no document row was updated.`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ error: safeMessage }, { status });
  }

  try {
    supabase = getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return fail(`Authentication failed: ${authError.message}`);
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    userId = user.id;

    const body = (await request.json().catch(() => null)) as { documentId?: unknown } | null;
    documentId = typeof body?.documentId === "string" && body.documentId.trim().length > 0 ? body.documentId.trim() : null;

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
      console.error("[ingest] document lookup failure", { documentId, message: documentError.message });

      if (isMissingBrainSchemaError(documentError)) {
        return NextResponse.json({ error: brainSchemaMissingMessage, setupRequired: true }, { status: 500 });
      }

      return fail(`Document lookup failed: ${documentError.message}`, { code: documentError.code });
    }

    if (!document) {
      return fail("Document not found or access denied.");
    }

    const documentRow = document as DbDocumentRow;

    if (!documentRow.file_path) {
      return fail("Document file path is missing.");
    }

    if (!isDocumentFileType(documentRow.file_type)) {
      return fail(`Unsupported document type: ${documentRow.file_type}`);
    }

    console.log("[ingest] document loaded", {
      documentId,
      fileType: documentRow.file_type,
      filePathExists: Boolean(documentRow.file_path),
      fileSize: documentRow.file_size ?? 0,
    });
    console.log("[ingest] file type detected", { documentId, fileType: documentRow.file_type });

    const { error: processingError } = await supabase
      .from("documents")
      .update({ status: "processing", error_message: null })
      .eq("id", documentId)
      .eq("user_id", userId);

    if (processingError) {
      logSupabaseError("ingest.document.processing", processingError);

      if (isMissingBrainSchemaError(processingError)) {
        return NextResponse.json({ error: brainSchemaMissingMessage, setupRequired: true }, { status: 500 });
      }

      return fail(`Could not set document status to processing: ${processingError.message}`, { code: processingError.code });
    }

    const { error: deleteChunksError } = await supabase.from("chunks").delete().eq("document_id", documentId);

    if (deleteChunksError) {
      logSupabaseError("ingest.chunks.delete", deleteChunksError);
      return fail(`Could not clear previous chunks: ${deleteChunksError.message}`, { code: deleteChunksError.code });
    }

    const { data: fileBlob, error: downloadError } = await supabase.storage.from("documents").download(documentRow.file_path);

    if (downloadError) {
      logSupabaseError("ingest.storage.download", downloadError);
      console.error("[ingest] storage download failure", { documentId, filePath: documentRow.file_path, message: downloadError.message });
      return fail(`Storage download failed: ${downloadError.message}`, { filePathExists: Boolean(documentRow.file_path) });
    }

    if (!fileBlob) {
      console.error("[ingest] storage download returned no data", { documentId, filePath: documentRow.file_path });
      return fail("Storage download returned no file data.");
    }

    console.log("[ingest] storage downloaded", { documentId, blobSize: fileBlob.size });
    let text: string;
    try {
      text = await extractDocumentText({
        data: fileBlob,
        fileName: documentRow.file_name,
        fileType: documentRow.file_type,
      });
    } catch (error) {
      return fail(getErrorMessage(error));
    }

    console.log("[ingest] text extracted length", { documentId, length: text.length });
    const chunks = chunkText(text);
    console.log("[ingest] chunks created", { documentId, count: chunks.length });

    if (chunks.length === 0) {
      return fail("Text was extracted, but chunking returned zero chunks.", { textLength: text.length });
    }

    const { data: insertedChunks, error: insertChunksError } = await supabase
      .from("chunks")
      .insert(
        chunks.map((chunk) => ({
          document_id: documentId,
          content: chunk.content,
          chunk_index: chunk.chunkIndex,
          token_count: chunk.tokenCount,
        })),
      )
      .select("id");

    if (insertChunksError) {
      logSupabaseError("ingest.chunks.insert", insertChunksError);
      console.error("[ingest] chunk insert failure", { documentId, count: chunks.length, message: insertChunksError.message });
      return fail(`Chunk insert failed: ${insertChunksError.message}`, { count: chunks.length, code: insertChunksError.code });
    }

    if (!insertedChunks || insertedChunks.length !== chunks.length) {
      console.error("[ingest] chunk insert verification failure", {
        documentId,
        expected: chunks.length,
        inserted: insertedChunks?.length ?? 0,
      });

      return fail(`Chunk insert verification failed: expected ${chunks.length}, inserted ${insertedChunks?.length ?? 0}.`);
    }

    console.log("[ingest] chunks inserted", { documentId, count: insertedChunks.length });
    const suggestedTags = await suggestTagsFromText({
      title: documentRow.title,
      content: text,
      type: documentRow.file_type,
      existingTags: documentRow.tags ?? [],
      maxTags: 7,
    });
    const documentTags = mergeTags(documentRow.tags ?? [], suggestedTags);

    const { data: updatedDocument, error: readyError } = await supabase
      .from("documents")
      .update({ status: "ready", chunk_count: chunks.length, error_message: null, tags: documentTags })
      .eq("id", documentId)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (readyError) {
      logSupabaseError("ingest.document.ready", readyError);
      return fail(`Document processed, but status update failed: ${readyError.message}`, { code: readyError.code });
    }

    return NextResponse.json({ document: mapDbDocumentToDocument(updatedDocument as DbDocumentRow) });
  } catch (error) {
    return fail(`Unexpected ingest failure: ${getErrorMessage(error)}`);
  }
}
