"use client";

import { useMemo, useState } from "react";
import { ItemCard } from "@/components/items/ItemCard";
import { ItemDetail } from "@/components/items/ItemDetail";
import { ItemRow } from "@/components/items/ItemRow";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { demoItems } from "@/lib/demo-data";
import type { Item } from "@/types";

type ViewMode = "grid" | "list";

export default function LibraryPage() {
  const [selectedItem, setSelectedItem] = useState<Item | null>(demoItems[0] ?? null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchValue, setSearchValue] = useState("");

  const filteredItems = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    if (!query) {
      return demoItems;
    }

    return demoItems.filter((item) => {
      const searchable = [item.title, item.content, item.command, item.url, ...item.tags].filter(Boolean).join(" ").toLowerCase();
      return searchable.includes(query);
    });
  }, [searchValue]);

  function handleCopy(_item: Item) {
    return;
  }

  function handleEdit(_item: Item) {
    return;
  }

  return (
    <div className="min-h-screen bg-[#0F1117] font-sans text-[#E2E8F0]">
      <Sidebar />
      <div className="md:pl-[240px]">
        <div className="xl:pr-[380px]">
          <TopBar
            totalItems={filteredItems.length}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
          />

          <main className="p-4 md:p-6">
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {filteredItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    isSelected={selectedItem?.id === item.id}
                    onCopy={handleCopy}
                    onSelect={setSelectedItem}
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-[6px] border border-[#2A2D3E]">
                {filteredItems.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    isSelected={selectedItem?.id === item.id}
                    onCopy={handleCopy}
                    onSelect={setSelectedItem}
                  />
                ))}
              </div>
            )}

            {filteredItems.length === 0 ? (
              <div className="card-base flex min-h-[320px] items-center justify-center p-8 text-center text-sm text-[#64748B]">
                No library items match your search.
              </div>
            ) : null}
          </main>
        </div>
      </div>

      <div className="xl:fixed xl:inset-y-0 xl:right-0">
        <ItemDetail item={selectedItem} onClose={() => setSelectedItem(null)} onEdit={handleEdit} />
      </div>
    </div>
  );
}
