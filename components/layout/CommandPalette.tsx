"use client";

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, Library, Network, Search, Settings, X } from "lucide-react";
import type { Item } from "@/types";
import { TypeBadge } from "@/components/ui/TypeBadge";

interface CommandPaletteProps {
  isOpen: boolean;
  items: Item[];
  onClose: () => void;
  onNewItem: () => void;
  onSelectItem: (item: Item) => void;
}

interface PaletteEntry {
  id: string;
  label: string;
  description?: string;
  type: "action" | "item";
  item?: Item;
  run: () => void;
}

function getItemTags(item: Item) {
  return Array.isArray(item.tags) ? item.tags : [];
}

export function CommandPalette({ isOpen, items, onClose, onNewItem, onSelectItem }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setActiveIndex(0);
      return;
    }

    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [isOpen]);

  const entries = useMemo<PaletteEntry[]>(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const actions: PaletteEntry[] = [
      {
        id: "new-item",
        label: "New Item",
        description: "Create a library item",
        type: "action",
        run: () => {
          onNewItem();
          onClose();
        },
      },
      {
        id: "go-library",
        label: "Go to Library",
        description: "/library",
        type: "action",
        run: () => {
          router.push("/library");
          onClose();
        },
      },
      {
        id: "go-settings",
        label: "Go to Settings",
        description: "/settings",
        type: "action",
        run: () => {
          router.push("/settings");
          onClose();
        },
      },
      {
        id: "go-brain",
        label: "Go to Brain",
        description: "/brain",
        type: "action",
        run: () => {
          router.push("/brain");
          onClose();
        },
      },
    ];

    const matchedItems = items
      .filter((item) => {
        if (!normalizedQuery) {
          return true;
        }

        return [item.title, item.content, item.command, item.url, item.type, ...getItemTags(item)]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .slice(0, 8)
      .map<PaletteEntry>((item) => ({
        id: `item-${item.id}`,
        label: item.title,
        description: getItemTags(item).join(", ") || item.type,
        type: "item",
        item,
        run: () => {
          onSelectItem(item);
          onClose();
        },
      }));

    if (!normalizedQuery) {
      return [...actions, ...matchedItems];
    }

    const matchedActions = actions.filter((action) => `${action.label} ${action.description ?? ""}`.toLowerCase().includes(normalizedQuery));
    return [...matchedActions, ...matchedItems];
  }, [items, onClose, onNewItem, onSelectItem, query, router]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    setActiveIndex((current) => {
      if (entries.length === 0) {
        return 0;
      }

      return Math.min(current, entries.length - 1);
    });
  }, [entries.length]);

  if (!isOpen) {
    return null;
  }

  function runActiveEntry() {
    entries[activeIndex]?.run();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (entries.length === 0 ? 0 : (current + 1) % entries.length));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (entries.length === 0 ? 0 : (current - 1 + entries.length) % entries.length));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      runActiveEntry();
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-[#0F1117]/80 px-4 pt-20 backdrop-blur-sm" onKeyDown={handleKeyDown}>
      <section className="w-full max-w-[640px] rounded-[8px] border border-[#2A2D3E] bg-[#1A1D27] shadow-2xl">
        <header className="flex items-center gap-3 border-b border-[#2A2D3E] px-4 py-3">
          <Search className="size-4 shrink-0 text-[#64748B]" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-10 min-w-0 flex-1 bg-transparent text-sm text-[#E2E8F0] outline-none placeholder:text-[#374151]"
            placeholder="Search library or run a command..."
            aria-label="Command palette search"
          />
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-[4px] border border-[#2A2D3E] text-[#64748B] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
            aria-label="Close command palette"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        <div className="max-h-[420px] overflow-y-auto p-2">
          {entries.length > 0 ? (
            entries.map((entry, index) => (
              <button
                key={entry.id}
                type="button"
                onClick={entry.run}
                className={`flex w-full items-center gap-3 rounded-[4px] px-3 py-2 text-left transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-amber-400 ${
                  activeIndex === index ? "bg-[#21243A]" : "hover:bg-[#21243A]"
                }`}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[4px] border border-[#2A2D3E] bg-[#0F1117] text-[#FBBF24]">
                  {entry.type === "action" ? (
                    entry.id === "new-item" ? (
                      <FilePlus2 className="size-4" aria-hidden="true" />
                    ) : entry.id === "go-brain" ? (
                      <Network className="size-4" aria-hidden="true" />
                    ) : entry.id === "go-settings" ? (
                      <Settings className="size-4" aria-hidden="true" />
                    ) : (
                      <Library className="size-4" aria-hidden="true" />
                    )
                  ) : (
                    <Library className="size-4" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="block truncate text-sm font-medium text-[#E2E8F0]">{entry.label}</span>
                    {entry.item ? (
                      <span className="shrink-0">
                        <TypeBadge type={entry.item.type} />
                      </span>
                    ) : null}
                  </span>
                  {entry.description ? <span className="block truncate text-xs text-[#64748B]">{entry.description}</span> : null}
                </span>
              </button>
            ))
          ) : (
            <div className="px-3 py-8 text-center text-sm text-[#64748B]">No commands or items found.</div>
          )}
        </div>
      </section>
    </div>
  );
}
