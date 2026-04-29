import { NextResponse } from "next/server";
import { logSupabaseError, safeApiError } from "@/lib/api-errors";
import { type DbCategoryRow, mapDbCategoryToCategory } from "@/lib/categories";
import { type DbItemRow, mapDbItemToItem } from "@/lib/items";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ItemType } from "@/types";

const typeLabels: Record<ItemType, string> = {
  prompt: "Prompts",
  note: "Notes",
  link: "Links",
  command: "Commands",
  snippet: "Snippets",
};

function exportDate() {
  return new Date().toISOString().slice(0, 10);
}

function markdownEscape(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("`", "\\`");
}

function buildMarkdown(items: ReturnType<typeof mapDbItemToItem>[], categories: ReturnType<typeof mapDbCategoryToCategory>[]) {
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const lines: string[] = ["# Grimoire Export", "", `Exported: ${new Date().toISOString()}`, ""];

  (Object.keys(typeLabels) as ItemType[]).forEach((type) => {
    const typedItems = items.filter((item) => item.type === type);

    if (typedItems.length === 0) {
      return;
    }

    lines.push(`## ${typeLabels[type]}`, "");

    typedItems.forEach((item) => {
      lines.push(`### ${item.title}`, "");
      lines.push(`- Type: ${item.type}`);

      if (item.categoryId && categoryNames.has(item.categoryId)) {
        lines.push(`- Category: ${categoryNames.get(item.categoryId)}`);
      }

      if (item.tags.length > 0) {
        lines.push(`- Tags: ${item.tags.join(", ")}`);
      }

      if (item.url) {
        lines.push(`- URL: ${item.url}`);
      }

      lines.push(`- Copies: ${item.copyCount}`);
      lines.push(`- Uses: ${item.useCount}`);
      lines.push("");

      const body = item.command ?? item.content ?? item.url ?? "";

      if (body) {
        const fenceLanguage = item.type === "snippet" || item.type === "command" ? "" : "text";
        lines.push(`\`\`\`${fenceLanguage}`);
        lines.push(markdownEscape(body));
        lines.push("```", "");
      }
    });
  });

  return lines.join("\n");
}

export async function GET(request: Request) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "markdown" ? "markdown" : "json";

  const [itemsResult, categoriesResult] = await Promise.all([
    supabase.from("items").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }),
    supabase.from("categories").select("*").eq("user_id", user.id).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
  ]);

  if (itemsResult.error) {
    logSupabaseError("export.items", itemsResult.error);
    return NextResponse.json(safeApiError("Could not export items", itemsResult.error.message), { status: 500 });
  }

  if (categoriesResult.error) {
    logSupabaseError("export.categories", categoriesResult.error);
    return NextResponse.json(safeApiError("Could not export categories", categoriesResult.error.message), { status: 500 });
  }

  const items = (itemsResult.data as DbItemRow[]).map(mapDbItemToItem);
  const categories = (categoriesResult.data as DbCategoryRow[]).map(mapDbCategoryToCategory);
  const filenameBase = `grimoire-export-${exportDate()}`;

  if (format === "markdown") {
    return new NextResponse(buildMarkdown(items, categories), {
      headers: {
        "Content-Disposition": `attachment; filename="${filenameBase}.md"`,
        "Content-Type": "text/markdown; charset=utf-8",
      },
    });
  }

  return NextResponse.json(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      items,
      categories,
    },
    {
      headers: {
        "Content-Disposition": `attachment; filename="${filenameBase}.json"`,
      },
    },
  );
}
