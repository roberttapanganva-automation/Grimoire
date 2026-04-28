"use client";

import type { ItemType } from "@/types";
import { Search, SlidersHorizontal } from "lucide-react";

interface TopBarProps {
  totalItems: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  activeType: ItemType | "all";
}

export function TopBar({ totalItems, searchValue, onSearchChange, activeType }: TopBarProps) {
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
          <label className="flex min-w-0 items-center gap-2 rounded-[4px] border border-[#2A2D3E] bg-[#1A1D27] px-3 py-2 transition-colors duration-150 focus-within:border-[#F59E0B] focus-within:ring-1 focus-within:ring-amber-400 md:w-[340px]">
            <Search className="size-4 shrink-0 text-[#64748B]" aria-hidden="true" />
            <span className="sr-only">Search library</span>
            <input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              className="w-full bg-transparent text-sm text-[#E2E8F0] outline-none placeholder:text-[#374151]"
              placeholder="Search prompts, notes, links..."
              type="search"
            />
          </label>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[4px] border border-[#2A2D3E] px-3 text-sm font-medium text-[#64748B] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Sort: Recent
          </button>
        </div>
      </div>
    </header>
  );
}
