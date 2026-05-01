import type { Item, ItemType } from "@/types";
import { normalizeTags } from "@/lib/tagging";

export const itemTypes: ItemType[] = ["prompt", "note", "link", "command", "snippet"];

export interface DbItemRow {
  id: string;
  user_id: string;
  type: ItemType;
  title: string;
  content: string | null;
  url: string | null;
  command: string | null;
  variables: unknown[] | null;
  tags: string[] | null;
  category_id: string | null;
  is_pinned: boolean | null;
  copy_count: number | null;
  use_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface ItemPayload {
  type: ItemType;
  title: string;
  content: string | null;
  url?: string | null;
  command?: string | null;
  variables: unknown[];
  tags: string[];
  categoryId?: string | null;
  isPinned?: boolean;
}

export function isItemType(value: unknown): value is ItemType {
  return typeof value === "string" && itemTypes.includes(value as ItemType);
}

export function mapDbItemToItem(row: DbItemRow): Item {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    content: row.content,
    url: row.url,
    command: row.command,
    variables: Array.isArray(row.variables) ? row.variables : [],
    tags: row.tags ?? [],
    categoryId: row.category_id,
    isPinned: Boolean(row.is_pinned),
    copyCount: row.copy_count ?? 0,
    useCount: row.use_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function validateItemPayload(payload: unknown): { data: ItemPayload } | { error: string } {
  if (!payload || typeof payload !== "object") {
    return { error: "Invalid item payload." };
  }

  const value = payload as Record<string, unknown>;

  if (!isItemType(value.type)) {
    return { error: "Invalid item type." };
  }

  if (typeof value.title !== "string" || value.title.trim().length === 0) {
    return { error: "Title is required." };
  }

  const tags = normalizeTags(value.tags);
  const variables = Array.isArray(value.variables) ? value.variables : [];

  const content = typeof value.content === "string" && value.content.trim().length > 0 ? value.content : null;
  const url = typeof value.url === "string" && value.url.trim().length > 0 ? value.url : null;
  const command = typeof value.command === "string" && value.command.trim().length > 0 ? value.command : null;
  const categoryId = typeof value.categoryId === "string" && value.categoryId.trim().length > 0 ? value.categoryId : null;

  if (value.type === "link" && !url) {
    return { error: "URL is required for link items." };
  }

  if (value.type === "command" && !command) {
    return { error: "Command is required for command items." };
  }

  return {
    data: {
      type: value.type,
      title: value.title.trim(),
      content,
      url,
      command,
      variables,
      tags,
      categoryId,
      isPinned: Boolean(value.isPinned),
    },
  };
}

export function itemPayloadToRow(payload: ItemPayload, userId?: string) {
  return {
    ...(userId ? { user_id: userId } : {}),
    type: payload.type,
    title: payload.title,
    content: payload.content,
    url: payload.url ?? null,
    command: payload.command ?? null,
    variables: payload.variables ?? [],
    tags: payload.tags,
    category_id: payload.categoryId ?? null,
    is_pinned: Boolean(payload.isPinned),
    updated_at: new Date().toISOString(),
  };
}
