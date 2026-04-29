"use client";

import { FormEvent, useMemo, useState } from "react";
import type { Item, ItemFormValues, ItemType } from "@/types";
import { TagChip } from "@/components/ui/TagChip";

interface ItemFormProps {
  item?: Item | null;
  onCancel: () => void;
  onSubmit: (values: ItemFormValues) => void;
}

const itemTypes: ItemType[] = ["prompt", "note", "link", "command", "snippet"];
const categories = [
  { label: "Workflow", value: "workflow" },
  { label: "Architecture", value: "architecture" },
  { label: "Reference", value: "reference" },
  { label: "Commands", value: "commands" },
  { label: "Snippets", value: "snippets" },
];

function parseTags(input: string) {
  return input
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function detectVariables(content: string) {
  const matches = content.matchAll(/{{\s*([A-Za-z_][\w-]*)\s*}}/g);
  return Array.from(new Set(Array.from(matches, (match) => match[1])));
}

export function ItemForm({ item, onCancel, onSubmit }: ItemFormProps) {
  const [type, setType] = useState<ItemType>(item?.type ?? "prompt");
  const [title, setTitle] = useState(item?.title ?? "");
  const [content, setContent] = useState(item?.content ?? "");
  const [url, setUrl] = useState(item?.url ?? "");
  const [command, setCommand] = useState(item?.command ?? "");
  const [tagsInput, setTagsInput] = useState(item?.tags.join(", ") ?? "");
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? "");

  const detectedVariables = useMemo(() => (type === "prompt" ? detectVariables(content) : []), [content, type]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    onSubmit({
      type,
      title: title.trim(),
      content: content.trim(),
      url: type === "link" ? url.trim() : "",
      command: type === "command" ? command.trim() : "",
      tags: parseTags(tagsInput),
      categoryId: categoryId || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-5 overflow-y-auto px-5 py-5">
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#64748B]">Type</h3>
          <div className="grid grid-cols-2 border border-[#2A2D3E] bg-[#0F1117] sm:grid-cols-5">
            {itemTypes.map((itemType) => (
              <button
                key={itemType}
                type="button"
                onClick={() => setType(itemType)}
                className={`border-[#2A2D3E] px-3 py-2 text-sm font-medium capitalize transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-amber-400 sm:border-r sm:last:border-r-0 ${
                  type === itemType ? "bg-amber-400 text-[#0F1117]" : "text-[#64748B] hover:bg-[#21243A]"
                }`}
              >
                {itemType}
              </button>
            ))}
          </div>
        </section>

        <label className="block">
          <span className="text-sm font-medium text-[#E2E8F0]">Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            className="mt-2 w-full rounded-[4px] border border-[#2A2D3E] bg-[#0F1117] px-3 py-2 text-sm text-[#E2E8F0] outline-none transition-colors duration-150 placeholder:text-[#374151] focus:ring-1 focus:ring-amber-400"
            placeholder="Name this item"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[#E2E8F0]">Content</span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={6}
            className={`mt-2 w-full resize-y rounded-[4px] border border-[#2A2D3E] bg-[#0F1117] px-3 py-2 text-sm text-[#E2E8F0] outline-none transition-colors duration-150 placeholder:text-[#374151] focus:ring-1 focus:ring-amber-400 ${
              type === "prompt" || type === "command" || type === "snippet" ? "font-mono" : ""
            }`}
            placeholder={type === "prompt" ? "Write prompt text with {{variables}} if needed" : "Write the item body or description"}
          />
        </label>

        {detectedVariables.length > 0 ? (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#64748B]">Detected variables</h3>
            <div className="flex flex-wrap gap-2">
              {detectedVariables.map((variable) => (
                <TagChip key={variable} label={`{{${variable}}}`} />
              ))}
            </div>
          </section>
        ) : null}

        {type === "link" ? (
          <label className="block">
            <span className="text-sm font-medium text-[#E2E8F0]">URL</span>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              type="url"
              className="mt-2 w-full rounded-[4px] border border-[#2A2D3E] bg-[#0F1117] px-3 py-2 text-sm text-[#E2E8F0] outline-none transition-colors duration-150 placeholder:text-[#374151] focus:ring-1 focus:ring-amber-400"
              placeholder="https://example.com"
            />
          </label>
        ) : null}

        {type === "command" ? (
          <label className="block">
            <span className="text-sm font-medium text-[#E2E8F0]">Command</span>
            <input
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              className="mt-2 w-full rounded-[4px] border border-[#2A2D3E] bg-[#0F1117] px-3 py-2 font-mono text-sm text-[#E2E8F0] outline-none transition-colors duration-150 placeholder:text-[#374151] focus:ring-1 focus:ring-amber-400"
              placeholder="npm run build"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="text-sm font-medium text-[#E2E8F0]">Tags</span>
          <input
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
            className="mt-2 w-full rounded-[4px] border border-[#2A2D3E] bg-[#0F1117] px-3 py-2 text-sm text-[#E2E8F0] outline-none transition-colors duration-150 placeholder:text-[#374151] focus:ring-1 focus:ring-amber-400"
            placeholder="product, prompt, powershell"
          />
          <span className="mt-2 block text-xs text-[#64748B]">Separate tags with commas.</span>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[#E2E8F0]">Category</span>
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="mt-2 w-full rounded-[4px] border border-[#2A2D3E] bg-[#0F1117] px-3 py-2 text-sm text-[#E2E8F0] outline-none transition-colors duration-150 focus:ring-1 focus:ring-amber-400"
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <footer className="flex justify-end gap-3 border-t border-[#2A2D3E] px-5 py-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[4px] border border-[#2A2D3E] px-4 py-2 text-sm font-semibold text-[#E2E8F0] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-[4px] bg-amber-400 px-4 py-2 text-sm font-semibold text-[#0F1117] transition-colors duration-150 hover:bg-[#FBBF24] focus:outline-none focus:ring-1 focus:ring-amber-400"
        >
          Save
        </button>
      </footer>
    </form>
  );
}
