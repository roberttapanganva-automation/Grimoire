"use client";

import type { Item } from "@/types";
import { CopyButton } from "@/components/items/CopyButton";
import { TagChip } from "@/components/ui/TagChip";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { Edit3, ExternalLink, X } from "lucide-react";

interface ItemDetailProps {
  item: Item | null;
  onClose: () => void;
  onEdit: (item: Item) => void;
}

function getCopyContent(item: Item) {
  return item.command ?? item.content ?? item.url ?? "";
}

export function ItemDetail({ item, onClose, onEdit }: ItemDetailProps) {
  if (!item) {
    return (
      <aside className="hidden w-[380px] shrink-0 border-l border-[#2A2D3E] bg-[#1A1D27] p-6 xl:block">
        <div className="flex h-full items-center justify-center text-center text-sm text-[#64748B]">
          Select an item to inspect details.
        </div>
      </aside>
    );
  }

  const content = item.command ?? item.content ?? item.url ?? "";

  return (
    <aside className="fixed inset-0 z-40 flex bg-[#0F1117]/80 backdrop-blur-sm xl:static xl:z-auto xl:block xl:w-[380px] xl:shrink-0 xl:bg-transparent xl:backdrop-blur-0">
      <div className="ml-auto flex h-full w-full flex-col border-l border-[#2A2D3E] bg-[#1A1D27] md:w-[420px] xl:w-full">
        <header className="border-b border-[#2A2D3E] p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <TypeBadge type={item.type} />
            <button
              type="button"
              onClick={onClose}
              className="control-base control-hover inline-flex size-9 items-center justify-center border border-[#2A2D3E] text-[#64748B]"
              aria-label="Close details"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <h2 className="text-xl font-semibold leading-7 text-[#E2E8F0]">{item.title}</h2>
          <p className="mt-2 text-sm text-[#64748B]">
            {item.useCount} uses · {item.copyCount} copies
          </p>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <div
            className={`whitespace-pre-wrap rounded-[6px] border border-[#2A2D3E] bg-[#0F1117] p-4 text-sm leading-6 text-[#E2E8F0] ${
              item.type === "prompt" || item.type === "command" || item.type === "snippet" ? "font-mono" : ""
            }`}
          >
            {content || "No content available."}
          </div>

          {item.url ? (
            <a
              href={item.url}
              className="control-base control-hover mt-4 inline-flex items-center gap-2 border border-[#2A2D3E] px-3 py-2 text-sm font-medium text-[#E2E8F0]"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              Open link
            </a>
          ) : null}

          <div className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Tags</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <TagChip key={tag} label={tag} />
              ))}
            </div>
          </div>
        </div>

        <footer className="grid gap-3 border-t border-[#2A2D3E] p-5">
          <CopyButton content={getCopyContent(item)} itemId={item.id} initialCount={item.copyCount} />
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="control-base control-hover inline-flex items-center justify-center gap-2 border border-[#2A2D3E] px-3 py-2 text-sm font-semibold text-[#E2E8F0]"
          >
            <Edit3 className="size-4" aria-hidden="true" />
            Edit
          </button>
        </footer>
      </div>
    </aside>
  );
}
