import { NextResponse } from "next/server";
import { logSupabaseError, safeApiError } from "@/lib/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";

interface CopyRouteContext {
  params: {
    id: string;
  };
}

export async function PATCH(_request: Request, { params }: CopyRouteContext) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: currentItem, error: loadError } = await supabase
    .from("items")
    .select("copy_count")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (loadError) {
    logSupabaseError("items.copy.PATCH.load", loadError);
    return NextResponse.json(safeApiError("Could not update copy count", loadError.message), { status: 500 });
  }

  const copyCount = ((currentItem?.copy_count as number | null) ?? 0) + 1;
  const { error } = await supabase
    .from("items")
    .update({ copy_count: copyCount, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    logSupabaseError("items.copy.PATCH.update", error);
    return NextResponse.json(safeApiError("Could not update copy count", error.message), { status: 500 });
  }

  return NextResponse.json({ copy_count: copyCount, copyCount });
}
