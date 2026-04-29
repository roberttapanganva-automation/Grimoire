import type { Category } from "@/types";

export interface DbCategoryRow {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  parent_id: string | null;
  sort_order: number | null;
  created_at: string;
}

export interface CategoryPayload {
  name: string;
  color: string;
  icon: string;
  parentId: string | null;
  sortOrder: number;
}

export function mapDbCategoryToCategory(row: DbCategoryRow): Category {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    color: row.color ?? "#F59E0B",
    icon: row.icon ?? "folder",
    parentId: row.parent_id,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
  };
}

export function validateCategoryPayload(payload: unknown): { data: CategoryPayload } | { error: string } {
  if (!payload || typeof payload !== "object") {
    return { error: "Invalid category payload." };
  }

  const value = payload as Record<string, unknown>;

  if (typeof value.name !== "string" || value.name.trim().length === 0) {
    return { error: "Category name is required." };
  }

  return {
    data: {
      name: value.name.trim(),
      color: typeof value.color === "string" && value.color.trim().length > 0 ? value.color.trim() : "#F59E0B",
      icon: typeof value.icon === "string" && value.icon.trim().length > 0 ? value.icon.trim() : "folder",
      parentId: typeof value.parentId === "string" && value.parentId.trim().length > 0 ? value.parentId.trim() : null,
      sortOrder: typeof value.sortOrder === "number" && Number.isFinite(value.sortOrder) ? value.sortOrder : 0,
    },
  };
}

export function categoryPayloadToRow(payload: CategoryPayload, userId?: string) {
  return {
    ...(userId ? { user_id: userId } : {}),
    name: payload.name,
    color: payload.color,
    icon: payload.icon,
    parent_id: payload.parentId,
    sort_order: payload.sortOrder,
  };
}
