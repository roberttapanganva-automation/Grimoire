"use client";

import type { ItemType, SortMode, ViewMode } from "@/types";
import { Grid2X2, List, Search } from "lucide-react";

interface TopBarProps {
  totalItems: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  activeType: ItemType | "all";
  activeTag: string | "all";
  onTagChange: (tag: string | "all") => void;
  availableTags: string[];
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onOpenCommandPalette: () => void;
}

const sortOptions: Array<{ label: string; value: SortMode }> = [
  { label: "Recent", value: "recent" },
  { label: "Most Used", value: "most-used" },
  { label: "Most Copied", value: "most-copied" },
  { label: "Alphabetical", value: "alphabetical" },
  { label: "Pinned First", value: "pinned-first" },
];

export function TopBar({
  totalItems,
  searchValue,
  onSearchChange,
  activeType,
  activeTag,
  onTagChange,
  availableTags,
  sortMode,
  onSortModeChange,
  viewMode,
  onViewModeChange,
  onOpenCommandPalette,
}: TopBarProps) {
  const filterLabel = activeType === "all" ? "All types" : activeType;

  return (
    <header className="sticky top-0 z-20 border-b border-[#2A2D3E] bg-[#0F1117]/95 px-4 py-4 backdrop-blur md:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#E2E8F0]">Library</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            {totalItems} local demo items / {filterLabel}
          </p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex min-w-0 items-center gap-2 rounded-[4px] border border-[#2A2D3E] bg-[#1A1D27] px-3 py-2 transition-colors duration-150 focus-within:border-[#F59E0B] focus-within:ring-1 focus-within:ring-amber-400 md:w-[340px]">
            <Search className="size-4 shrink-0 text-[#64748B]" aria-hidden="true" />
            <label className="sr-only" htmlFor="library-search">
              Search library
            </label>
            <input
              id="library-search"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              className="w-full bg-transparent text-sm text-[#E2E8F0] outline-none placeholder:text-[#374151]"
              placeholder="Search prompts, notes, links..."
              type="search"
            />
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="hidden rounded-[4px] border border-[#2A2D3E] px-2 py-1 font-mono text-xs text-[#64748B] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400 sm:inline-flex"
              aria-label="Open command palette"
            >
              Ctrl K
            </button>
          </div>
          <select
            value={activeTag}
            onChange={(event) => onTagChange(event.target.value)}
            className="h-10 rounded-[4px] border border-[#2A2D3E] bg-[#1A1D27] px-3 text-sm text-[#E2E8F0] outline-none transition-colors duration-150 focus:ring-1 focus:ring-amber-400"
            aria-label="Filter by tag"
          >
            <option value="all">All tags</option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
          <select
            value={sortMode}
            onChange={(event) => onSortModeChange(event.target.value as SortMode)}
            className="h-10 rounded-[4px] border border-[#2A2D3E] bg-[#1A1D27] px-3 text-sm text-[#E2E8F0] outline-none transition-colors duration-150 focus:ring-1 focus:ring-amber-400"
            aria-label="Sort library"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 rounded-[4px] border border-[#2A2D3E] bg-[#1A1D27] p-1">
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={`inline-flex size-8 items-center justify-center rounded-[4px] transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-amber-400 ${
                viewMode === "grid" ? "bg-amber-400 text-[#0F1117]" : "text-[#64748B] hover:bg-[#21243A]"
              }`}
              aria-label="Grid view"
            >
              <Grid2X2 className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              className={`inline-flex size-8 items-center justify-center rounded-[4px] transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-amber-400 ${
                viewMode === "list" ? "bg-amber-400 text-[#0F1117]" : "text-[#64748B] hover:bg-[#21243A]"
              }`}
              aria-label="List view"
            >
              <List className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
