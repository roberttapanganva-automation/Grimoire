import { NextResponse } from "next/server";
import { logSupabaseError, safeApiError } from "@/lib/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { mergeTags, suggestTagsFromText } from "@/lib/server/autoTag";
import { itemPayloadToRow, mapDbItemToItem, validateItemPayload, type DbItemRow } from "@/lib/items";

export async function GET() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    logSupabaseError("items.GET", error);
    return NextResponse.json(safeApiError("Could not load items", error.message), { status: 500 });
  }

  return NextResponse.json({ items: (data as DbItemRow[]).map(mapDbItemToItem) });
}

export async function POST(request: Request) {
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

  const payload = validation.data;

  if (payload.tags.length === 0) {
    const suggestedTags = await suggestTagsFromText({
      title: payload.title,
      content: [payload.content, payload.command, payload.url, payload.type].filter(Boolean).join("\n"),
      maxTags: 5,
    });
    payload.tags = mergeTags([], suggestedTags);
  }

  // user_id is always derived from the authenticated session, never from client input.
  const { data, error } = await supabase
    .from("items")
    .insert(itemPayloadToRow(payload, user.id))
    .select("*")
    .single();

  if (error) {
    logSupabaseError("items.POST", error);
    return NextResponse.json(safeApiError("Could not create item", error.message), { status: 500 });
  }

  return NextResponse.json({ item: mapDbItemToItem(data as DbItemRow) }, { status: 201 });
}
