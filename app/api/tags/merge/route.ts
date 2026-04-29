import { NextResponse } from "next/server";
import { logSupabaseError, safeApiError } from "@/lib/api-errors";
import { type DbItemRow } from "@/lib/items";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getRowTags, normalizeTag, replaceTag } from "@/lib/tags";

type TagItemRow = Pick<DbItemRow, "id" | "tags">;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { sourceTag?: unknown; targetTag?: unknown } | null;
  const sourceTag = normalizeTag(body?.sourceTag);
  const targetTag = normalizeTag(body?.targetTag);

  if (!sourceTag || !targetTag) {
    return NextResponse.json({ error: "Source tag and target tag are required." }, { status: 400 });
  }

  if (sourceTag === targetTag) {
    return NextResponse.json({ error: "Choose two different tags." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.from("items").select("id,tags").eq("user_id", user.id);

  if (error) {
    logSupabaseError("tags.merge.selectItems", error);
    return NextResponse.json(safeApiError("Could not load tags", error.message), { status: 500 });
  }

  const matchingRows = (data as TagItemRow[]).filter((row) => getRowTags(row).includes(sourceTag));

  const updates = await Promise.all(
    matchingRows.map((row) =>
      supabase
        .from("items")
        .update({ tags: replaceTag(row.tags, sourceTag, targetTag), updated_at: new Date().toISOString() })
        .eq("id", row.id)
        .eq("user_id", user.id),
    ),
  );

  const updateError = updates.find((update) => update.error)?.error;

  if (updateError) {
    logSupabaseError("tags.merge.POST", updateError);
    return NextResponse.json(safeApiError("Could not merge tags", updateError.message), { status: 500 });
  }

  return NextResponse.json({ success: true, updatedCount: matchingRows.length });
}
