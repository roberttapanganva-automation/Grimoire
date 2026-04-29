export type ItemType = "prompt" | "note" | "link" | "command" | "snippet";

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
