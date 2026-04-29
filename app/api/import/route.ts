import { NextResponse } from "next/server";
import { logSupabaseError, safeApiError } from "@/lib/api-errors";
import { categoryPayloadToRow, mapDbCategoryToCategory, type DbCategoryRow } from "@/lib/categories";
import { isItemType, mapDbItemToItem, type DbItemRow } from "@/lib/items";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { uniqueTags } from "@/lib/tags";
import type { Category, Item } from "@/types";

interface ImportPayload {
  version?: unknown;
  exportedAt?: unknown;
  items?: unknown;
  categories?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readString(value: Record<string, unknown>, camelKey: string, snakeKey?: string) {
  const candidate = value[camelKey] ?? (snakeKey ? value[snakeKey] : undefined);
  return typeof candidate === "string" ? candidate.trim() : "";
}

function readNullableString(value: Record<string, unknown>, camelKey: string, snakeKey?: string) {
  const text = readString(value, camelKey, snakeKey);
  return text.length > 0 ? text : null;
}

function readNumber(value: Record<string, unknown>, camelKey: string, snakeKey?: string) {
  const candidate = value[camelKey] ?? (snakeKey ? value[snakeKey] : undefined);
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : 0;
}

function readBoolean(value: Record<string, unknown>, camelKey: string, snakeKey?: string) {
  return Boolean(value[camelKey] ?? (snakeKey ? value[snakeKey] : undefined));
}

function parseCategories(payload: ImportPayload): Array<Partial<Category> & { sourceId: string | null }> {
  if (!Array.isArray(payload.categories)) {
    return [];
  }

  return payload.categories.flatMap((category) => {
    const value = asRecord(category);

    if (!value) {
      return [];
    }

    const name = readString(value, "name");

    if (!name) {
      return [];
    }

    return [
      {
        sourceId: readNullableString(value, "id"),
        name,
        color: readString(value, "color") || "#F59E0B",
        icon: readString(value, "icon") || "folder",
        parentId: readNullableString(value, "parentId", "parent_id"),
        sortOrder: readNumber(value, "sortOrder", "sort_order"),
      },
    ];
  });
}

function parseItems(payload: ImportPayload): Array<Partial<Item> & { sourceCategoryId: string | null }> {
  if (!Array.isArray(payload.items)) {
    return [];
  }

  return payload.items.flatMap((item) => {
    const value = asRecord(item);

    if (!value || !isItemType(value.type)) {
      return [];
    }

    const title = readString(value, "title");

    if (!title) {
      return [];
    }

    return [
      {
        type: value.type,
        title,
        content: readNullableString(value, "content"),
        url: readNullableString(value, "url"),
        command: readNullableString(value, "command"),
        variables: Array.isArray(value.variables) ? value.variables : [],
        tags: uniqueTags(value.tags),
        sourceCategoryId: readNullableString(value, "categoryId", "category_id"),
        isPinned: readBoolean(value, "isPinned", "is_pinned"),
        copyCount: readNumber(value, "copyCount", "copy_count"),
        useCount: readNumber(value, "useCount", "use_count"),
      },
    ];
  });
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as ImportPayload | null;

  if (!payload || typeof payload !== "object" || !Array.isArray(payload.items) || !Array.isArray(payload.categories)) {
    return NextResponse.json({ error: "Import file must include items and categories arrays." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: existingCategoryRows, error: categoriesError } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (categoriesError) {
    logSupabaseError("import.categories.select", categoriesError);
    return NextResponse.json(safeApiError("Could not load categories", categoriesError.message), { status: 500 });
  }

  const existingCategories = (existingCategoryRows as DbCategoryRow[]).map(mapDbCategoryToCategory);
  const categoriesByName = new Map(existingCategories.map((category) => [category.name.toLowerCase(), category]));
  const categoryIdMap = new Map<string, string>();
  let importedCategoryCount = 0;

  for (const category of parseCategories(payload)) {
    const existingCategory = categoriesByName.get(String(category.name).toLowerCase());

    if (existingCategory) {
      if (category.sourceId) {
        categoryIdMap.set(category.sourceId, existingCategory.id);
      }
      continue;
    }

    const { data, error } = await supabase
      .from("categories")
      .insert(
        categoryPayloadToRow(
          {
            name: String(category.name),
            color: category.color ?? "#F59E0B",
            icon: category.icon ?? "folder",
            parentId: null,
            sortOrder: category.sortOrder ?? 0,
          },
          user.id,
        ),
      )
      .select("*")
      .single();

    if (error) {
      logSupabaseError("import.categories.insert", error);
      return NextResponse.json(safeApiError("Could not import categories", error.message), { status: 500 });
    }

    const createdCategory = mapDbCategoryToCategory(data as DbCategoryRow);
    importedCategoryCount += 1;
    categoriesByName.set(createdCategory.name.toLowerCase(), createdCategory);

    if (category.sourceId) {
      categoryIdMap.set(category.sourceId, createdCategory.id);
    }
  }

  const importedItems = parseItems(payload);
  const insertedItems: Item[] = [];

  for (const item of importedItems) {
    const categoryId = item.sourceCategoryId ? categoryIdMap.get(item.sourceCategoryId) ?? null : null;

    const { data, error } = await supabase
      .from("items")
      .insert({
        user_id: user.id,
        type: item.type,
        title: item.title,
        content: item.content ?? null,
        url: item.url ?? null,
        command: item.command ?? null,
        variables: item.variables ?? [],
        tags: item.tags ?? [],
        category_id: categoryId,
        is_pinned: Boolean(item.isPinned),
        copy_count: item.copyCount ?? 0,
        use_count: item.useCount ?? 0,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      logSupabaseError("import.items.insert", error);
      return NextResponse.json(safeApiError("Could not import items", error.message), { status: 500 });
    }

    insertedItems.push(mapDbItemToItem(data as DbItemRow));
  }

  return NextResponse.json({
    imported: {
      categories: importedCategoryCount,
      items: insertedItems.length,
    },
    skipped: {
      categories: Array.isArray(payload.categories) ? payload.categories.length - parseCategories(payload).length : 0,
      items: Array.isArray(payload.items) ? payload.items.length - importedItems.length : 0,
    },
  });
}
