import { NextResponse } from "next/server";
import { buildLibraryExport, jsonExportResponse } from "@/lib/server/backup-export";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function exportDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await buildLibraryExport(supabase, user.id);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  return jsonExportResponse(result.payload, `grimoire-backup-library-${exportDate()}.json`);
}
