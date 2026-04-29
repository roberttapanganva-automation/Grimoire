"use client";

import type { Item } from "@/types";
import { CopyButton } from "@/components/items/CopyButton";
import { TagChip } from "@/components/ui/TagChip";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { Edit3, ExternalLink, Trash2, X } from "lucide-react";

interface ItemDetailProps {
  item: Item | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  onTagSelect?: (tag: string) => void;
  onCopyCountChange?: (copyCount: number) => void;
}

function getCopyContent(item: Item) {
  return item.command ?? item.content ?? item.url ?? "";
}

function getDisplayContent(item: Item) {
  return item.command ?? item.content ?? item.url ?? "No content available.";
}

export function ItemDetail({ item, onClose, onEdit, onDelete, onTagSelect, onCopyCountChange }: ItemDetailProps) {
  if (!item) {
    return null;
  }

  const isMono = item.type === "prompt" || item.type === "command" || item.type === "snippet";

  return (
    <aside
      className="fixed inset-0 z-40 flex bg-[#0F1117]/80 backdrop-blur-sm xl:static xl:z-auto xl:block xl:w-[380px] xl:shrink-0 xl:bg-transparent xl:backdrop-blur-0"
      onClick={onClose}
    >
      <div
        className="ml-auto flex h-full w-full flex-col border-l border-[#2A2D3E] bg-[#1A1D27] md:w-[420px] xl:w-full"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="border-b border-[#2A2D3E] p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <TypeBadge type={item.type} />
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-9 items-center justify-center rounded-[4px] border border-[#2A2D3E] text-[#64748B] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
              aria-label="Close detail panel"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <h2 className="text-xl font-semibold leading-7 text-[#E2E8F0]">{item.title}</h2>
          <p className="mt-2 text-sm text-[#64748B]">
            {item.useCount} uses / {item.copyCount} copies
          </p>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <div className={`whitespace-pre-wrap border border-[#2A2D3E] bg-[#0F1117] p-4 text-sm leading-6 text-[#E2E8F0] ${isMono ? "font-mono" : ""}`}>
            {getDisplayContent(item)}
          </div>

          {item.url ? (
            <a
              href={item.url}
              className="mt-4 inline-flex items-center gap-2 rounded-[4px] border border-[#2A2D3E] px-3 py-2 text-sm font-medium text-[#E2E8F0] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              Open source link
            </a>
          ) : null}

          <section className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Tags</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <TagChip key={tag} label={tag} onClick={onTagSelect ? () => onTagSelect(tag) : undefined} />
              ))}
            </div>
          </section>
        </div>

        <footer className="grid gap-3 border-t border-[#2A2D3E] p-5">
          <CopyButton content={getCopyContent(item)} itemId={item.id} initialCount={item.copyCount} onCopyCountChange={onCopyCountChange} />
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center justify-center gap-2 rounded-[4px] border border-[#2A2D3E] px-3 py-2 text-sm font-semibold text-[#E2E8F0] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
          >
            <Edit3 className="size-4" aria-hidden="true" />
            Edit item
          </button>
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center justify-center gap-2 rounded-[4px] border border-[#EF4444]/60 px-3 py-2 text-sm font-semibold text-[#FCA5A5] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete item
            </button>
          ) : null}
        </footer>
      </div>
    </aside>
  );
}
