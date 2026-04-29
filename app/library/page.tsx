"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { ItemCard } from "@/components/items/ItemCard";
import { ItemDetail } from "@/components/items/ItemDetail";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { itemTypes } from "@/lib/items";
import type { Item, ItemFormValues, ItemType } from "@/types";

const emptyFormValues: ItemFormValues = {
  type: "note",
  title: "",
  content: "",
  url: "",
  command: "",
  variables: [],
  tags: "",
  categoryId: "",
  isPinned: false,
};

export default function LibraryPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [activeType, setActiveType] = useState<ItemType | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadItems() {
      setIsLoading(true);
      setStatusMessage(null);

      const response = await fetch("/api/items", {
        cache: "no-store",
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        if (isMounted) {
          setStatusMessage("Could not load your library yet. Check the Supabase items table and try again.");
          setItems([]);
          setSelectedItem(null);
          setIsLoading(false);
        }
        return;
      }

      const result = (await response.json()) as { items: Item[] };

      if (isMounted) {
        setItems(result.items);
        setSelectedItem((current) => current ?? result.items[0] ?? null);
        setIsLoading(false);
      }
    }

    void loadItems();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const filteredItems = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return items.filter((item) => {
      const matchesType = activeType === "all" || item.type === activeType;
      const searchable = [item.title, item.content, item.command, item.url, ...item.tags].filter(Boolean).join(" ").toLowerCase();
      const matchesSearch = !query || searchable.includes(query);

      return matchesType && matchesSearch;
    });
  }, [activeType, items, searchValue]);

  function updateItemInState(updatedItem: Item) {
    setItems((current) => current.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
    setSelectedItem((current) => (current?.id === updatedItem.id ? updatedItem : current));
  }

  function updateCopyCount(itemId: string, copyCount: number) {
    setItems((current) => current.map((item) => (item.id === itemId ? { ...item, copyCount } : item)));
    setSelectedItem((current) => (current?.id === itemId ? { ...current, copyCount } : current));
  }

  function openCreateForm() {
    setStatusMessage(null);
    setEditingItem(null);
    setIsFormOpen(true);
  }

  function openEditForm() {
    if (!selectedItem) {
      return;
    }

    setStatusMessage(null);
    setEditingItem(selectedItem);
    setIsFormOpen(true);
  }

  async function saveItem(values: ItemFormValues) {
    setStatusMessage(null);

    const payload = formValuesToPayload(values);
    const url = editingItem ? `/api/items/${editingItem.id}` : "/api/items";
    const method = editingItem ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 401) {
      router.replace("/login");
      return;
    }

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string; detail?: string } | null;
      setStatusMessage(result?.detail ?? result?.error ?? "Could not save this item.");
      return;
    }

    const result = (await response.json()) as { item: Item };

    if (editingItem) {
      updateItemInState(result.item);
    } else {
      setItems((current) => [result.item, ...current]);
      setSelectedItem(result.item);
    }

    setIsFormOpen(false);
    setEditingItem(null);
  }

  async function deleteSelectedItem() {
    if (!selectedItem || !window.confirm("Delete this library item?")) {
      return;
    }

    const deletedId = selectedItem.id;
    const response = await fetch(`/api/items/${deletedId}`, {
      method: "DELETE",
    });

    if (response.status === 401) {
      router.replace("/login");
      return;
    }

    if (!response.ok) {
      setStatusMessage("Could not delete this item.");
      return;
    }

    setItems((current) => current.filter((item) => item.id !== deletedId));
    setSelectedItem((current) => (current?.id === deletedId ? null : current));
  }

  return (
    <div className="min-h-screen bg-[#0F1117] font-sans text-[#E2E8F0]">
      <Sidebar activeType={activeType} onTypeChange={setActiveType} onNewItem={openCreateForm} />

      <div className="md:pl-[240px]">
        <div className="xl:pr-[380px]">
          <TopBar totalItems={filteredItems.length} searchValue={searchValue} onSearchChange={setSearchValue} activeType={activeType} />

          <main className="p-4 md:p-6">
            {statusMessage ? (
              <div className="mb-4 rounded-[6px] border border-[#2A2D3E] bg-[#1A1D27] px-4 py-3 text-sm text-[#FBBF24]" role="status">
                {statusMessage}
              </div>
            ) : null}

            {isLoading ? (
              <section className="flex min-h-[320px] items-center justify-center rounded-[6px] border border-[#2A2D3E] bg-[#1A1D27] p-8 text-center text-sm text-[#64748B]">
                Loading your library...
              </section>
            ) : filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {filteredItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    isSelected={selectedItem?.id === item.id}
                    onCopy={() => undefined}
                    onSelect={() => setSelectedItem(item)}
                    onCopyCountChange={(copyCount) => updateCopyCount(item.id, copyCount)}
                  />
                ))}
              </div>
            ) : (
              <section className="flex min-h-[320px] items-center justify-center rounded-[6px] border border-[#2A2D3E] bg-[#1A1D27] p-8 text-center text-sm text-[#64748B]">
                No library items found. Create your first item from the sidebar.
              </section>
            )}
          </main>
        </div>
      </div>

      <div className="xl:fixed xl:inset-y-0 xl:right-0">
        <ItemDetail
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onEdit={openEditForm}
          onDelete={deleteSelectedItem}
          onCopyCountChange={(copyCount) => {
            if (selectedItem) {
              updateCopyCount(selectedItem.id, copyCount);
            }
          }}
        />
      </div>

      {isFormOpen ? (
        <ItemEditorModal
          item={editingItem}
          errorMessage={statusMessage}
          onClose={() => {
            setIsFormOpen(false);
            setEditingItem(null);
            setStatusMessage(null);
          }}
          onSave={saveItem}
        />
      ) : null}
    </div>
  );
}

function formValuesToPayload(values: ItemFormValues) {
  return {
    type: values.type,
    title: values.title,
    content: values.content,
    url: values.url,
    command: values.command,
    variables: values.variables ?? [],
    tags: values.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    categoryId: values.categoryId,
    isPinned: values.isPinned,
  };
}

function itemToFormValues(item: Item | null): ItemFormValues {
  if (!item) {
    return emptyFormValues;
  }

  return {
    type: item.type,
    title: item.title,
    content: item.content ?? "",
    url: item.url ?? "",
    command: item.command ?? "",
    variables: item.variables ?? [],
    tags: item.tags.join(", "),
    categoryId: item.categoryId ?? "",
    isPinned: item.isPinned,
  };
}

function ItemEditorModal({
  item,
  errorMessage,
  onClose,
  onSave,
}: {
  item: Item | null;
  errorMessage: string | null;
  onClose: () => void;
  onSave: (values: ItemFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<ItemFormValues>(() => itemToFormValues(item));
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    await onSave(values);
    setIsSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F1117]/80 p-4 backdrop-blur-sm">
      <section className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-[8px] border border-[#2A2D3E] bg-[#1A1D27]">
        <header className="flex items-center justify-between gap-4 border-b border-[#2A2D3E] p-5">
          <div>
            <h2 className="text-lg font-semibold text-[#E2E8F0]">{item ? "Edit item" : "New item"}</h2>
            <p className="mt-1 text-sm text-[#64748B]">Saved to the signed-in Supabase user.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-[4px] border border-[#2A2D3E] text-[#64748B] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
            aria-label="Close item editor"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="grid gap-4 p-5">
          {errorMessage ? (
            <div className="rounded-[6px] border border-[#2A2D3E] bg-[#0F1117] px-3 py-2 text-sm text-[#FBBF24]" role="status">
              {errorMessage}
            </div>
          ) : null}

          <label className="grid gap-2 text-sm font-medium text-[#E2E8F0]">
            Type
            <select
              value={values.type}
              onChange={(event) => setValues((current) => ({ ...current, type: event.target.value as ItemType }))}
              className="rounded-[4px] border border-[#2A2D3E] bg-[#0F1117] px-3 py-2 text-sm text-[#E2E8F0] transition-colors duration-150 focus:border-[#F59E0B] focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              {itemTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium text-[#E2E8F0]">
            Title
            <input
              value={values.title}
              onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
              className="rounded-[4px] border border-[#2A2D3E] bg-[#0F1117] px-3 py-2 text-sm text-[#E2E8F0] transition-colors duration-150 placeholder:text-[#374151] focus:border-[#F59E0B] focus:outline-none focus:ring-1 focus:ring-amber-400"
              required
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-[#E2E8F0]">
            Content
            <textarea
              value={values.content}
              onChange={(event) => setValues((current) => ({ ...current, content: event.target.value }))}
              className="min-h-[120px] rounded-[4px] border border-[#2A2D3E] bg-[#0F1117] px-3 py-2 font-mono text-sm text-[#E2E8F0] transition-colors duration-150 placeholder:text-[#374151] focus:border-[#F59E0B] focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-[#E2E8F0]">
              URL
              <input
                value={values.url}
                onChange={(event) => setValues((current) => ({ ...current, url: event.target.value }))}
                className="rounded-[4px] border border-[#2A2D3E] bg-[#0F1117] px-3 py-2 text-sm text-[#E2E8F0] transition-colors duration-150 placeholder:text-[#374151] focus:border-[#F59E0B] focus:outline-none focus:ring-1 focus:ring-amber-400"
                type="url"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#E2E8F0]">
              Category
              <input
                value={values.categoryId}
                onChange={(event) => setValues((current) => ({ ...current, categoryId: event.target.value }))}
                className="rounded-[4px] border border-[#2A2D3E] bg-[#0F1117] px-3 py-2 text-sm text-[#E2E8F0] transition-colors duration-150 placeholder:text-[#374151] focus:border-[#F59E0B] focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium text-[#E2E8F0]">
            Command
            <input
              value={values.command}
              onChange={(event) => setValues((current) => ({ ...current, command: event.target.value }))}
              className="rounded-[4px] border border-[#2A2D3E] bg-[#0F1117] px-3 py-2 font-mono text-sm text-[#E2E8F0] transition-colors duration-150 placeholder:text-[#374151] focus:border-[#F59E0B] focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-[#E2E8F0]">
            Tags
            <input
              value={values.tags}
              onChange={(event) => setValues((current) => ({ ...current, tags: event.target.value }))}
              className="rounded-[4px] border border-[#2A2D3E] bg-[#0F1117] px-3 py-2 text-sm text-[#E2E8F0] transition-colors duration-150 placeholder:text-[#374151] focus:border-[#F59E0B] focus:outline-none focus:ring-1 focus:ring-amber-400"
              placeholder="prompt, planning, reference"
            />
          </label>

          <label className="flex items-center gap-2 text-sm font-medium text-[#E2E8F0]">
            <input
              checked={values.isPinned}
              onChange={(event) => setValues((current) => ({ ...current, isPinned: event.target.checked }))}
              className="size-4 accent-amber-400"
              type="checkbox"
            />
            Pin item
          </label>

          <div className="flex justify-end gap-3 border-t border-[#2A2D3E] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-[4px] border border-[#2A2D3E] px-3 py-2 text-sm font-semibold text-[#E2E8F0] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-[4px] bg-amber-400 px-3 py-2 text-sm font-semibold text-[#0F1117] transition-colors duration-150 hover:bg-[#FBBF24] focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving" : "Save item"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
