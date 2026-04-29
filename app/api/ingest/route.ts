import { NextResponse } from "next/server";
import { logSupabaseError } from "@/lib/api-errors";
import { chunkText } from "@/lib/chunker";
import { brainSchemaMissingMessage, isDocumentFileType, isMissingBrainSchemaError, mapDbDocumentToDocument, type DbDocumentRow } from "@/lib/documents";
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

const pdfTemporarilyDisabledMessage = "PDF processing is temporarily disabled while TXT/MD chunking is being stabilized.";

function normalizeExtractedText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

async function extractTextForIngest(fileType: DbDocumentRow["file_type"], fileData: Blob) {
  if (fileType === "pdf") {
    throw new Error(pdfTemporarilyDisabledMessage);
  }

  const text = normalizeExtractedText(await fileData.text());

  if (!text) {
    throw new Error("No readable text found in this document.");
  }

  return text;
}

export async function POST(request: Request) {
  let supabase: ReturnType<typeof getSupabaseServerClient> | null = null;
  let userId: string | null = null;
  let documentId: string | null = null;

  async function fail(message: string, details?: unknown, status = 500) {
    const safeMessage = safeErrorMessage(message);
    console.error("[Brain ingest failed]", safeMessage, details);

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
      console.error("[Ingest] document lookup failure", { documentId, message: documentError.message });

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

    console.error("[Ingest] document loaded", {
      documentId,
      fileType: documentRow.file_type,
      filePathExists: Boolean(documentRow.file_path),
      fileSize: documentRow.file_size ?? 0,
    });

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

    if (documentRow.file_type === "pdf") {
      return fail(pdfTemporarilyDisabledMessage);
    }

    const { data: fileBlob, error: downloadError } = await supabase.storage.from("documents").download(documentRow.file_path);

    if (downloadError) {
      logSupabaseError("ingest.storage.download", downloadError);
      console.error("[Ingest] storage download failure", { documentId, filePath: documentRow.file_path, message: downloadError.message });
      return fail(`Storage download failed: ${downloadError.message}`, { filePathExists: Boolean(documentRow.file_path) });
    }

    if (!fileBlob) {
      console.error("[Ingest] storage download returned no data", { documentId, filePath: documentRow.file_path });
      return fail("Storage download returned no file data.");
    }

    console.error("[Ingest] storage download complete", { documentId, blobSize: fileBlob.size });
    const text = await extractTextForIngest(documentRow.file_type, fileBlob);
    console.error("[Ingest] extracted text length", { documentId, length: text.length });
    const chunks = chunkText(text);
    console.error("[Ingest] chunk count", { documentId, count: chunks.length });

    if (chunks.length === 0) {
      return fail("Text was extracted, but chunking returned zero chunks.", { textLength: text.length });
    }

    const { error: deleteChunksError } = await supabase.from("chunks").delete().eq("document_id", documentId);

    if (deleteChunksError) {
      logSupabaseError("ingest.chunks.delete", deleteChunksError);
      return fail(`Could not clear previous chunks: ${deleteChunksError.message}`, { code: deleteChunksError.code });
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
      console.error("[Ingest] chunk insert failure", { documentId, count: chunks.length, message: insertChunksError.message });
      return fail(`Chunk insert failed: ${insertChunksError.message}`, { count: chunks.length, code: insertChunksError.code });
    }

    if (!insertedChunks || insertedChunks.length !== chunks.length) {
      console.error("[Ingest] chunk insert verification failure", {
        documentId,
        expected: chunks.length,
        inserted: insertedChunks?.length ?? 0,
      });

      return fail(`Chunk insert verification failed: expected ${chunks.length}, inserted ${insertedChunks?.length ?? 0}.`);
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
      return fail(`Document processed, but status update failed: ${readyError.message}`, { code: readyError.code });
    }

    return NextResponse.json({ document: mapDbDocumentToDocument(updatedDocument as DbDocumentRow) });
  } catch (error) {
    return fail(`Unexpected ingest failure: ${getErrorMessage(error)}`);
  }
}
