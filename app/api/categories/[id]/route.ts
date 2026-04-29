import { NextResponse } from "next/server";
import { logSupabaseError, safeApiError } from "@/lib/api-errors";
import { categoryPayloadToRow, mapDbCategoryToCategory, validateCategoryPayload, type DbCategoryRow } from "@/lib/categories";
import { getSupabaseServerClient } from "@/lib/supabase/server";

interface CategoryRouteContext {
  params: {
    id: string;
  };
}

export async function PATCH(request: Request, { params }: CategoryRouteContext) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const validation = validateCategoryPayload(await request.json().catch(() => null));

  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("categories")
    .update(categoryPayloadToRow(validation.data))
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    logSupabaseError("categories.PATCH", error);
    return NextResponse.json(safeApiError("Could not update category", error.message), { status: 500 });
  }

  return NextResponse.json({ category: mapDbCategoryToCategory(data as DbCategoryRow) });
}

export async function DELETE(_request: Request, { params }: CategoryRouteContext) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: clearItemsError } = await supabase
    .from("items")
    .update({ category_id: null, updated_at: new Date().toISOString() })
    .eq("category_id", params.id)
    .eq("user_id", user.id);

  if (clearItemsError) {
    logSupabaseError("categories.DELETE.clearItems", clearItemsError);
    return NextResponse.json(safeApiError("Could not clear category from items", clearItemsError.message), { status: 500 });
  }

  const { error } = await supabase.from("categories").delete().eq("id", params.id).eq("user_id", user.id);

  if (error) {
    logSupabaseError("categories.DELETE", error);
    return NextResponse.json(safeApiError("Could not delete category", error.message), { status: 500 });
  }

  return NextResponse.json({ success: true });
}
