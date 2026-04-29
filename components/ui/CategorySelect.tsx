"use client";

import type { Category } from "@/types";

interface CategorySelectProps {
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
}

export function CategorySelect({ categories, value, onChange }: CategorySelectProps) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[#E2E8F0]">
      Category
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-[4px] border border-[#2A2D3E] bg-[#0F1117] px-3 py-2 text-sm text-[#E2E8F0] transition-colors duration-150 focus:border-[#F59E0B] focus:outline-none focus:ring-1 focus:ring-amber-400"
      >
        <option value="">No category</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      {categories.length === 0 ? <span className="text-xs font-normal text-[#64748B]">No categories yet</span> : null}
    </label>
  );
}
