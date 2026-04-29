"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { ItemCard } from "@/components/items/ItemCard";
import { ItemDetail } from "@/components/items/ItemDetail";
import { ItemRow } from "@/components/items/ItemRow";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { itemTypes } from "@/lib/items";
import type { Item, ItemFormValues, ItemType, SortMode, ViewMode } from "@/types";

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

const validItemTypes = new Set<ItemType>(itemTypes);

function getItemTags(item: Item) {
  return Array.isArray(item.tags) ? item.tags : [];
}

function getTimestamp(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getRecentTimestamp(item: Item) {
  return getTimestamp(item.updatedAt) || getTimestamp(item.createdAt);
}

function getSearchableText(item: Item) {
  return [item.title, item.content, item.command, item.url, item.type, ...getItemTags(item)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getUsageScore(item: Item) {
  return (item.useCount ?? 0) || (item.copyCount ?? 0);
}

export default function LibraryPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<ItemType | "all">("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();

      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault();
        setIsPaletteOpen(true);
        return;
      }

      if (event.key === "Escape") {
        setIsPaletteOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();

    items.forEach((item) => {
      if (!item.categoryId) {
        return;
      }

      counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [items]);

  const tagOptions = useMemo(() => {
    const counts = new Map<string, number>();

    items.forEach((item) => {
      getItemTags(item).forEach((tag) => {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      });
    });

    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  const filteredAndSortedItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = items.filter((item) => {
      const normalizedType = validItemTypes.has(item.type) ? item.type : "note";
      const tags = getItemTags(item);
      const matchesType = selectedType === "all" || normalizedType === selectedType;
      const matchesCategory = !selectedCategoryId || item.categoryId === selectedCategoryId;
      const matchesTag = !selectedTag || tags.includes(selectedTag);
      const matchesSearch = !query || getSearchableText(item).includes(query);

      return matchesType && matchesCategory && matchesTag && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === "alphabetical") {
        return (a.title ?? "").localeCompare(b.title ?? "");
      }

      if (sortMode === "mostUsed") {
        return getUsageScore(b) - getUsageScore(a);
      }

      if (sortMode === "pinnedFirst") {
        return Number(b.isPinned) - Number(a.isPinned) || getRecentTimestamp(b) - getRecentTimestamp(a);
      }

      return getRecentTimestamp(b) - getRecentTimestamp(a);
    });
  }, [items, searchQuery, selectedCategoryId, selectedTag, selectedType, sortMode]);

  const hasActiveFilters = searchQuery.trim().length > 0 || selectedType !== "all" || selectedCategoryId !== null || selectedTag !== null;

  function clearFilters() {
    setSearchQuery("");
    setSelectedType("all");
    setSelectedCategoryId(null);
    setSelectedTag(null);
  }

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
      <Sidebar
        activeType={selectedType}
        onTypeChange={setSelectedType}
        onNewItem={openCreateForm}
        categories={categoryOptions}
        selectedCategoryId={selectedCategoryId}
        onCategoryChange={setSelectedCategoryId}
        tags={tagOptions}
        selectedTag={selectedTag}
        onTagChange={setSelectedTag}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      <div className="md:pl-[240px]">
        <div className="xl:pr-[380px]">
          <TopBar
            totalItems={filteredAndSortedItems.length}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeType={selectedType}
            sortMode={sortMode}
            onSortModeChange={setSortMode}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />

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
            ) : filteredAndSortedItems.length > 0 ? (
              <div className={viewMode === "grid" ? "grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3" : "grid grid-cols-1 gap-3"}>
                {filteredAndSortedItems.map((item) => (
                  viewMode === "grid" ? (
                    <ItemCard
                      key={item.id}
                      item={item}
                      isSelected={selectedItem?.id === item.id}
                      onCopy={() => undefined}
                      onSelect={() => setSelectedItem(item)}
                      onTagSelect={setSelectedTag}
                      onCopyCountChange={(copyCount) => updateCopyCount(item.id, copyCount)}
                    />
                  ) : (
                    <ItemRow
                      key={item.id}
                      item={item}
                      isSelected={selectedItem?.id === item.id}
                      isCompact={viewMode === "compact"}
                      onCopy={() => undefined}
                      onSelect={() => setSelectedItem(item)}
                      onTagSelect={setSelectedTag}
                      onCopyCountChange={(copyCount) => updateCopyCount(item.id, copyCount)}
                    />
                  )
                ))}
              </div>
            ) : (
              <section className="flex min-h-[320px] items-center justify-center rounded-[6px] border border-[#2A2D3E] bg-[#1A1D27] p-8 text-center text-sm text-[#64748B]">
                {items.length === 0 ? "No library items found. Create your first item from the sidebar." : "No items match the current filters."}
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
          onTagSelect={setSelectedTag}
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

      <CommandPalette
        isOpen={isPaletteOpen}
        items={items}
        onClose={() => setIsPaletteOpen(false)}
        onNewItem={openCreateForm}
        onSelectItem={setSelectedItem}
      />
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
    tags: getItemTags(item).join(", "),
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
