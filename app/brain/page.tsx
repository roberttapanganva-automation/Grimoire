"use client";

import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, FileText, Loader2, Trash2, UploadCloud } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { allowedDocumentFileTypes, maxDocumentFileSize } from "@/lib/documents";
import type { Document as BrainDocument } from "@/types";

type UploadState = "idle" | "selected" | "uploading" | "success" | "error";

function formatBytes(bytes: number) {
  if (bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.trim().toLowerCase() ?? "";
}

function validateClientFile(file: File) {
  const extension = getFileExtension(file.name);

  if (!allowedDocumentFileTypes.includes(extension as (typeof allowedDocumentFileTypes)[number])) {
    return "Unsupported file type. Upload a PDF, TXT, or MD file.";
  }

  if (file.size > maxDocumentFileSize) {
    return "File is too large. Upload a file that is 10MB or smaller.";
  }

  if (file.size <= 0) {
    return "File is empty.";
  }

  return null;
}

export default function BrainPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<BrainDocument[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDocuments() {
      setIsLoading(true);
      setStatusMessage(null);

      const response = await fetch("/api/documents", { cache: "no-store" });

      if (response.status === 401) {
        router.replace("/login?next=/brain");
        return;
      }

      if (!response.ok) {
        if (isMounted) {
          const result = (await response.json().catch(() => null)) as { error?: string; detail?: string } | null;
          setStatusMessage(result?.detail ?? result?.error ?? "Could not load documents.");
          setDocuments([]);
          setIsLoading(false);
        }
        return;
      }

      const result = (await response.json()) as { documents: BrainDocument[] };

      if (isMounted) {
        setDocuments(result.documents);
        setIsLoading(false);
      }
    }

    void loadDocuments();

    return () => {
      isMounted = false;
    };
  }, [router]);

  function chooseFile(file: File | null | undefined) {
    if (!file) {
      return;
    }

    const error = validateClientFile(file);

    if (error) {
      setSelectedFile(null);
      setUploadState("error");
      setStatusMessage(error);
      return;
    }

    setSelectedFile(file);
    setUploadState("selected");
    setStatusMessage(`${file.name} selected.`);
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    chooseFile(event.dataTransfer.files?.[0]);
  }

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setUploadState("error");
      setStatusMessage("Choose a document before uploading.");
      return;
    }

    setUploadState("uploading");
    setStatusMessage("Uploading document...");

    const formData = new FormData();
    formData.append("file", selectedFile);

    const response = await fetch("/api/documents", {
      method: "POST",
      body: formData,
    });

    if (response.status === 401) {
      router.replace("/login?next=/brain");
      return;
    }

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string; detail?: string } | null;
      setUploadState("error");
      setStatusMessage(result?.detail ?? result?.error ?? "Upload failed.");
      return;
    }

    const result = (await response.json()) as { document: BrainDocument };
    setDocuments((current) => [result.document, ...current]);
    setSelectedFile(null);
    setUploadState("success");
    setStatusMessage("Document uploaded.");
  }

  async function deleteDocument(document: BrainDocument) {
    if (!window.confirm(`Delete "${document.title}"?`)) {
      return;
    }

    setDeletingId(document.id);
    setStatusMessage(null);

    const response = await fetch(`/api/documents/${document.id}`, {
      method: "DELETE",
    });

    setDeletingId(null);

    if (response.status === 401) {
      router.replace("/login?next=/brain");
      return;
    }

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string; detail?: string } | null;
      setStatusMessage(result?.detail ?? result?.error ?? "Could not delete document.");
      return;
    }

    setDocuments((current) => current.filter((currentDocument) => currentDocument.id !== document.id));
    setStatusMessage("Document deleted.");
  }

  return (
    <div className="min-h-screen bg-[#0F1117] font-sans text-[#E2E8F0]">
      <Sidebar />

      <div className="md:pl-[240px]">
        <main className="mx-auto grid w-full max-w-[1180px] gap-6 p-4 md:p-6">
          <header className="border-b border-[#2A2D3E] pb-5">
            <h1 className="text-2xl font-semibold text-[#E2E8F0]">Brain</h1>
            <p className="mt-1 text-sm text-[#64748B]">Documents saved for your second brain.</p>
          </header>

          {statusMessage ? (
            <div
              className={`flex items-start gap-3 rounded-[6px] border px-4 py-3 text-sm ${
                uploadState === "error"
                  ? "border-[#EF4444]/60 bg-[#1A1D27] text-[#FCA5A5]"
                  : "border-[#2A2D3E] bg-[#1A1D27] text-[#FBBF24]"
              }`}
              role="status"
            >
              {uploadState === "error" ? <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
              <span>{statusMessage}</span>
            </div>
          ) : null}

          <section className="rounded-[6px] border border-[#2A2D3E] bg-[#1A1D27] p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[#E2E8F0]">Upload document</h2>
              <p className="mt-1 text-sm text-[#64748B]">PDF, TXT, or MD. Maximum size is 10MB.</p>
            </div>

            <form onSubmit={uploadDocument} className="grid gap-4">
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`grid min-h-[160px] cursor-pointer place-items-center rounded-[6px] border border-dashed p-6 text-center transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-amber-400 ${
                  isDragging ? "border-[#F59E0B] bg-[#21243A]" : "border-[#2A2D3E] bg-[#0F1117] hover:bg-[#21243A]"
                }`}
                aria-label="Choose or drop a document"
              >
                <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown" onChange={handleFileInputChange} className="sr-only" />
                <div className="grid max-w-[520px] gap-3">
                  <span className="mx-auto flex size-12 items-center justify-center rounded-[6px] border border-[#2A2D3E] text-amber-400">
                    <UploadCloud className="size-6" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#E2E8F0]">{selectedFile ? selectedFile.name : "Drop a document here or click to choose"}</p>
                    <p className="mt-1 text-xs text-[#64748B]">
                      {selectedFile ? `${formatBytes(selectedFile.size)} selected` : "Files are uploaded privately to the documents storage bucket."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-xs text-[#64748B]">
                  Status: <span className="font-mono text-[#E2E8F0]">{uploadState}</span>
                </p>
                <button
                  type="submit"
                  disabled={!selectedFile || uploadState === "uploading"}
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex items-center justify-center gap-2 rounded-[4px] bg-amber-400 px-3 py-2 text-sm font-semibold text-[#0F1117] transition-colors duration-150 hover:bg-[#FBBF24] focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploadState === "uploading" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <UploadCloud className="size-4" aria-hidden="true" />}
                  {uploadState === "uploading" ? "Uploading" : "Upload"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-[6px] border border-[#2A2D3E] bg-[#1A1D27]">
            <div className="flex flex-col gap-2 border-b border-[#2A2D3E] p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#E2E8F0]">Documents</h2>
                <p className="mt-1 text-sm text-[#64748B]">{documents.length} uploaded document{documents.length === 1 ? "" : "s"}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-[minmax(220px,1.8fr)_100px_120px_120px_140px_100px] gap-3 border-b border-[#2A2D3E] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  <span>Title</span>
                  <span>File type</span>
                  <span>File size</span>
                  <span>Status</span>
                  <span>Created</span>
                  <span className="text-right">Actions</span>
                </div>

                {isLoading ? (
                  <div className="flex min-h-[220px] items-center justify-center gap-2 px-5 py-10 text-sm text-[#64748B]">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Loading documents...
                  </div>
                ) : documents.length > 0 ? (
                  documents.map((document) => (
                    <div
                      key={document.id}
                      className="grid grid-cols-[minmax(220px,1.8fr)_100px_120px_120px_140px_100px] gap-3 border-b border-[#2A2D3E] px-5 py-4 text-sm last:border-b-0 hover:bg-[#21243A]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-[4px] border border-[#2A2D3E] bg-[#0F1117] text-amber-400">
                          <FileText className="size-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-[#E2E8F0]">{document.title}</p>
                          <p className="mt-1 truncate font-mono text-xs text-[#64748B]">{document.fileName}</p>
                        </div>
                      </div>
                      <span className="self-center font-mono text-xs uppercase text-[#E2E8F0]">{document.fileType}</span>
                      <span className="self-center font-mono text-xs text-[#64748B]">{formatBytes(document.fileSize)}</span>
                      <span className="self-center">
                        <span className="inline-flex rounded-[4px] border border-[#10B981]/40 bg-[#10B981]/10 px-2 py-1 text-xs font-medium text-[#86EFAC]">
                          {document.status}
                        </span>
                      </span>
                      <span className="self-center text-xs text-[#64748B]">{formatDate(document.createdAt)}</span>
                      <span className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => void deleteDocument(document)}
                          disabled={deletingId === document.id}
                          className="inline-flex items-center justify-center gap-2 rounded-[4px] border border-[#EF4444]/60 px-3 py-2 text-sm font-medium text-[#FCA5A5] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === document.id ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}
                          Delete
                        </button>
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex min-h-[220px] flex-col items-center justify-center px-5 py-10 text-center text-sm text-[#64748B]">
                    <FileText className="mb-3 size-8 text-[#374151]" aria-hidden="true" />
                    <p className="font-medium text-[#E2E8F0]">No documents yet.</p>
                    <p className="mt-1">Upload a PDF, TXT, or MD file to start building your Brain library.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
