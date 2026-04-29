"use client";

import { useMemo, useState } from "react";
import { ItemForm } from "@/components/items/ItemForm";
import { ItemCard } from "@/components/items/ItemCard";
import { ItemDetail } from "@/components/items/ItemDetail";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Modal } from "@/components/ui/Modal";
import { demoItems } from "@/lib/demo-data";
import type { Item, ItemFormValues, ItemType } from "@/types";

type FormMode = "create" | "edit";

function createItemId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `item-${Date.now()}`;
}

function buildCopyFields(values: ItemFormValues) {
  return {
    content: values.content || null,
    url: values.type === "link" ? values.url || null : null,
    command: values.type === "command" ? values.command || null : null,
  };
}

export default function LibraryPage() {
  const [items, setItems] = useState<Item[]>(demoItems);
  const [selectedItem, setSelectedItem] = useState<Item | null>(demoItems[0] ?? null);
  const [searchValue, setSearchValue] = useState("");
  const [activeType, setActiveType] = useState<ItemType | "all">("all");
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filteredItems = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return items.filter((item) => {
      const matchesType = activeType === "all" || item.type === activeType;
      const searchable = [item.title, item.content, item.command, item.url, ...item.tags].filter(Boolean).join(" ").toLowerCase();
      const matchesSearch = !query || searchable.includes(query);

      return matchesType && matchesSearch;
    });
  }, [activeType, items, searchValue]);

  function handleCopy() {
    return;
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

  function handleSave(values: ItemFormValues) {
    const now = new Date().toISOString();

    if (formMode === "edit" && editingItem) {
      const updatedItem: Item = {
        ...editingItem,
        type: values.type,
        title: values.title,
        tags: values.tags,
        categoryId: values.categoryId,
        updatedAt: now,
        ...buildCopyFields(values),
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
      ...buildCopyFields(values),
    };

    setItems((currentItems) => [newItem, ...currentItems]);
    setSelectedItem(newItem);
    closeForm();
  }

  function handleDelete() {
    if (!selectedItem) {
      return;
    }

    const confirmed = window.confirm(`Delete "${selectedItem.title}"? This only removes it from the local demo state.`);

    if (!confirmed) {
      return;
    }

    const nextItems = items.filter((item) => item.id !== selectedItem.id);
    setItems(nextItems);
    setSelectedItem(nextItems[0] ?? null);
  }

  return (
    <div className="min-h-screen bg-[#0F1117] font-sans text-[#E2E8F0]">
      <Sidebar activeType={activeType} onTypeChange={setActiveType} onNewItem={openCreateForm} />

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
        <ItemDetail item={selectedItem} onClose={() => setSelectedItem(null)} onEdit={openEditForm} onDelete={handleDelete} />
      </div>

      <Modal isOpen={isFormOpen} title={formMode === "edit" ? "Edit Item" : "New Item"} onClose={closeForm}>
        <ItemForm item={formMode === "edit" ? editingItem : null} onCancel={closeForm} onSubmit={handleSave} />
      </Modal>
    </div>
  );
}
