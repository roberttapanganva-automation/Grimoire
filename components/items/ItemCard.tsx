"use client";

import type { Item } from "@/types";
import { CopyButton } from "@/components/items/CopyButton";
import { TagChip } from "@/components/ui/TagChip";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { Pin } from "lucide-react";

interface ItemCardProps {
  item: Item;
  isSelected: boolean;
  onCopy: (item: Item) => void;
  onSelect: (item: Item) => void;
}

function getCopyContent(item: Item) {
  return item.command ?? item.content ?? item.url ?? "";
}

export function ItemCard({ item, isSelected, onCopy, onSelect }: ItemCardProps) {
  const preview = item.command ?? item.content ?? item.url ?? "No content yet.";

  return (
    <article
      className={`card-base group flex min-h-[236px] flex-col p-4 transition-colors duration-150 hover:bg-[#21243A] ${
        isSelected ? "border-[#F59E0B]" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(item)}
        className="flex flex-1 flex-col text-left focus:outline-none focus:ring-1 focus:ring-amber-400"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <TypeBadge type={item.type} />
          {item.isPinned ? <Pin className="size-4 shrink-0 text-amber-400" aria-label="Pinned" /> : null}
        </div>
        <h3 className="line-clamp-2 text-base font-semibold leading-6 text-[#E2E8F0]">{item.title}</h3>
        <p
          className={`mt-3 line-clamp-3 text-sm leading-6 text-[#64748B] ${
            item.type === "prompt" || item.type === "command" || item.type === "snippet" ? "font-mono" : ""
          }`}
        >
          {preview}
        </p>
      </button>
      <div className="mt-5 flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-wrap gap-2">
          {item.tags.slice(0, 3).map((tag) => (
            <TagChip key={tag} label={tag} />
          ))}
        </div>
        <div onClick={() => onCopy(item)}>
          <CopyButton content={getCopyContent(item)} itemId={item.id} initialCount={item.copyCount} />
        </div>
      </div>
    </article>
  );
}
