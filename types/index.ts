export type ItemType = "prompt" | "note" | "link" | "command" | "snippet";
export type SortMode = "recent" | "mostUsed" | "alphabetical" | "pinnedFirst";
export type ViewMode = "grid" | "list" | "compact";
export type DocumentFileType = "pdf" | "txt" | "md";
export type DocumentStatus = "ready" | "uploading" | "error";

export interface Category {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface Item {
  id: string;
  userId?: string;
  type: ItemType;
  title: string;
  content: string | null;
  url?: string | null;
  command?: string | null;
  variables: unknown[];
  tags: string[];
  categoryId?: string | null;
  isPinned: boolean;
  copyCount: number;
  useCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ItemFormValues {
  type: ItemType;
  title: string;
  content: string;
  url: string;
  command: string;
  variables: unknown[];
  tags: string;
  categoryId: string;
  isPinned: boolean;
}

export interface Document {
  id: string;
  userId: string;
  title: string;
  fileName: string;
  filePath: string;
  fileType: DocumentFileType;
  fileSize: number;
  sourceUrl: string | null;
  status: DocumentStatus;
  chunkCount: number;
  categoryId: string | null;
  tags: string[];
  createdAt: string;
}
