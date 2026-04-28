"use client";

import { useState } from "react";
import { BookOpen, Brain, FileText, Folder, Link2, Menu, Plus, Settings, Sparkles, Terminal, X } from "lucide-react";

const categories = [
  { name: "Workflows", count: 12, color: "bg-[#6366F1]" },
  { name: "Architecture", count: 8, color: "bg-[#0EA5E9]" },
  { name: "Commands", count: 6, color: "bg-[#F59E0B]" },
  { name: "References", count: 14, color: "bg-[#10B981]" },
];

const typeFilters = [
  { label: "Prompt", Icon: BookOpen },
  { label: "Note", Icon: FileText },
  { label: "Link", Icon: Link2 },
  { label: "Command", Icon: Terminal },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[#2A2D3E] bg-[#1A1D27] p-4 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-[6px] border border-[#2A2D3E] bg-[#0F1117] text-amber-400">
              <Brain className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#E2E8F0]">Second Brain</p>
              <p className="text-xs text-[#64748B]">Library</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="control-base control-hover inline-flex size-10 items-center justify-center border border-[#2A2D3E] text-[#E2E8F0]"
            aria-label="Open navigation"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      {isOpen ? (
        <div className="fixed inset-0 z-40 bg-[#0F1117]/80 backdrop-blur-sm md:hidden">
          <div className="flex h-full w-[min(320px,86vw)] flex-col border-r border-[#2A2D3E] bg-[#1A1D27] p-4">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-[6px] border border-[#2A2D3E] bg-[#0F1117] text-amber-400">
                  <Brain className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#E2E8F0]">Second Brain</p>
                  <p className="text-xs text-[#64748B]">Library</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="control-base control-hover inline-flex size-9 items-center justify-center border border-[#2A2D3E] text-[#64748B]"
                aria-label="Close navigation"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      ) : null}

      <aside className="fixed inset-y-0 left-0 hidden w-[240px] border-r border-[#2A2D3E] bg-[#1A1D27] md:block">
        <div className="flex h-full flex-col p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-[6px] border border-[#2A2D3E] bg-[#0F1117] text-amber-400">
              <Brain className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#E2E8F0]">Second Brain</p>
              <p className="text-xs text-[#64748B]">Library</p>
            </div>
          </div>
          <SidebarContent />
        </div>
      </aside>
    </>
  );
}

function SidebarContent() {
  return (
    <>
      <button
        type="button"
        className="control-base mt-6 inline-flex items-center justify-center gap-2 bg-[#F59E0B] px-3 py-2 text-sm font-semibold text-[#0F1117] hover:bg-[#FBBF24]"
      >
        <Plus className="size-4" aria-hidden="true" />
        New
      </button>

      <nav className="mt-6 space-y-1" aria-label="Primary navigation">
        <a className="control-base flex items-center gap-2 bg-[#21243A] px-3 py-2 text-sm font-medium text-[#E2E8F0]" href="/library">
          <BookOpen className="size-4 text-amber-400" aria-hidden="true" />
          Library
        </a>
        <a className="control-base control-hover flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#64748B]" href="#">
          <Sparkles className="size-4" aria-hidden="true" />
          Brain
        </a>
        <a className="control-base control-hover flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#64748B]" href="#">
          <Settings className="size-4" aria-hidden="true" />
          Settings
        </a>
      </nav>

      <div className="mt-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#64748B]">Categories</p>
        <div className="space-y-1">
          {categories.map((category) => (
            <button
              key={category.name}
              type="button"
              className="control-base control-hover flex w-full items-center justify-between gap-2 px-3 py-2 text-sm text-[#E2E8F0]"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className={`size-2 shrink-0 rounded-[2px] ${category.color}`} />
                <span className="truncate">{category.name}</span>
              </span>
              <span className="font-mono text-xs text-[#64748B]">{category.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#64748B]">Type</p>
        <div className="grid grid-cols-2 gap-2">
          {typeFilters.map(({ label, Icon }) => (
            <button
              key={label}
              type="button"
              className="control-base control-hover flex items-center gap-2 border border-[#2A2D3E] px-2 py-2 text-xs font-medium text-[#64748B]"
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto border-t border-[#2A2D3E] pt-4">
        <button type="button" className="control-base control-hover flex w-full items-center gap-2 px-3 py-2 text-sm text-[#64748B]">
          <Folder className="size-4" aria-hidden="true" />
          Manage categories
        </button>
      </div>
    </>
  );
}
