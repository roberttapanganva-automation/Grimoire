"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CopyButtonProps {
  content: string;
  itemId: string;
  initialCount: number;
}

function copyWithFallback(content: string) {
  const textarea = document.createElement("textarea");
  textarea.value = content;
  textarea.setAttribute("readonly", "");
  textarea.className = "fixed -left-[9999px] top-0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function CopyButton({ content, itemId, initialCount }: CopyButtonProps) {
  const [copyCount, setCopyCount] = useState(initialCount);
  const [isCopied, setIsCopied] = useState(false);

  async function handleCopy() {
    if (!content) {
      return;
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(content);
    } else {
      copyWithFallback(content);
    }

    setCopyCount((current) => current + 1);
    setIsCopied(true);
    window.setTimeout(() => setIsCopied(false), 1200);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      data-item-id={itemId}
      className="inline-flex items-center justify-center gap-2 rounded-[4px] border border-[#F59E0B] bg-amber-400 px-3 py-2 text-sm font-semibold text-[#0F1117] transition-colors duration-150 hover:bg-[#FBBF24] focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={!content}
      aria-label={isCopied ? "Copied item content" : "Copy item content"}
    >
      {isCopied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
      <span>{isCopied ? "Copied" : "Copy"}</span>
      <span className="font-mono text-xs">{copyCount}</span>
    </button>
  );
}
