import {
  BookOpen,
  Bot,
  Brain,
  Briefcase,
  Code2,
  Database,
  FileText,
  Folder,
  Link,
  MessageSquare,
  Settings,
  Terminal,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICON_OPTIONS = [
  { value: "folder", label: "Folder" },
  { value: "book", label: "Book" },
  { value: "terminal", label: "Terminal" },
  { value: "link", label: "Link" },
  { value: "brain", label: "Brain" },
  { value: "file-text", label: "File text" },
  { value: "message-square", label: "Message square" },
  { value: "briefcase", label: "Briefcase" },
  { value: "code", label: "Code" },
  { value: "database", label: "Database" },
  { value: "bot", label: "Bot" },
  { value: "settings", label: "Settings" },
] as const;

const categoryIconMap: Record<(typeof CATEGORY_ICON_OPTIONS)[number]["value"], LucideIcon> = {
  folder: Folder,
  book: BookOpen,
  terminal: Terminal,
  link: Link,
  brain: Brain,
  "file-text": FileText,
  "message-square": MessageSquare,
  briefcase: Briefcase,
  code: Code2,
  database: Database,
  bot: Bot,
  settings: Settings,
};

export function getCategoryIcon(iconName: string | null | undefined) {
  const key = iconName?.trim() as keyof typeof categoryIconMap | undefined;
  return key && categoryIconMap[key] ? categoryIconMap[key] : Folder;
}
