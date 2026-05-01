import { NextResponse } from "next/server";
import { buildAllExport, jsonExportResponse } from "@/lib/server/backup-export";
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

  const result = await buildAllExport(supabase, user.id);

  if (result.error) {
    return NextResponse.json({ error: "Could not export all data." }, { status: 500 });
  }

  return jsonExportResponse(result.payload, `grimoire-backup-all-${exportDate()}.json`);
}
