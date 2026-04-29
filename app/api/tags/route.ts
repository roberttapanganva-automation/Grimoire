import { NextResponse } from "next/server";
import { logSupabaseError, safeApiError } from "@/lib/api-errors";
import { type DbItemRow } from "@/lib/items";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { deriveTagSummaries, getRowTags, normalizeTag, removeTag, replaceTag } from "@/lib/tags";

type TagItemRow = Pick<DbItemRow, "id" | "tags">;

async function getUserTagRows() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data, error } = await supabase.from("items").select("id,tags").eq("user_id", user.id);

  if (error) {
    logSupabaseError("tags.selectItems", error);
    return { errorResponse: NextResponse.json(safeApiError("Could not load tags", error.message), { status: 500 }) };
  }

  return { supabase, user, rows: data as TagItemRow[] };
}

export async function GET() {
  const result = await getUserTagRows();

  if ("errorResponse" in result) {
    return result.errorResponse;
  }

  return NextResponse.json({ tags: deriveTagSummaries(result.rows) });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as { oldTag?: unknown; newTag?: unknown } | null;
  const oldTag = normalizeTag(body?.oldTag);
  const newTag = normalizeTag(body?.newTag);

  if (!oldTag || !newTag) {
    return NextResponse.json({ error: "Old tag and new tag are required." }, { status: 400 });
  }

  if (oldTag === newTag) {
    return NextResponse.json({ error: "Choose a different tag name." }, { status: 400 });
  }

  const result = await getUserTagRows();

  if ("errorResponse" in result) {
    return result.errorResponse;
  }

  const matchingRows = result.rows.filter((row) => getRowTags(row).includes(oldTag));

  const updates = await Promise.all(
    matchingRows.map((row) =>
      result.supabase
        .from("items")
        .update({ tags: replaceTag(row.tags, oldTag, newTag), updated_at: new Date().toISOString() })
        .eq("id", row.id)
        .eq("user_id", result.user.id),
    ),
  );

  const updateError = updates.find((update) => update.error)?.error;

  if (updateError) {
    logSupabaseError("tags.PATCH", updateError);
    return NextResponse.json(safeApiError("Could not rename tag", updateError.message), { status: 500 });
  }

  return NextResponse.json({ success: true, updatedCount: matchingRows.length });
}

export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => null)) as { tag?: unknown } | null;
  const tag = normalizeTag(body?.tag);

  if (!tag) {
    return NextResponse.json({ error: "Tag is required." }, { status: 400 });
  }

  const result = await getUserTagRows();

  if ("errorResponse" in result) {
    return result.errorResponse;
  }

  const matchingRows = result.rows.filter((row) => getRowTags(row).includes(tag));

  const updates = await Promise.all(
    matchingRows.map((row) =>
      result.supabase
        .from("items")
        .update({ tags: removeTag(row.tags, tag), updated_at: new Date().toISOString() })
        .eq("id", row.id)
        .eq("user_id", result.user.id),
    ),
  );

  const updateError = updates.find((update) => update.error)?.error;

  if (updateError) {
    logSupabaseError("tags.DELETE", updateError);
    return NextResponse.json(safeApiError("Could not delete tag", updateError.message), { status: 500 });
  }

  return NextResponse.json({ success: true, updatedCount: matchingRows.length });
}
