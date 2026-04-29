import { NextResponse } from "next/server";
import { logSupabaseError, safeApiError } from "@/lib/api-errors";
import { type DbDocumentRow } from "@/lib/documents";
import { getSupabaseServerClient } from "@/lib/supabase/server";

interface DocumentRouteContext {
  params: {
    id: string;
  };
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
    return NextResponse.json(safeApiError("Could not load document", selectError.message), { status: 500 });
  }

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const filePath = (document as Pick<DbDocumentRow, "file_path">).file_path;
  const { error: storageError } = await supabase.storage.from("documents").remove([filePath]);

  if (storageError) {
    logSupabaseError("documents.DELETE.storageRemove", storageError);
    return NextResponse.json(safeApiError("Could not delete document file", storageError.message), { status: 500 });
  }

  const { error } = await supabase.from("documents").delete().eq("id", params.id).eq("user_id", user.id);

  if (error) {
    logSupabaseError("documents.DELETE", error);
    return NextResponse.json(safeApiError("Could not delete document", error.message), { status: 500 });
  }

  return NextResponse.json({ success: true });
}
