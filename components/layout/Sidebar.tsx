"use client";

import { useState } from "react";
import type { ItemType } from "@/types";
import { BookOpen, Brain, Code2, FileText, Link2, Menu, Plus, Terminal, X } from "lucide-react";

interface TypeFilter {
  type: ItemType | "all";
  label: string;
}

interface SidebarProps {
  activeType: ItemType | "all";
  onTypeChange: (type: ItemType | "all") => void;
  onNewItem: () => void;
}

const typeFilters: TypeFilter[] = [
  { type: "all", label: "All" },
  { type: "prompt", label: "Prompt" },
  { type: "note", label: "Note" },
  { type: "link", label: "Link" },
  { type: "command", label: "Command" },
  { type: "snippet", label: "Snippet" },
];

const categories = ["Workflow", "Architecture", "Reference", "Commands"];

function TypeIcon({ type }: { type: TypeFilter["type"] }) {
  if (type === "prompt") return <BookOpen className="size-4" aria-hidden="true" />;
  if (type === "note") return <FileText className="size-4" aria-hidden="true" />;
  if (type === "link") return <Link2 className="size-4" aria-hidden="true" />;
  if (type === "command") return <Terminal className="size-4" aria-hidden="true" />;
  if (type === "snippet") return <Code2 className="size-4" aria-hidden="true" />;
  return <Brain className="size-4" aria-hidden="true" />;
}

export function Sidebar({ activeType, onTypeChange, onNewItem }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[#2A2D3E] bg-[#1A1D27] p-4 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <Brand />
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex size-10 items-center justify-center rounded-[4px] border border-[#2A2D3E] text-[#E2E8F0] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
            aria-label="Open library navigation"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      {isOpen ? (
        <div className="fixed inset-0 z-50 bg-[#0F1117]/80 backdrop-blur-sm md:hidden">
          <div className="flex h-full w-[min(320px,86vw)] flex-col border-r border-[#2A2D3E] bg-[#1A1D27] p-4">
            <div className="mb-6 flex items-center justify-between gap-3">
              <Brand />
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-[4px] border border-[#2A2D3E] text-[#64748B] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
                aria-label="Close library navigation"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <SidebarContent activeType={activeType} onTypeChange={onTypeChange} onNewItem={onNewItem} onAfterSelect={() => setIsOpen(false)} />
          </div>
        </div>
      ) : null}

      <aside className="fixed inset-y-0 left-0 hidden w-[240px] border-r border-[#2A2D3E] bg-[#1A1D27] md:block">
        <div className="flex h-full flex-col p-4">
          <Brand />
          <SidebarContent activeType={activeType} onTypeChange={onTypeChange} onNewItem={onNewItem} />
        </div>
      </aside>
    </>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-[6px] border border-[#2A2D3E] bg-[#0F1117] text-amber-400">
        <Brain className="size-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[#E2E8F0]">Grimoire</p>
        <p className="text-xs text-[#64748B]">Second Brain</p>
      </div>
    </div>
  );
}

function SidebarContent({
  activeType,
  onTypeChange,
  onNewItem,
  onAfterSelect,
}: SidebarProps & {
  onAfterSelect?: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={() => {
          onNewItem();
          onAfterSelect?.();
        }}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-[4px] bg-amber-400 px-3 py-2 text-sm font-semibold text-[#0F1117] transition-colors duration-150 hover:bg-[#FBBF24] focus:outline-none focus:ring-1 focus:ring-amber-400"
      >
        <Plus className="size-4" aria-hidden="true" />
        New Item
      </button>

      <nav className="mt-6 space-y-1" aria-label="Library type filters">
        {typeFilters.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              onTypeChange(type);
              onAfterSelect?.();
            }}
            className={`flex w-full items-center gap-2 rounded-[4px] px-3 py-2 text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-amber-400 ${
              activeType === type ? "bg-[#21243A] text-[#E2E8F0]" : "text-[#64748B] hover:bg-[#21243A]"
            }`}
          >
            <TypeIcon type={type} />
            {label}
          </button>
        ))}
      </nav>

      <section className="mt-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#64748B]">Categories</h2>
        <div className="space-y-1">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className="flex w-full items-center justify-between gap-2 rounded-[4px] px-3 py-2 text-sm text-[#E2E8F0] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              <span className="truncate">{category}</span>
              <span className="font-mono text-xs text-[#64748B]">0</span>
            </button>
          ))}
        </div>
      </section>

      <div className="mt-auto border-t border-[#2A2D3E] pt-4 text-xs leading-5 text-[#64748B]">
        Supabase wiring comes later. Demo data is local only.
      </div>
    </>
  );
}
