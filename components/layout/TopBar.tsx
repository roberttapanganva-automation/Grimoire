"use client";

import type { ItemType, SortMode, ViewMode } from "@/types";
import { Grid2X2, List, Rows3, Search } from "lucide-react";

interface TopBarProps {
  totalItems: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeType: ItemType | "all";
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

const sortOptions: Array<{ mode: SortMode; label: string }> = [
  { mode: "recent", label: "Recent" },
  { mode: "mostUsed", label: "Most used" },
  { mode: "alphabetical", label: "A-Z" },
  { mode: "pinnedFirst", label: "Pinned" },
];

const viewOptions: Array<{ mode: ViewMode; label: string; Icon: typeof Grid2X2 }> = [
  { mode: "grid", label: "Grid", Icon: Grid2X2 },
  { mode: "list", label: "List", Icon: List },
  { mode: "compact", label: "Compact", Icon: Rows3 },
];

export function TopBar({
  totalItems,
  searchQuery,
  onSearchChange,
  activeType,
  sortMode,
  onSortModeChange,
  viewMode,
  onViewModeChange,
  hasActiveFilters,
  onClearFilters,
}: TopBarProps) {
  const filterLabel = activeType === "all" ? "All types" : activeType;

  return (
    <header className="sticky top-0 z-20 border-b border-[#2A2D3E] bg-[#0F1117]/95 px-4 py-4 backdrop-blur md:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#E2E8F0]">Library</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            {totalItems} private items / {filterLabel}
          </p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="flex min-w-0 items-center gap-2 rounded-[4px] border border-[#2A2D3E] bg-[#1A1D27] px-3 py-2 transition-colors duration-150 focus-within:border-[#F59E0B] focus-within:ring-1 focus-within:ring-amber-400 md:w-[340px]">
            <Search className="size-4 shrink-0 text-[#64748B]" aria-hidden="true" />
            <span className="sr-only">Search library</span>
            <input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              className="w-full bg-transparent text-sm text-[#E2E8F0] outline-none placeholder:text-[#374151]"
              placeholder="Search prompts, notes, links..."
              type="search"
            />
          </label>
          <select
            value={sortMode}
            onChange={(event) => onSortModeChange(event.target.value as SortMode)}
            className="h-10 rounded-[4px] border border-[#2A2D3E] bg-[#1A1D27] px-3 text-sm font-medium text-[#E2E8F0] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
            aria-label="Sort library items"
          >
            {sortOptions.map((option) => (
              <option key={option.mode} value={option.mode}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="inline-flex h-10 rounded-[4px] border border-[#2A2D3E] bg-[#1A1D27]" aria-label="Library view mode">
            {viewOptions.map(({ mode, label, Icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => onViewModeChange(mode)}
                className={`inline-flex w-10 items-center justify-center transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-amber-400 ${
                  viewMode === mode ? "bg-[#21243A] text-[#FBBF24]" : "text-[#64748B] hover:bg-[#21243A]"
                }`}
                aria-label={`${label} view`}
                title={`${label} view`}
              >
                <Icon className="size-4" aria-hidden="true" />
              </button>
            ))}
          </div>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex h-10 items-center justify-center rounded-[4px] border border-[#F59E0B] px-3 text-sm font-medium text-[#FBBF24] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
