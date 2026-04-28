"use client";

import { useMemo, useState } from "react";
import { ItemCard } from "@/components/items/ItemCard";
import { ItemDetail } from "@/components/items/ItemDetail";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { demoItems } from "@/lib/demo-data";
import type { Item, ItemType } from "@/types";

export default function LibraryPage() {
  const [selectedItem, setSelectedItem] = useState<Item | null>(demoItems[0] ?? null);
  const [searchValue, setSearchValue] = useState("");
  const [activeType, setActiveType] = useState<ItemType | "all">("all");

  const filteredItems = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return demoItems.filter((item) => {
      const matchesType = activeType === "all" || item.type === activeType;
      const searchable = [item.title, item.content, item.command, item.url, ...item.tags].filter(Boolean).join(" ").toLowerCase();
      const matchesSearch = !query || searchable.includes(query);

      return matchesType && matchesSearch;
    });
  }, [activeType, searchValue]);

  function handleCopy() {
    return;
  }

  function handleEdit() {
    return;
  }

  return (
    <div className="min-h-screen bg-[#0F1117] font-sans text-[#E2E8F0]">
      <Sidebar activeType={activeType} onTypeChange={setActiveType} />

      <div className="md:pl-[240px]">
        <div className="xl:pr-[380px]">
          <TopBar totalItems={filteredItems.length} searchValue={searchValue} onSearchChange={setSearchValue} activeType={activeType} />

          <main className="p-4 md:p-6">
            {filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {filteredItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    isSelected={selectedItem?.id === item.id}
                    onCopy={handleCopy}
                    onSelect={() => setSelectedItem(item)}
                  />
                ))}
              </div>
            ) : (
              <section className="flex min-h-[320px] items-center justify-center rounded-[6px] border border-[#2A2D3E] bg-[#1A1D27] p-8 text-center text-sm text-[#64748B]">
                No library items match your current search.
              </section>
            )}
          </main>
        </div>
      </div>

      <div className="xl:fixed xl:inset-y-0 xl:right-0">
        <ItemDetail item={selectedItem} onClose={() => setSelectedItem(null)} onEdit={handleEdit} />
      </div>
    </div>
  );
}
