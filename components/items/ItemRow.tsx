"use client";

import type { Item } from "@/types";
import { CopyButton } from "@/components/items/CopyButton";
import { TagChip } from "@/components/ui/TagChip";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { Pin } from "lucide-react";

interface ItemRowProps {
  item: Item;
  isSelected: boolean;
  onCopy: () => void;
  onSelect: () => void;
}

function getCopyContent(item: Item) {
  return item.command ?? item.content ?? item.url ?? "";
}

function getPreview(item: Item) {
  return item.command ?? item.content ?? item.url ?? "No content yet.";
}

export function ItemRow({ item, isSelected, onCopy, onSelect }: ItemRowProps) {
  const isMono = item.type === "prompt" || item.type === "command" || item.type === "snippet";

  return (
    <article
      className={`grid gap-4 border-b border-[#2A2D3E] bg-[#1A1D27] p-4 transition-colors duration-150 hover:bg-[#21243A] md:grid-cols-[minmax(0,1fr)_auto] ${
        isSelected ? "border-l-2 border-l-[#F59E0B]" : "border-l-2 border-l-transparent"
      }`}
    >
      <button type="button" onClick={onSelect} className="min-w-0 text-left focus:outline-none focus:ring-1 focus:ring-amber-400">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <TypeBadge type={item.type} />
          {item.isPinned ? <Pin className="size-4 text-amber-400" aria-label="Pinned item" /> : null}
        </div>
        <h3 className="truncate text-sm font-semibold text-[#E2E8F0]">{item.title}</h3>
        <p className={`mt-1 truncate text-sm text-[#64748B] ${isMono ? "font-mono" : ""}`}>{getPreview(item)}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {item.tags.slice(0, 4).map((tag) => (
            <TagChip key={tag} label={tag} />
          ))}
        </div>
      </button>

      <div
        className="flex items-center justify-end"
        onClick={(event) => {
          event.stopPropagation();
          onCopy();
        }}
      >
        <CopyButton content={getCopyContent(item)} itemId={item.id} initialCount={item.copyCount} />
      </div>
    </article>
  );
}
