"use client";

import type { Item } from "@/types";
import { CopyButton } from "@/components/items/CopyButton";
import { TagChip } from "@/components/ui/TagChip";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { Pin } from "lucide-react";

interface ItemCardProps {
  item: Item;
  isSelected: boolean;
  onCopy: () => void;
  onSelect: () => void;
  onCopyCountChange?: (copyCount: number) => void;
}

function getCopyContent(item: Item) {
  return item.command ?? item.content ?? item.url ?? "";
}

function getPreview(item: Item) {
  return item.command ?? item.content ?? item.url ?? "No content yet.";
}

export function ItemCard({ item, isSelected, onCopy, onSelect, onCopyCountChange }: ItemCardProps) {
  const isMono = item.type === "prompt" || item.type === "command" || item.type === "snippet";

  return (
    <article
      className={`flex min-h-[236px] flex-col rounded-[6px] border bg-[#1A1D27] p-4 transition-colors duration-150 hover:bg-[#21243A] ${
        isSelected ? "border-[#F59E0B]" : "border-[#2A2D3E]"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex flex-1 flex-col text-left focus:outline-none focus:ring-1 focus:ring-amber-400"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <TypeBadge type={item.type} />
          {item.isPinned ? <Pin className="size-4 shrink-0 text-amber-400" aria-label="Pinned item" /> : null}
        </div>
        <h3 className="line-clamp-2 text-base font-semibold leading-6 text-[#E2E8F0]">{item.title}</h3>
        <p className={`mt-3 line-clamp-3 text-sm leading-6 text-[#64748B] ${isMono ? "font-mono" : ""}`}>{getPreview(item)}</p>
      </button>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-wrap gap-2">
          {item.tags.slice(0, 3).map((tag) => (
            <TagChip key={tag} label={tag} />
          ))}
        </div>
        <div
          onClick={(event) => {
            event.stopPropagation();
            onCopy();
          }}
        >
          <CopyButton content={getCopyContent(item)} itemId={item.id} initialCount={item.copyCount} onCopyCountChange={onCopyCountChange} />
        </div>
      </div>
    </article>
  );
}
