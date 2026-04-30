"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCategoryIcon } from "@/components/ui/categoryIcons";
import type { Category, ItemType } from "@/types";
import { BookOpen, Brain, Code2, FileText, Link2, LogOut, Menu, MessageSquare, Network, Plus, Settings, Terminal, X } from "lucide-react";

interface TypeFilter {
  type: ItemType | "all";
  label: string;
}

interface SidebarProps {
  activeType?: ItemType | "all";
  onTypeChange?: (type: ItemType | "all") => void;
  onNewItem?: () => void;
  categories?: Array<Category & { count: number }>;
  selectedCategoryId?: string | null;
  onCategoryChange?: (categoryId: string | null) => void;
  tags?: Array<{ label: string; count: number }>;
  selectedTag?: string | null;
  onTagChange?: (tag: string | null) => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

const typeFilters: TypeFilter[] = [
  { type: "all", label: "All" },
  { type: "prompt", label: "Prompt" },
  { type: "note", label: "Note" },
  { type: "link", label: "Link" },
  { type: "command", label: "Command" },
  { type: "snippet", label: "Snippet" },
];

function TypeIcon({ type }: { type: TypeFilter["type"] }) {
  if (type === "prompt") return <BookOpen className="size-4" aria-hidden="true" />;
  if (type === "note") return <FileText className="size-4" aria-hidden="true" />;
  if (type === "link") return <Link2 className="size-4" aria-hidden="true" />;
  if (type === "command") return <Terminal className="size-4" aria-hidden="true" />;
  if (type === "snippet") return <Code2 className="size-4" aria-hidden="true" />;
  return <Brain className="size-4" aria-hidden="true" />;
}

export function Sidebar({
  activeType = "all",
  onTypeChange,
  onNewItem,
  categories = [],
  selectedCategoryId = null,
  onCategoryChange,
  tags = [],
  selectedTag = null,
  onTagChange,
  hasActiveFilters = false,
  onClearFilters,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const isLibraryActive = pathname === "/library" || pathname.startsWith("/library/");
  const isBrainActive = pathname === "/brain" || pathname.startsWith("/brain/");
  const isChatActive = pathname === "/chat" || pathname.startsWith("/chat/");
  const isSettingsActive = pathname === "/settings" || pathname.startsWith("/settings/");

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
            <SidebarContent
              activeType={activeType}
              onTypeChange={onTypeChange}
              onNewItem={onNewItem}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onCategoryChange={onCategoryChange}
              tags={tags}
              selectedTag={selectedTag}
              onTagChange={onTagChange}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={onClearFilters}
              isBrainActive={isBrainActive}
              isChatActive={isChatActive}
              isLibraryActive={isLibraryActive}
              isSettingsActive={isSettingsActive}
              onAfterSelect={() => setIsOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <aside className="fixed inset-y-0 left-0 hidden w-[240px] border-r border-[#2A2D3E] bg-[#1A1D27] md:block">
        <div className="flex h-full flex-col p-4">
          <Brand />
          <SidebarContent
            activeType={activeType}
            onTypeChange={onTypeChange}
            onNewItem={onNewItem}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onCategoryChange={onCategoryChange}
            tags={tags}
            selectedTag={selectedTag}
            onTagChange={onTagChange}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={onClearFilters}
            isBrainActive={isBrainActive}
            isChatActive={isChatActive}
            isLibraryActive={isLibraryActive}
            isSettingsActive={isSettingsActive}
          />
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
  categories,
  selectedCategoryId,
  onCategoryChange,
  tags,
  selectedTag,
  onTagChange,
  hasActiveFilters,
  onClearFilters,
  isBrainActive,
  isChatActive,
  isLibraryActive,
  isSettingsActive,
  onAfterSelect,
}: SidebarProps & {
  isBrainActive: boolean;
  isChatActive: boolean;
  isLibraryActive: boolean;
  isSettingsActive: boolean;
  onAfterSelect?: () => void;
}) {
  const hasLibraryControls = Boolean(onTypeChange);

  return (
    <>
      {onNewItem ? (
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
      ) : null}

      <nav className={onNewItem ? "mt-4 grid gap-1" : "mt-6 grid gap-1"} aria-label="App navigation">
        <Link
          href="/library"
          onClick={() => onAfterSelect?.()}
          className={`flex w-full items-center gap-2 rounded-[4px] px-3 py-2 text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-amber-400 ${
            isLibraryActive ? "bg-[#21243A] text-[#FBBF24]" : "text-[#E2E8F0] hover:bg-[#21243A]"
          }`}
        >
          <BookOpen className="size-4" aria-hidden="true" />
          Library
        </Link>
        <Link
          href="/brain"
          onClick={() => onAfterSelect?.()}
          className={`flex w-full items-center gap-2 rounded-[4px] px-3 py-2 text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-amber-400 ${
            isBrainActive ? "bg-[#21243A] text-[#FBBF24]" : "text-[#64748B] hover:bg-[#21243A]"
          }`}
        >
          <Network className="size-4" aria-hidden="true" />
          Brain
        </Link>
        <Link
          href="/chat"
          onClick={() => onAfterSelect?.()}
          className={`flex w-full items-center gap-2 rounded-[4px] px-3 py-2 text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-amber-400 ${
            isChatActive ? "bg-[#21243A] text-[#FBBF24]" : "text-[#64748B] hover:bg-[#21243A]"
          }`}
        >
          <MessageSquare className="size-4" aria-hidden="true" />
          Chat
        </Link>
        <Link
          href="/settings"
          onClick={() => onAfterSelect?.()}
          className={`flex w-full items-center gap-2 rounded-[4px] px-3 py-2 text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-amber-400 ${
            isSettingsActive ? "bg-[#21243A] text-[#FBBF24]" : "text-[#64748B] hover:bg-[#21243A]"
          }`}
        >
          <Settings className="size-4" aria-hidden="true" />
          Settings
        </Link>
      </nav>

      {hasLibraryControls ? (
        <nav className="mt-6 space-y-1" aria-label="Library type filters">
          {typeFilters.map(({ type, label }) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                onTypeChange?.(type);
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
      ) : null}

      {hasLibraryControls && hasActiveFilters && onClearFilters ? (
        <button
          type="button"
          onClick={() => {
            onClearFilters();
            onAfterSelect?.();
          }}
          className="mt-3 inline-flex w-full items-center justify-center rounded-[4px] border border-[#F59E0B] px-3 py-2 text-sm font-medium text-[#FBBF24] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
        >
          Clear filters
        </button>
      ) : null}

      {hasLibraryControls ? (
        <section className="mt-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#64748B]">Categories</h2>
          <div className="space-y-1">
            {categories && categories.length > 0 ? categories.map((category) => {
              const CategoryIcon = getCategoryIcon(category.icon);

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    onCategoryChange?.(selectedCategoryId === category.id ? null : category.id);
                    onAfterSelect?.();
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-[4px] px-3 py-2 text-sm transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-amber-400 ${
                    selectedCategoryId === category.id ? "bg-[#21243A] text-[#FBBF24]" : "text-[#E2E8F0] hover:bg-[#21243A]"
                  }`}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <CategoryIcon className="size-4 shrink-0" style={{ color: category.color }} aria-hidden="true" />
                    <span className="truncate">{category.name}</span>
                  </span>
                  <span className="font-mono text-xs text-[#64748B]">{category.count}</span>
                </button>
              );
            }) : <p className="px-3 py-2 text-xs text-[#64748B]">No categories</p>}
          </div>
        </section>
      ) : null}

      {hasLibraryControls ? (
        <section className="mt-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#64748B]">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {tags && tags.length > 0 ? tags.slice(0, 12).map((tag) => (
              <button
                key={tag.label}
                type="button"
                onClick={() => {
                  onTagChange?.(selectedTag === tag.label ? null : tag.label);
                  onAfterSelect?.();
                }}
                className={`inline-flex max-w-full items-center gap-1 rounded-[4px] border px-2 py-1 text-xs font-medium transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-amber-400 ${
                  selectedTag === tag.label
                    ? "border-[#F59E0B] bg-[#F59E0B]/10 text-[#FBBF24]"
                    : "border-[#2A2D3E] bg-[#0F1117] text-[#64748B] hover:bg-[#21243A]"
                }`}
              >
                <span className="truncate">{tag.label}</span>
                <span className="font-mono">{tag.count}</span>
              </button>
            )) : <p className="px-3 py-2 text-xs text-[#64748B]">No tags</p>}
          </div>
        </section>
      ) : null}

      <div className="mt-auto grid gap-3 border-t border-[#2A2D3E] pt-4">
        <a
          href="/logout"
          className="inline-flex items-center justify-center gap-2 rounded-[4px] border border-[#2A2D3E] px-3 py-2 text-sm font-medium text-[#E2E8F0] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Log out
        </a>
        <p className="text-xs leading-5 text-[#64748B]">Signed-in library. Items are scoped to your Supabase user.</p>
      </div>
    </>
  );
}
