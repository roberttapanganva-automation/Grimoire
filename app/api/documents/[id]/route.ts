import { NextResponse } from "next/server";
import { logSupabaseError, safeApiError } from "@/lib/api-errors";
import {
  brainSchemaMissingMessage,
  isMissingBrainSchemaError,
  mapDbDocumentChunkToChunk,
  type DbDocumentChunkRow,
  type DbDocumentRow,
} from "@/lib/documents";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface DocumentRouteContext {
  params: {
    id: string;
  };
}

export async function GET(_request: Request, { params }: DocumentRouteContext) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (documentError) {
    logSupabaseError("documents.GET.id.document", documentError);

    if (isMissingBrainSchemaError(documentError)) {
      return NextResponse.json({ error: brainSchemaMissingMessage, setupRequired: true }, { status: 503 });
    }

    return NextResponse.json(safeApiError("Could not load document", documentError.message), { status: 500 });
  }

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const { data: chunks, error: chunksError } = await supabase
    .from("chunks")
    .select("id,document_id,content,chunk_index,token_count,created_at")
    .eq("document_id", params.id)
    .order("chunk_index", { ascending: true });

  if (chunksError) {
    logSupabaseError("documents.GET.id.chunks", chunksError);

    if (isMissingBrainSchemaError(chunksError)) {
      return NextResponse.json({ error: brainSchemaMissingMessage, setupRequired: true }, { status: 503 });
    }

    return NextResponse.json(safeApiError("Could not load document chunks", chunksError.message), { status: 500 });
  }

  return NextResponse.json({
    document: {
      id: (document as DbDocumentRow).id,
      title: (document as DbDocumentRow).title,
      fileName: (document as DbDocumentRow).file_name,
      fileType: (document as DbDocumentRow).file_type,
      status: (document as DbDocumentRow).status ?? "ready",
      errorMessage: (document as DbDocumentRow).error_message ?? null,
      chunkCount: (document as DbDocumentRow).chunk_count ?? 0,
      tags: (document as DbDocumentRow).tags ?? [],
      createdAt: (document as DbDocumentRow).created_at,
    },
    chunks: ((chunks ?? []) as DbDocumentChunkRow[]).map(mapDbDocumentChunkToChunk),
  });
}

export async function DELETE(_request: Request, { params }: DocumentRouteContext) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: document, error: selectError } = await supabase
    .from("documents")
    .select("id,file_path")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (selectError) {
    logSupabaseError("documents.DELETE.select", selectError);

    if (isMissingBrainSchemaError(selectError)) {
      return NextResponse.json({ error: brainSchemaMissingMessage, setupRequired: true }, { status: 503 });
    }

    return NextResponse.json(safeApiError("Could not load document", selectError.message), { status: 500 });
  }

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const filePath = (document as Pick<DbDocumentRow, "file_path">).file_path;
  let warning: string | null = null;

  if (filePath) {
    const { error: storageError } = await supabase.storage.from("documents").remove([filePath]);

    if (storageError) {
      logSupabaseError("documents.DELETE.storageRemove", storageError);
      warning = "Document record deleted, but the storage file could not be removed.";
    }
  }

  const { error: deleteChunksError } = await supabase.from("chunks").delete().eq("document_id", params.id);

  if (deleteChunksError) {
    logSupabaseError("documents.DELETE.chunks", deleteChunksError);

    if (isMissingBrainSchemaError(deleteChunksError)) {
      return NextResponse.json({ error: brainSchemaMissingMessage, setupRequired: true }, { status: 503 });
    }

    return NextResponse.json(safeApiError("Could not delete document chunks", deleteChunksError.message), { status: 500 });
  }

  const { error } = await supabase.from("documents").delete().eq("id", params.id).eq("user_id", user.id);

  if (error) {
    logSupabaseError("documents.DELETE", error);

    if (isMissingBrainSchemaError(error)) {
      return NextResponse.json({ error: brainSchemaMissingMessage, setupRequired: true }, { status: 503 });
    }

    return NextResponse.json(safeApiError("Could not delete document", error.message), { status: 500 });
  }

  return NextResponse.json({ success: true, warning });
}
