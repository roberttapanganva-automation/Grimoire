"use client";

import { useMemo, useState } from "react";
import { ItemCard } from "@/components/items/ItemCard";
import { ItemDetail } from "@/components/items/ItemDetail";
import { ItemForm } from "@/components/items/ItemForm";
import { ItemRow } from "@/components/items/ItemRow";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { demoItems } from "@/lib/demo-data";
import type { Item, ItemFormValues, ItemType, SortMode, ViewMode } from "@/types";

type FormMode = "create" | "edit";

function createItemId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `item-${Date.now()}`;
}

function buildItemContent(values: ItemFormValues) {
  return {
    content: values.content || null,
    url: values.type === "link" ? values.url || null : null,
    command: values.type === "command" ? values.command || null : null,
  };
}

function getSearchableText(item: Item) {
  return [item.title, item.content, item.command, item.url, ...item.tags].filter(Boolean).join(" ").toLowerCase();
}

function sortItems(items: Item[], sortMode: SortMode) {
  const nextItems = [...items];

  if (sortMode === "most-used") {
    return nextItems.sort((a, b) => b.useCount - a.useCount);
  }

  if (sortMode === "most-copied") {
    return nextItems.sort((a, b) => b.copyCount - a.copyCount);
  }

  if (sortMode === "alphabetical") {
    return nextItems.sort((a, b) => a.title.localeCompare(b.title));
  }

  if (sortMode === "pinned-first") {
    return nextItems.sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  return nextItems.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export default function LibraryPage() {
  const [items, setItems] = useState<Item[]>(demoItems);
  const [selectedItem, setSelectedItem] = useState<Item | null>(demoItems[0] ?? null);
  const [searchValue, setSearchValue] = useState("");
  const [activeType, setActiveType] = useState<ItemType | "all">("all");
  const [activeTag, setActiveTag] = useState<string | "all">("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const commandPalette = useCommandPalette();

  const availableTags = useMemo(() => Array.from(new Set(items.flatMap((item) => item.tags))).sort((a, b) => a.localeCompare(b)), [items]);

  const filteredItems = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    const matches = items.filter((item) => {
      const matchesType = activeType === "all" || item.type === activeType;
      const matchesTag = activeTag === "all" || item.tags.includes(activeTag);
      const matchesSearch = !query || getSearchableText(item).includes(query);

      return matchesType && matchesTag && matchesSearch;
    });

    return sortItems(matches, sortMode);
  }, [activeTag, activeType, items, searchValue, sortMode]);

  function handleCopy() {
    return;
  }

  function clearFilters() {
    setSearchValue("");
    setActiveType("all");
    setActiveTag("all");
  }

  function clearSearch() {
    setSearchValue("");
  }

  function openCreateForm() {
    setFormMode("create");
    setEditingItem(null);
    setIsFormOpen(true);
  }

  function openEditForm() {
    if (!selectedItem) {
      return;
    }

    setFormMode("edit");
    setEditingItem(selectedItem);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingItem(null);
  }

  function saveItem(values: ItemFormValues) {
    const now = new Date().toISOString();

    if (formMode === "edit" && editingItem) {
      const updatedItem: Item = {
        ...editingItem,
        type: values.type,
        title: values.title,
        tags: values.tags,
        categoryId: values.categoryId,
        updatedAt: now,
        ...buildItemContent(values),
      };

      setItems((currentItems) => currentItems.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
      setSelectedItem(updatedItem);
      closeForm();
      return;
    }

    const newItem: Item = {
      id: createItemId(),
      type: values.type,
      title: values.title,
      tags: values.tags,
      categoryId: values.categoryId,
      isPinned: false,
      copyCount: 0,
      useCount: 0,
      createdAt: now,
      updatedAt: now,
      ...buildItemContent(values),
    };

    setItems((currentItems) => [newItem, ...currentItems]);
    setSelectedItem(newItem);
    closeForm();
  }

  function deleteSelectedItem() {
    if (!selectedItem) {
      return;
    }

    const confirmed = window.confirm(`Delete "${selectedItem.title}"? This only removes it from local demo state.`);

    if (!confirmed) {
      return;
    }

    const nextItems = items.filter((item) => item.id !== selectedItem.id);
    setItems(nextItems);
    setSelectedItem(nextItems[0] ?? null);
  }

  function selectItem(item: Item) {
    setSelectedItem(item);
  }

  return (
    <div className="min-h-screen bg-[#0F1117] font-sans text-[#E2E8F0]">
      <Sidebar activeType={activeType} onTypeChange={setActiveType} onNewItem={openCreateForm} />

      <div className="md:pl-[240px]">
        <div className="xl:pr-[380px]">
          <TopBar
            totalItems={filteredItems.length}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            activeType={activeType}
            activeTag={activeTag}
            onTagChange={setActiveTag}
            availableTags={availableTags}
            sortMode={sortMode}
            onSortModeChange={setSortMode}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onOpenCommandPalette={commandPalette.open}
          />

          <main className="p-4 md:p-6">
            {filteredItems.length > 0 ? (
              viewMode === "grid" ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {filteredItems.map((item) => (
                    <ItemCard key={item.id} item={item} isSelected={selectedItem?.id === item.id} onCopy={handleCopy} onSelect={() => selectItem(item)} />
                  ))}
                </div>
              ) : (
                <div className="overflow-hidden rounded-[6px] border border-[#2A2D3E]">
                  {filteredItems.map((item) => (
                    <ItemRow key={item.id} item={item} isSelected={selectedItem?.id === item.id} onCopy={handleCopy} onSelect={() => selectItem(item)} />
                  ))}
                </div>
              )
            ) : (
              <EmptyState onClearFilters={clearFilters} />
            )}
          </main>
        </div>
      </div>

      <div className="xl:fixed xl:inset-y-0 xl:right-0">
        <ItemDetail item={selectedItem} onClose={() => setSelectedItem(null)} onEdit={openEditForm} onDelete={deleteSelectedItem} />
      </div>

      <Modal isOpen={isFormOpen} title={formMode === "edit" ? "Edit Item" : "New Item"} onClose={closeForm}>
        <ItemForm item={formMode === "edit" ? editingItem : null} onCancel={closeForm} onSubmit={saveItem} />
      </Modal>

      <CommandPalette
        isOpen={commandPalette.isOpen}
        items={items}
        onClose={commandPalette.close}
        onNewItem={openCreateForm}
        onClearSearch={clearSearch}
        onSelectItem={selectItem}
      />
    </div>
  );
}
