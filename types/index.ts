export type ItemType = "prompt" | "note" | "link" | "command" | "snippet";

export interface Item {
  id: string;
  type: ItemType;
  title: string;
  content: string | null;
  url?: string | null;
  command?: string | null;
  tags: string[];
  categoryId?: string | null;
  isPinned: boolean;
  copyCount: number;
  useCount: number;
  createdAt: string;
  updatedAt: string;
}
