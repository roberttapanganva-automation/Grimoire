import { NextResponse } from "next/server";
import { logSupabaseError, safeApiError } from "@/lib/api-errors";
import {
  brainSchemaMissingMessage,
  getSafeFileName,
  getTitleFromFileName,
  isMissingBrainSchemaError,
  isStorageRlsError,
  mapDbDocumentToDocument,
  storageRlsMessage,
  validateDocumentFile,
  type DbDocumentRow,
} from "@/lib/documents";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function storageBucketError(message?: string | null) {
  const detail = message ? ` Supabase said: ${message}` : "";
  return `Could not access the Supabase Storage bucket named "documents". Create it in Supabase Storage and try again.${detail}`;
}

function storageUploadError(message?: string | null) {
  const detail = message ? ` Supabase said: ${message}` : "";
  return `Could not upload document.${detail}`;
}

export async function GET() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    logSupabaseError("documents.GET", error);

    if (isMissingBrainSchemaError(error)) {
      return NextResponse.json({ error: brainSchemaMissingMessage, setupRequired: true }, { status: 503 });
    }

    return NextResponse.json(safeApiError("Could not load documents", error.message), { status: 500 });
  }

  return NextResponse.json({ documents: (data as DbDocumentRow[]).map(mapDbDocumentToDocument) });
}

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a document file to upload." }, { status: 400 });
  }

  const validation = validateDocumentFile(file);

  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const documentId = crypto.randomUUID();
  const safeFileName = getSafeFileName(file.name);
  const storagePath = `${user.id}/${documentId}/${safeFileName}`;

  const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (uploadError) {
    logSupabaseError("documents.POST.storageUpload", uploadError);

    if (isStorageRlsError(uploadError)) {
      return NextResponse.json(safeApiError("Could not upload document", storageRlsMessage), { status: 403 });
    }

    return NextResponse.json(safeApiError("Could not upload document", storageUploadError(uploadError.message)), { status: 500 });
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      id: documentId,
      user_id: user.id,
      title: getTitleFromFileName(file.name),
      file_name: file.name,
      file_path: storagePath,
      file_type: validation.fileType,
      file_size: file.size,
      source_url: null,
      status: "ready",
      error_message: null,
      chunk_count: 0,
      category_id: null,
      tags: [],
    })
    .select("*")
    .single();

  if (error) {
    logSupabaseError("documents.POST.insert", error);
    await supabase.storage.from("documents").remove([storagePath]);

    if (isMissingBrainSchemaError(error)) {
      return NextResponse.json({ error: brainSchemaMissingMessage, setupRequired: true }, { status: 503 });
    }

    return NextResponse.json(safeApiError("Could not save document metadata", error.message), { status: 500 });
  }

  return NextResponse.json({ document: mapDbDocumentToDocument(data as DbDocumentRow) }, { status: 201 });
}
