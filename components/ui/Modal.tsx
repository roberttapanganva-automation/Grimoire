"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

export function Modal({ isOpen, title, children, onClose }: ModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F1117]/80 px-4 py-6">
      <section className="flex max-h-[calc(100vh-48px)] w-[calc(100%-32px)] max-w-[560px] flex-col overflow-hidden rounded-[8px] border border-[#2A2D3E] bg-[#1A1D27] shadow-2xl">
        <header className="flex items-center justify-between gap-4 border-b border-[#2A2D3E] px-5 py-4">
          <h2 className="text-lg font-semibold text-[#E2E8F0]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-[4px] border border-[#2A2D3E] text-[#64748B] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
            aria-label="Close modal"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
