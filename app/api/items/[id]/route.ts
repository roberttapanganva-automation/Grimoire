import { NextResponse } from "next/server";
import { logSupabaseError, safeApiError } from "@/lib/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { itemPayloadToRow, mapDbItemToItem, validateItemPayload, type DbItemRow } from "@/lib/items";

interface ItemRouteContext {
  params: {
    id: string;
  };
}

export async function PATCH(request: Request, { params }: ItemRouteContext) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const validation = validateItemPayload(await request.json().catch(() => null));

  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("items")
    .update(itemPayloadToRow(validation.data))
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    logSupabaseError("items.PATCH", error);
    return NextResponse.json(safeApiError("Could not update item", error.message), { status: 500 });
  }

  return NextResponse.json({ item: mapDbItemToItem(data as DbItemRow) });
}

export async function DELETE(_request: Request, { params }: ItemRouteContext) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.from("items").delete().eq("id", params.id).eq("user_id", user.id);

  if (error) {
    logSupabaseError("items.DELETE", error);
    return NextResponse.json(safeApiError("Could not delete item", error.message), { status: 500 });
  }

  return NextResponse.json({ success: true });
}
