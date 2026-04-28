"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CopyButtonProps {
  content: string;
  itemId: string;
  initialCount: number;
}

function fallbackCopy(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.className = "fixed -left-[9999px] top-0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function CopyButton({ content, itemId, initialCount }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [count, setCount] = useState(initialCount);

  async function handleCopy() {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(content);
    } else {
      fallbackCopy(content);
    }

    setCopied(true);
    setCount((current) => current + 1);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      data-item-id={itemId}
      className="inline-flex items-center justify-center gap-2 rounded-[4px] border border-[#F59E0B]/70 bg-[#F59E0B] px-3 py-2 text-sm font-semibold text-[#0F1117] transition-colors duration-150 hover:bg-[#FBBF24] focus:outline-none focus:ring-1 focus:ring-amber-400"
      aria-label={copied ? "Copied" : "Copy content"}
    >
      {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
      <span>{copied ? "Copied" : "Copy"}</span>
      <span className="font-mono text-xs">{count}</span>
    </button>
  );
}
