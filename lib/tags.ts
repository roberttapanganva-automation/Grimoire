import type { Item } from "@/types";
import type { DbItemRow } from "@/lib/items";

export interface TagSummary {
  name: string;
  count: number;
}

export function normalizeTag(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const tag = value.trim();
  return tag.length > 0 ? tag : null;
}

export function uniqueTags(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const seen = new Set<string>();
  const tags: string[] = [];

  values.forEach((value) => {
    const tag = normalizeTag(value);

    if (!tag || seen.has(tag)) {
      return;
    }

    seen.add(tag);
    tags.push(tag);
  });

  return tags;
}

export function getRowTags(row: Pick<DbItemRow, "tags">): string[] {
  return uniqueTags(row.tags);
}

export function deriveTagSummaries(items: Array<Pick<Item, "tags"> | Pick<DbItemRow, "tags">>): TagSummary[] {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    uniqueTags(item.tags).forEach((tag) => {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function replaceTag(tags: string[] | null, oldTag: string, newTag: string): string[] {
  const nextTags: string[] = [];

  uniqueTags(tags).forEach((tag) => {
    const nextTag = tag === oldTag ? newTag : tag;

    if (!nextTags.includes(nextTag)) {
      nextTags.push(nextTag);
    }
  });

  return nextTags;
}

export function removeTag(tags: string[] | null, tagToRemove: string): string[] {
  return uniqueTags(tags).filter((tag) => tag !== tagToRemove);
}
