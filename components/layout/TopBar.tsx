"use client";

import { Grid2X2, List, Search, SlidersHorizontal } from "lucide-react";

interface TopBarProps {
  totalItems: number;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

export function TopBar({ totalItems, viewMode, onViewModeChange, searchValue, onSearchChange }: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-[#2A2D3E] bg-[#0F1117]/95 px-4 py-4 backdrop-blur md:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#E2E8F0]">Library</h1>
          <p className="mt-1 text-sm text-[#64748B]">{totalItems} saved prompts, notes, links, commands, and snippets</p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="flex min-w-0 items-center gap-2 rounded-[4px] border border-[#2A2D3E] bg-[#1A1D27] px-3 py-2 transition-colors duration-150 focus-within:border-[#F59E0B] focus-within:ring-1 focus-within:ring-amber-400 md:w-[340px]">
            <Search className="size-4 shrink-0 text-[#64748B]" aria-hidden="true" />
            <span className="sr-only">Search library</span>
            <input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              className="w-full bg-transparent text-sm text-[#E2E8F0] outline-none placeholder:text-[#374151]"
              placeholder="Search library..."
              type="search"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="control-base control-hover inline-flex size-10 items-center justify-center border border-[#2A2D3E] text-[#64748B]"
              aria-label="Filter"
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
            </button>
            <div className="grid grid-cols-2 rounded-[4px] border border-[#2A2D3E] bg-[#1A1D27] p-1">
              <button
                type="button"
                onClick={() => onViewModeChange("grid")}
                className={`control-base inline-flex size-8 items-center justify-center ${
                  viewMode === "grid" ? "bg-[#F59E0B] text-[#0F1117]" : "text-[#64748B] hover:bg-[#21243A]"
                }`}
                aria-label="Grid view"
              >
                <Grid2X2 className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange("list")}
                className={`control-base inline-flex size-8 items-center justify-center ${
                  viewMode === "list" ? "bg-[#F59E0B] text-[#0F1117]" : "text-[#64748B] hover:bg-[#21243A]"
                }`}
                aria-label="List view"
              >
                <List className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
