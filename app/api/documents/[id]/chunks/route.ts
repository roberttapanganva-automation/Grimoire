import { NextResponse } from "next/server";
import { logSupabaseError, safeApiError } from "@/lib/api-errors";
import { brainSchemaMissingMessage, isMissingBrainSchemaError, mapDbDocumentChunkToChunk, type DbDocumentChunkRow } from "@/lib/documents";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface DocumentChunksRouteContext {
  params: {
    id: string;
  };
}

export async function GET(_request: Request, { params }: DocumentChunksRouteContext) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (documentError) {
    logSupabaseError("documentChunks.document.select", documentError);

    if (isMissingBrainSchemaError(documentError)) {
      return NextResponse.json({ error: brainSchemaMissingMessage, setupRequired: true }, { status: 503 });
    }

    return NextResponse.json(safeApiError("Could not load document", documentError.message), { status: 500 });
  }

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("chunks")
    .select("id,document_id,content,chunk_index,token_count,created_at")
    .eq("document_id", params.id)
    .order("chunk_index", { ascending: true });

  if (error) {
    logSupabaseError("documentChunks.GET", error);

    if (isMissingBrainSchemaError(error)) {
      return NextResponse.json({ error: brainSchemaMissingMessage, setupRequired: true }, { status: 503 });
    }

    return NextResponse.json(safeApiError("Could not load chunks", error.message), { status: 500 });
  }

  return NextResponse.json({ chunks: (data as DbDocumentChunkRow[]).map(mapDbDocumentChunkToChunk) });
}
