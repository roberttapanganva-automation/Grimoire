import type { ItemType } from "@/types";
import type { LucideIcon } from "lucide-react";
import { BookOpen, Code2, FileText, Link2, Terminal } from "lucide-react";

interface TypeBadgeProps {
  type: ItemType;
}

const typeConfig: Record<
  ItemType,
  {
    label: string;
    className: string;
    Icon: LucideIcon;
  }
> = {
  prompt: {
    label: "Prompt",
    className: "border-[#6366F1]/40 bg-[#6366F1]/10 text-[#A5B4FC]",
    Icon: BookOpen,
  },
  note: {
    label: "Note",
    className: "border-[#0EA5E9]/40 bg-[#0EA5E9]/10 text-[#7DD3FC]",
    Icon: FileText,
  },
  link: {
    label: "Link",
    className: "border-[#10B981]/40 bg-[#10B981]/10 text-[#6EE7B7]",
    Icon: Link2,
  },
  command: {
    label: "Command",
    className: "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#FCD34D]",
    Icon: Terminal,
  },
  snippet: {
    label: "Snippet",
    className: "border-[#EC4899]/40 bg-[#EC4899]/10 text-[#F9A8D4]",
    Icon: Code2,
  },
};

export function TypeBadge({ type }: TypeBadgeProps) {
  const { label, className, Icon } = typeConfig[type];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[4px] border px-2 py-1 text-xs font-medium ${className}`}>
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}
