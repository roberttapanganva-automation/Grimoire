"use client";

import type { Item } from "@/types";
import { CopyButton } from "@/components/items/CopyButton";
import { TagChip } from "@/components/ui/TagChip";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { Pin } from "lucide-react";

interface ItemRowProps {
  item: Item;
  isSelected: boolean;
  isCompact?: boolean;
  onCopy: () => void;
  onSelect: () => void;
  onTagSelect?: (tag: string) => void;
  onCopyCountChange?: (copyCount: number) => void;
}

function getCopyContent(item: Item) {
  return item.command ?? item.content ?? item.url ?? "";
}

function getPreview(item: Item) {
  return item.command ?? item.content ?? item.url ?? "No content yet.";
}

export function ItemRow({ item, isSelected, isCompact = false, onCopy, onSelect, onTagSelect, onCopyCountChange }: ItemRowProps) {
  const isMono = item.type === "prompt" || item.type === "command" || item.type === "snippet";

  return (
    <article
      className={`rounded-[6px] border bg-[#1A1D27] transition-colors duration-150 hover:bg-[#21243A] ${
        isSelected ? "border-[#F59E0B]" : "border-[#2A2D3E]"
      }`}
    >
      <div className={`grid gap-4 p-4 ${isCompact ? "md:grid-cols-[1fr_auto]" : "md:grid-cols-[minmax(0,1fr)_auto]"}`}>
        <button type="button" onClick={onSelect} className="min-w-0 text-left focus:outline-none focus:ring-1 focus:ring-amber-400">
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={item.type} />
            {item.isPinned ? <Pin className="size-4 text-amber-400" aria-label="Pinned item" /> : null}
            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-[#E2E8F0]">{item.title}</h3>
          </div>
          {!isCompact ? (
            <p className={`mt-2 line-clamp-2 text-sm leading-6 text-[#64748B] ${isMono ? "font-mono" : ""}`}>{getPreview(item)}</p>
          ) : null}
        </button>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {!isCompact
            ? item.tags.slice(0, 3).map((tag) => <TagChip key={tag} label={tag} onClick={onTagSelect ? () => onTagSelect(tag) : undefined} />)
            : null}
          <div
            onClick={(event) => {
              event.stopPropagation();
              onCopy();
            }}
          >
            <CopyButton content={getCopyContent(item)} itemId={item.id} initialCount={item.copyCount} onCopyCountChange={onCopyCountChange} />
          </div>
        </div>
      </div>
    </article>
  );
}
