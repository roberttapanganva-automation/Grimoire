"use client";

import { useMemo, useState } from "react";
import type { Item } from "@/types";
import { FilePlus2, RotateCcw, Search, X } from "lucide-react";
import { TypeBadge } from "@/components/ui/TypeBadge";

interface CommandPaletteProps {
  isOpen: boolean;
  items: Item[];
  onClose: () => void;
  onNewItem: () => void;
  onClearSearch: () => void;
  onSelectItem: (item: Item) => void;
}

function matchesItem(item: Item, query: string) {
  const searchable = [item.title, item.content, item.command, item.url, ...item.tags].filter(Boolean).join(" ").toLowerCase();
  return searchable.includes(query);
}

export function CommandPalette({ isOpen, items, onClose, onNewItem, onClearSearch, onSelectItem }: CommandPaletteProps) {
  const [query, setQuery] = useState("");

  const matchingItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return items.slice(0, 6);
    }

    return items.filter((item) => matchesItem(item, normalizedQuery)).slice(0, 8);
  }, [items, query]);

  if (!isOpen) {
    return null;
  }

  function handleNewItem() {
    onNewItem();
    onClose();
  }

  function handleClearSearch() {
    onClearSearch();
    setQuery("");
    onClose();
  }

  function handleSelectItem(item: Item) {
    onSelectItem(item);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#0F1117]/80 px-4 py-20">
      <section className="w-[calc(100%-32px)] max-w-2xl overflow-hidden rounded-[8px] border border-[#2A2D3E] bg-[#1A1D27] shadow-2xl">
        <header className="flex items-center gap-3 border-b border-[#2A2D3E] px-4 py-3">
          <Search className="size-4 shrink-0 text-[#64748B]" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
            className="min-w-0 flex-1 bg-transparent text-sm text-[#E2E8F0] outline-none placeholder:text-[#374151]"
            placeholder="Search commands and local items..."
          />
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-[4px] text-[#64748B] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
            aria-label="Close command palette"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          <section className="mb-2">
            <h2 className="px-2 py-2 text-xs font-semibold uppercase tracking-wider text-[#64748B]">Quick actions</h2>
            <button
              type="button"
              onClick={handleNewItem}
              className="flex w-full items-center gap-3 rounded-[4px] px-3 py-2 text-left text-sm text-[#E2E8F0] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              <FilePlus2 className="size-4 text-amber-400" aria-hidden="true" />
              New Item
            </button>
            <button
              type="button"
              onClick={handleClearSearch}
              className="flex w-full items-center gap-3 rounded-[4px] px-3 py-2 text-left text-sm text-[#E2E8F0] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              <RotateCcw className="size-4 text-amber-400" aria-hidden="true" />
              Clear Search
            </button>
          </section>

          <section>
            <h2 className="px-2 py-2 text-xs font-semibold uppercase tracking-wider text-[#64748B]">Items</h2>
            {matchingItems.length > 0 ? (
              <div className="space-y-1">
                {matchingItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectItem(item)}
                    className="flex w-full items-start justify-between gap-3 rounded-[4px] px-3 py-3 text-left transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[#E2E8F0]">{item.title}</span>
                      <span className="mt-1 block truncate text-xs text-[#64748B]">{item.tags.join(", ") || "No tags"}</span>
                    </span>
                    <TypeBadge type={item.type} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-3 py-6 text-center text-sm text-[#64748B]">No local items match this command search.</p>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
