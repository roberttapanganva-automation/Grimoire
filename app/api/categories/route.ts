import { NextResponse } from "next/server";
import { logSupabaseError, safeApiError } from "@/lib/api-errors";
import { categoryPayloadToRow, mapDbCategoryToCategory, validateCategoryPayload, type DbCategoryRow } from "@/lib/categories";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    logSupabaseError("categories.GET", error);
    return NextResponse.json(safeApiError("Could not load categories", error.message), { status: 500 });
  }

  return NextResponse.json({ categories: (data as DbCategoryRow[]).map(mapDbCategoryToCategory) });
}

export async function POST(request: Request) {
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
    .insert(categoryPayloadToRow(validation.data, user.id))
    .select("*")
    .single();

  if (error) {
    logSupabaseError("categories.POST", error);
    return NextResponse.json(safeApiError("Could not create category", error.message), { status: 500 });
  }

  return NextResponse.json({ category: mapDbCategoryToCategory(data as DbCategoryRow) }, { status: 201 });
}
