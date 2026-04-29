"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Edit3, Folder, GitMerge, Plus, Save, Tags, Trash2, Upload } from "lucide-react";
import type { Category } from "@/types";

interface CategoryFormValues {
  name: string;
  color: string;
  icon: string;
}

interface TagSummary {
  name: string;
  count: number;
}

type SettingsSection = "categories" | "tags" | "importExport";

const emptyFormValues: CategoryFormValues = {
  name: "",
  color: "#F59E0B",
  icon: "folder",
};

const sections: Array<{ id: SettingsSection; label: string }> = [
  { id: "categories", label: "Categories" },
  { id: "tags", label: "Tags" },
  { id: "importExport", label: "Import / Export" },
];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportFilename(extension: "json" | "md") {
  return `grimoire-export-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

export default function SettingsPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SettingsSection>("categories");
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<TagSummary[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formValues, setFormValues] = useState<CategoryFormValues>(emptyFormValues);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [tagDraft, setTagDraft] = useState("");
  const [mergeSource, setMergeSource] = useState("");
  const [mergeTarget, setMergeTarget] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadSettingsData = useCallback(async () => {
    setIsLoading(true);
    setStatusMessage(null);

    const [categoriesResponse, tagsResponse] = await Promise.all([
      fetch("/api/categories", { cache: "no-store" }),
      fetch("/api/tags", { cache: "no-store" }),
    ]);

    if (categoriesResponse.status === 401 || tagsResponse.status === 401) {
      router.replace("/login");
      return;
    }

    if (!categoriesResponse.ok || !tagsResponse.ok) {
      setStatusMessage("Could not load settings data.");
      setCategories([]);
      setTags([]);
      setIsLoading(false);
      return;
    }

    const categoriesResult = (await categoriesResponse.json()) as { categories: Category[] };
    const tagsResult = (await tagsResponse.json()) as { tags: TagSummary[] };

    setCategories(categoriesResult.categories);
    setTags(tagsResult.tags);
    setIsLoading(false);
  }, [router]);

  useEffect(() => {
    void loadSettingsData();
  }, [loadSettingsData]);

  function startCreate() {
    setEditingCategory(null);
    setFormValues(emptyFormValues);
    setStatusMessage(null);
  }

  function startEdit(category: Category) {
    setEditingCategory(category);
    setFormValues({
      name: category.name,
      color: category.color,
      icon: category.icon,
    });
    setStatusMessage(null);
  }

  function startRenameTag(tag: TagSummary) {
    setEditingTag(tag.name);
    setTagDraft(tag.name);
    setStatusMessage(null);
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    const response = await fetch(editingCategory ? `/api/categories/${editingCategory.id}` : "/api/categories", {
      method: editingCategory ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formValues),
    });

    setIsSaving(false);

    if (response.status === 401) {
      router.replace("/login");
      return;
    }

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string; detail?: string } | null;
      setStatusMessage(result?.detail ?? result?.error ?? "Could not save category.");
      return;
    }

    const result = (await response.json()) as { category: Category };

    if (editingCategory) {
      setCategories((current) => current.map((category) => (category.id === result.category.id ? result.category : category)));
    } else {
      setCategories((current) => [...current, result.category].sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt)));
    }

    setEditingCategory(null);
    setFormValues(emptyFormValues);
    setStatusMessage("Category saved.");
  }

  async function deleteCategory(category: Category) {
    if (!window.confirm(`Delete "${category.name}"? Items using it will move to no category.`)) {
      return;
    }

    setStatusMessage(null);

    const response = await fetch(`/api/categories/${category.id}`, {
      method: "DELETE",
    });

    if (response.status === 401) {
      router.replace("/login");
      return;
    }

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string; detail?: string } | null;
      setStatusMessage(result?.detail ?? result?.error ?? "Could not delete category.");
      return;
    }

    setCategories((current) => current.filter((currentCategory) => currentCategory.id !== category.id));

    if (editingCategory?.id === category.id) {
      setEditingCategory(null);
      setFormValues(emptyFormValues);
    }

    setStatusMessage("Category deleted.");
  }

  async function renameTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingTag || tagDraft.trim().length === 0) {
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    const response = await fetch("/api/tags", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ oldTag: editingTag, newTag: tagDraft }),
    });

    setIsSaving(false);

    if (response.status === 401) {
      router.replace("/login");
      return;
    }

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string; detail?: string } | null;
      setStatusMessage(result?.detail ?? result?.error ?? "Could not rename tag.");
      return;
    }

    setEditingTag(null);
    setTagDraft("");
    setStatusMessage("Tag renamed.");
    await loadSettingsData();
  }

  async function deleteTag(tag: TagSummary) {
    if (!window.confirm(`Remove "${tag.name}" from ${tag.count} item${tag.count === 1 ? "" : "s"}?`)) {
      return;
    }

    setStatusMessage(null);

    const response = await fetch("/api/tags", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tag: tag.name }),
    });

    if (response.status === 401) {
      router.replace("/login");
      return;
    }

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string; detail?: string } | null;
      setStatusMessage(result?.detail ?? result?.error ?? "Could not delete tag.");
      return;
    }

    setStatusMessage("Tag removed from matching items.");
    await loadSettingsData();
  }

  async function mergeTags(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!mergeSource || !mergeTarget) {
      setStatusMessage("Choose source and target tags.");
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    const response = await fetch("/api/tags/merge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sourceTag: mergeSource, targetTag: mergeTarget }),
    });

    setIsSaving(false);

    if (response.status === 401) {
      router.replace("/login");
      return;
    }

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string; detail?: string } | null;
      setStatusMessage(result?.detail ?? result?.error ?? "Could not merge tags.");
      return;
    }

    setMergeSource("");
    setMergeTarget("");
    setStatusMessage("Tags merged.");
    await loadSettingsData();
  }

  async function exportData(format: "json" | "markdown") {
    setStatusMessage(null);
    const response = await fetch(`/api/export?format=${format}`, { cache: "no-store" });

    if (response.status === 401) {
      router.replace("/login");
      return;
    }

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string; detail?: string } | null;
      setStatusMessage(result?.detail ?? result?.error ?? "Could not export data.");
      return;
    }

    downloadBlob(await response.blob(), exportFilename(format === "json" ? "json" : "md"));
    setStatusMessage(`${format === "json" ? "JSON" : "Markdown"} export ready.`);
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setStatusMessage(null);

    const parsed = await file
      .text()
      .then((text) => JSON.parse(text) as unknown)
      .catch(() => null);

    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { items?: unknown }).items) || !Array.isArray((parsed as { categories?: unknown }).categories)) {
      setStatusMessage("Choose a valid Grimoire JSON export.");
      return;
    }

    const response = await fetch("/api/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed),
    });

    if (response.status === 401) {
      router.replace("/login");
      return;
    }

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string; detail?: string } | null;
      setStatusMessage(result?.detail ?? result?.error ?? "Could not import data.");
      return;
    }

    const result = (await response.json()) as { imported: { categories: number; items: number } };
    setStatusMessage(`Imported ${result.imported.items} items and ${result.imported.categories} categories.`);
    await loadSettingsData();
  }

  return (
    <main className="min-h-screen bg-[#0F1117] p-4 font-sans text-[#E2E8F0] md:p-6">
      <div className="mx-auto grid w-full max-w-[1120px] gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="rounded-[6px] border border-[#2A2D3E] bg-[#1A1D27] p-4">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-[#E2E8F0]">Settings</h1>
            <p className="mt-1 text-sm text-[#64748B]">Workspace controls</p>
          </div>
          <nav className="grid gap-1" aria-label="Settings sections">
            {sections.map((section) => (
              <button
                key={section.id}
                className={`rounded-[4px] px-3 py-2 text-left text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-amber-400 ${
                  activeSection === section.id ? "bg-[#21243A] text-[#FBBF24]" : "text-[#64748B] hover:bg-[#21243A]"
                }`}
                type="button"
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </nav>
          <Link
            href="/library"
            className="mt-6 inline-flex w-full items-center justify-center rounded-[4px] border border-[#2A2D3E] px-3 py-2 text-sm font-medium text-[#E2E8F0] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
          >
            Back to Library
          </Link>
        </aside>

        <section className="grid gap-6">
          {statusMessage ? (
            <div className="rounded-[6px] border border-[#2A2D3E] bg-[#1A1D27] px-4 py-3 text-sm text-[#FBBF24]" role="status">
              {statusMessage}
            </div>
          ) : null}

          {activeSection === "categories" ? (
            <CategoriesSection
              categories={categories}
              editingCategory={editingCategory}
              formValues={formValues}
              isLoading={isLoading}
              isSaving={isSaving}
              onCreate={startCreate}
              onDelete={deleteCategory}
              onEdit={startEdit}
              onFormChange={setFormValues}
              onSave={saveCategory}
            />
          ) : null}

          {activeSection === "tags" ? (
            <TagsSection
              editingTag={editingTag}
              isLoading={isLoading}
              isSaving={isSaving}
              mergeSource={mergeSource}
              mergeTarget={mergeTarget}
              tagDraft={tagDraft}
              tags={tags}
              onCancelRename={() => {
                setEditingTag(null);
                setTagDraft("");
              }}
              onDelete={deleteTag}
              onMerge={mergeTags}
              onMergeSourceChange={setMergeSource}
              onMergeTargetChange={setMergeTarget}
              onRename={renameTag}
              onRenameDraftChange={setTagDraft}
              onStartRename={startRenameTag}
            />
          ) : null}

          {activeSection === "importExport" ? <ImportExportSection onExport={exportData} onImport={importJson} /> : null}
        </section>
      </div>
    </main>
  );
}

function CategoriesSection({
  categories,
  editingCategory,
  formValues,
  isLoading,
  isSaving,
  onCreate,
  onDelete,
  onEdit,
  onFormChange,
  onSave,
}: {
  categories: Category[];
  editingCategory: Category | null;
  formValues: CategoryFormValues;
  isLoading: boolean;
  isSaving: boolean;
  onCreate: () => void;
  onDelete: (category: Category) => void;
  onEdit: (category: Category) => void;
  onFormChange: (values: CategoryFormValues | ((current: CategoryFormValues) => CategoryFormValues)) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="rounded-[6px] border border-[#2A2D3E] bg-[#1A1D27] p-5">
      <div className="flex flex-col gap-3 border-b border-[#2A2D3E] pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#E2E8F0]">Categories</h2>
          <p className="mt-1 text-sm text-[#64748B]">Organize saved items in your private library.</p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center justify-center gap-2 rounded-[4px] bg-amber-400 px-3 py-2 text-sm font-semibold text-[#0F1117] transition-colors duration-150 hover:bg-[#FBBF24] focus:outline-none focus:ring-1 focus:ring-amber-400"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add Category
        </button>
      </div>

      <form onSubmit={onSave} className="mt-5 grid gap-4 border-b border-[#2A2D3E] pb-5 md:grid-cols-[minmax(0,1fr)_150px_150px_auto]">
        <label className="grid gap-2 text-sm font-medium text-[#E2E8F0]">
          Name
          <input
            value={formValues.name}
            onChange={(event) => onFormChange((current) => ({ ...current, name: event.target.value }))}
            className="rounded-[4px] border border-[#2A2D3E] bg-[#0F1117] px-3 py-2 text-sm text-[#E2E8F0] transition-colors duration-150 placeholder:text-[#374151] focus:border-[#F59E0B] focus:outline-none focus:ring-1 focus:ring-amber-400"
            placeholder="Workflows"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[#E2E8F0]">
          Color
          <input
            value={formValues.color}
            onChange={(event) => onFormChange((current) => ({ ...current, color: event.target.value }))}
            className="rounded-[4px] border border-[#2A2D3E] bg-[#0F1117] px-3 py-2 font-mono text-sm text-[#E2E8F0] transition-colors duration-150 placeholder:text-[#374151] focus:border-[#F59E0B] focus:outline-none focus:ring-1 focus:ring-amber-400"
            placeholder="#F59E0B"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[#E2E8F0]">
          Icon
          <select
            value={formValues.icon}
            onChange={(event) => onFormChange((current) => ({ ...current, icon: event.target.value }))}
            className="rounded-[4px] border border-[#2A2D3E] bg-[#0F1117] px-3 py-2 text-sm text-[#E2E8F0] transition-colors duration-150 focus:border-[#F59E0B] focus:outline-none focus:ring-1 focus:ring-amber-400"
          >
            <option value="folder">folder</option>
            <option value="book">book</option>
            <option value="terminal">terminal</option>
            <option value="link">link</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex h-10 items-center justify-center rounded-[4px] bg-amber-400 px-3 text-sm font-semibold text-[#0F1117] transition-colors duration-150 hover:bg-[#FBBF24] focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving" : editingCategory ? "Update" : "Create"}
          </button>
        </div>
      </form>

      <div className="mt-5 grid gap-3">
        {isLoading ? (
          <div className="rounded-[6px] border border-[#2A2D3E] bg-[#0F1117] p-6 text-center text-sm text-[#64748B]">Loading categories...</div>
        ) : categories.length > 0 ? (
          categories.map((category) => (
            <div key={category.id} className="grid gap-3 rounded-[6px] border border-[#2A2D3E] bg-[#0F1117] p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[4px] border border-[#2A2D3E] text-amber-400">
                  <Folder className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#E2E8F0]">{category.name}</p>
                  <p className="mt-1 font-mono text-xs text-[#64748B]">
                    {category.icon} / {category.color}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 md:justify-end">
                <button
                  type="button"
                  onClick={() => onEdit(category)}
                  className="inline-flex items-center justify-center gap-2 rounded-[4px] border border-[#2A2D3E] px-3 py-2 text-sm font-medium text-[#E2E8F0] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
                >
                  <Edit3 className="size-4" aria-hidden="true" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(category)}
                  className="inline-flex items-center justify-center gap-2 rounded-[4px] border border-[#EF4444]/60 px-3 py-2 text-sm font-medium text-[#FCA5A5] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[6px] border border-[#2A2D3E] bg-[#0F1117] p-6 text-center text-sm text-[#64748B]">No categories yet.</div>
        )}
      </div>
    </div>
  );
}

function TagsSection({
  editingTag,
  isLoading,
  isSaving,
  mergeSource,
  mergeTarget,
  tagDraft,
  tags,
  onCancelRename,
  onDelete,
  onMerge,
  onMergeSourceChange,
  onMergeTargetChange,
  onRename,
  onRenameDraftChange,
  onStartRename,
}: {
  editingTag: string | null;
  isLoading: boolean;
  isSaving: boolean;
  mergeSource: string;
  mergeTarget: string;
  tagDraft: string;
  tags: TagSummary[];
  onCancelRename: () => void;
  onDelete: (tag: TagSummary) => void;
  onMerge: (event: FormEvent<HTMLFormElement>) => void;
  onMergeSourceChange: (tag: string) => void;
  onMergeTargetChange: (tag: string) => void;
  onRename: (event: FormEvent<HTMLFormElement>) => void;
  onRenameDraftChange: (tag: string) => void;
  onStartRename: (tag: TagSummary) => void;
}) {
  return (
    <div className="rounded-[6px] border border-[#2A2D3E] bg-[#1A1D27] p-5">
      <div className="border-b border-[#2A2D3E] pb-4">
        <h2 className="text-lg font-semibold text-[#E2E8F0]">Tags</h2>
        <p className="mt-1 text-sm text-[#64748B]">Rename, remove, or merge tags derived from your saved items.</p>
      </div>

      <form onSubmit={onMerge} className="mt-5 grid gap-3 border-b border-[#2A2D3E] pb-5 md:grid-cols-[1fr_1fr_auto]">
        <label className="grid gap-2 text-sm font-medium text-[#E2E8F0]">
          Merge from
          <select
            value={mergeSource}
            onChange={(event) => onMergeSourceChange(event.target.value)}
            className="rounded-[4px] border border-[#2A2D3E] bg-[#0F1117] px-3 py-2 text-sm text-[#E2E8F0] transition-colors duration-150 focus:border-[#F59E0B] focus:outline-none focus:ring-1 focus:ring-amber-400"
          >
            <option value="">Choose tag</option>
            {tags.map((tag) => (
              <option key={tag.name} value={tag.name}>
                {tag.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-[#E2E8F0]">
          Into
          <select
            value={mergeTarget}
            onChange={(event) => onMergeTargetChange(event.target.value)}
            className="rounded-[4px] border border-[#2A2D3E] bg-[#0F1117] px-3 py-2 text-sm text-[#E2E8F0] transition-colors duration-150 focus:border-[#F59E0B] focus:outline-none focus:ring-1 focus:ring-amber-400"
          >
            <option value="">Choose tag</option>
            {tags.map((tag) => (
              <option key={tag.name} value={tag.name}>
                {tag.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={isSaving || !mergeSource || !mergeTarget}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[4px] border border-[#2A2D3E] px-3 text-sm font-medium text-[#E2E8F0] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GitMerge className="size-4" aria-hidden="true" />
            Merge
          </button>
        </div>
      </form>

      <div className="mt-5 grid gap-3">
        {isLoading ? (
          <div className="rounded-[6px] border border-[#2A2D3E] bg-[#0F1117] p-6 text-center text-sm text-[#64748B]">Loading tags...</div>
        ) : tags.length > 0 ? (
          tags.map((tag) => (
            <div key={tag.name} className="grid gap-3 rounded-[6px] border border-[#2A2D3E] bg-[#0F1117] p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[4px] border border-[#2A2D3E] text-amber-400">
                  <Tags className="size-4" aria-hidden="true" />
                </span>
                {editingTag === tag.name ? (
                  <form onSubmit={onRename} className="grid min-w-0 flex-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                    <input
                      value={tagDraft}
                      onChange={(event) => onRenameDraftChange(event.target.value)}
                      className="rounded-[4px] border border-[#2A2D3E] bg-[#1A1D27] px-3 py-2 text-sm text-[#E2E8F0] transition-colors duration-150 focus:border-[#F59E0B] focus:outline-none focus:ring-1 focus:ring-amber-400"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex items-center justify-center gap-2 rounded-[4px] bg-amber-400 px-3 py-2 text-sm font-semibold text-[#0F1117] transition-colors duration-150 hover:bg-[#FBBF24] focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Save className="size-4" aria-hidden="true" />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={onCancelRename}
                      className="inline-flex items-center justify-center rounded-[4px] border border-[#2A2D3E] px-3 py-2 text-sm text-[#E2E8F0] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#E2E8F0]">{tag.name}</p>
                    <p className="mt-1 font-mono text-xs text-[#64748B]">
                      {tag.count} item{tag.count === 1 ? "" : "s"}
                    </p>
                  </div>
                )}
              </div>
              {editingTag === tag.name ? null : (
                <div className="flex gap-2 md:justify-end">
                  <button
                    type="button"
                    onClick={() => onStartRename(tag)}
                    className="inline-flex items-center justify-center gap-2 rounded-[4px] border border-[#2A2D3E] px-3 py-2 text-sm font-medium text-[#E2E8F0] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
                  >
                    <Edit3 className="size-4" aria-hidden="true" />
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(tag)}
                    className="inline-flex items-center justify-center gap-2 rounded-[4px] border border-[#EF4444]/60 px-3 py-2 text-sm font-medium text-[#FCA5A5] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="rounded-[6px] border border-[#2A2D3E] bg-[#0F1117] p-6 text-center text-sm text-[#64748B]">No tags yet.</div>
        )}
      </div>
    </div>
  );
}

function ImportExportSection({
  onExport,
  onImport,
}: {
  onExport: (format: "json" | "markdown") => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="rounded-[6px] border border-[#2A2D3E] bg-[#1A1D27] p-5">
      <div className="border-b border-[#2A2D3E] pb-4">
        <h2 className="text-lg font-semibold text-[#E2E8F0]">Import / Export</h2>
        <p className="mt-1 text-sm text-[#64748B]">Move your library as JSON or export a readable Markdown snapshot.</p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <section className="rounded-[6px] border border-[#2A2D3E] bg-[#0F1117] p-4">
          <h3 className="text-sm font-semibold text-[#E2E8F0]">Export</h3>
          <p className="mt-1 text-sm text-[#64748B]">Download current user-owned categories and items.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onExport("json")}
              className="inline-flex items-center justify-center gap-2 rounded-[4px] bg-amber-400 px-3 py-2 text-sm font-semibold text-[#0F1117] transition-colors duration-150 hover:bg-[#FBBF24] focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              <Download className="size-4" aria-hidden="true" />
              JSON
            </button>
            <button
              type="button"
              onClick={() => onExport("markdown")}
              className="inline-flex items-center justify-center gap-2 rounded-[4px] border border-[#2A2D3E] px-3 py-2 text-sm font-medium text-[#E2E8F0] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              <Download className="size-4" aria-hidden="true" />
              Markdown
            </button>
          </div>
        </section>

        <section className="rounded-[6px] border border-[#2A2D3E] bg-[#0F1117] p-4">
          <h3 className="text-sm font-semibold text-[#E2E8F0]">Import JSON</h3>
          <p className="mt-1 text-sm text-[#64748B]">Add items from a Grimoire export. Existing data is kept.</p>
          <label className="mt-4 inline-flex cursor-pointer items-center justify-center gap-2 rounded-[4px] border border-[#2A2D3E] px-3 py-2 text-sm font-medium text-[#E2E8F0] transition-colors duration-150 hover:bg-[#21243A] focus-within:outline-none focus-within:ring-1 focus-within:ring-amber-400">
            <Upload className="size-4" aria-hidden="true" />
            Choose JSON
            <input type="file" accept="application/json,.json" onChange={onImport} className="sr-only" />
          </label>
        </section>
      </div>
    </div>
  );
}
