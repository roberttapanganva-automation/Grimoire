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
  const contentForTags = [payload.title, payload.content, payload.command, payload.url, payload.type].filter(Boolean).join("\n");
  const shouldAutoTag = payload.tags.length === 0;

  console.info("[auto-tag:item] received item create");
  console.info("[auto-tag:item] type", payload.type);
  console.info("[auto-tag:item] title length", payload.title.length);
  console.info("[auto-tag:item] content length", contentForTags.length);
  console.info("[auto-tag:item] normalized user tags", payload.tags);
  console.info("[auto-tag:item] should auto tag", shouldAutoTag);
  console.info("[auto-tag:item] gemini key exists", Boolean(process.env.GEMINI_API_KEY?.trim()));

  if (shouldAutoTag) {
    const suggestedTags = await suggestTagsFromText({
      title: payload.title,
      content: contentForTags,
      type: payload.type,
      maxTags: 7,
      diagnosticPrefix: "[auto-tag:item]",
    });
    payload.tags = mergeTags([], suggestedTags);
  }

  console.info("[auto-tag:item] final saved tags", payload.tags);

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

  const item = mapDbItemToItem(data as DbItemRow);
  console.info("[auto-tag:item] saved item tags", item.tags);

  return NextResponse.json({ item }, { status: 201 });
}
