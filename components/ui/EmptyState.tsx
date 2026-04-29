"use client";

import { SearchX } from "lucide-react";

interface EmptyStateProps {
  onClearFilters: () => void;
}

export function EmptyState({ onClearFilters }: EmptyStateProps) {
  return (
    <section className="flex min-h-[320px] items-center justify-center rounded-[6px] border border-[#2A2D3E] bg-[#1A1D27] p-8 text-center">
      <div className="max-w-sm">
        <div className="mx-auto flex size-10 items-center justify-center rounded-[6px] border border-[#2A2D3E] bg-[#0F1117] text-amber-400">
          <SearchX className="size-5" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-[#E2E8F0]">No matching items</h2>
        <p className="mt-2 text-sm leading-6 text-[#64748B]">Try clearing search, type, or tag filters to bring your library items back into view.</p>
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-5 rounded-[4px] bg-amber-400 px-4 py-2 text-sm font-semibold text-[#0F1117] transition-colors duration-150 hover:bg-[#FBBF24] focus:outline-none focus:ring-1 focus:ring-amber-400"
        >
          Clear filters
        </button>
      </div>
    </section>
  );
}
