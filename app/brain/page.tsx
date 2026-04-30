"use client";

import { ChangeEvent, DragEvent, FormEvent, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Eye, FileText, Loader2, Play, RotateCcw, Search, Trash2, UploadCloud, X } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { brainSchemaMissingMessage, validateDocumentFile } from "@/lib/documents";
import type { Document as BrainDocument, DocumentChunk, DocumentStatus } from "@/types";

type UploadState = "idle" | "selected" | "uploading" | "success" | "error";
type MessageTone = "neutral" | "success" | "error";
type BrainDocumentDetail = Pick<BrainDocument, "id" | "title" | "fileName" | "fileType" | "status" | "errorMessage" | "chunkCount" | "tags" | "createdAt">;

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

function validateClientFile(file: File) {
  const validation = validateDocumentFile(file);
  return "error" in validation ? validation.error : null;
}

function statusClassName(status: DocumentStatus) {
  if (status === "processing") {
    return "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#FBBF24]";
  }

  if (status === "error") {
    return "border-[#EF4444]/60 bg-[#EF4444]/10 text-[#FCA5A5]";
  }

  if (status === "uploading") {
    return "border-[#0EA5E9]/50 bg-[#0EA5E9]/10 text-[#7DD3FC]";
  }

  return "border-[#10B981]/40 bg-[#10B981]/10 text-[#86EFAC]";
}

function DocumentTags({ tags }: { tags: string[] }) {
  if (!tags.length) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {tags.slice(0, 5).map((tag) => (
        <span key={tag} className="inline-flex max-w-full rounded-[4px] border border-[#2A2D3E] bg-[#0F1117] px-2 py-0.5 text-xs text-[#94A3B8]">
          <span className="truncate">{tag}</span>
        </span>
      ))}
    </div>
  );
}

export default function BrainPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<BrainDocument[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [isBrainSetupRequired, setIsBrainSetupRequired] = useState(false);
  const [messageTone, setMessageTone] = useState<MessageTone>("neutral");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedDocumentId) ?? null,
    [documents, selectedDocumentId],
  );

  const loadDocuments = useCallback(async (options: { preserveStatus?: boolean } = {}) => {
    setIsLoading(true);
    if (!options.preserveStatus) {
      setStatusMessage(null);
    }
    setIsBrainSetupRequired(false);

    const response = await fetch("/api/documents", { cache: "no-store" });

    if (response.status === 401) {
      router.replace("/login?next=/brain");
      return;
    }

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string; detail?: string; setupRequired?: boolean } | null;
      const setupRequired = Boolean(result?.setupRequired);
      setIsBrainSetupRequired(setupRequired);
      setMessageTone("error");
      setStatusMessage(setupRequired ? brainSchemaMissingMessage : result?.detail ?? result?.error ?? "Could not load documents.");
      setDocuments([]);
      setIsLoading(false);
      return;
    }

    const result = (await response.json()) as { documents: BrainDocument[] };
    setDocuments(result.documents);
    setIsLoading(false);
  }, [router]);

  const loadDocumentDetail = useCallback(
    async (documentId: string) => {
      setIsLoadingChunks(true);
      const response = await fetch(`/api/documents/${documentId}`, { cache: "no-store" });

      if (response.status === 401) {
        router.replace("/login?next=/brain");
        return;
      }

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string; detail?: string; setupRequired?: boolean } | null;
        setIsBrainSetupRequired(Boolean(result?.setupRequired));
        setMessageTone("error");
        setStatusMessage(result?.setupRequired ? brainSchemaMissingMessage : result?.detail ?? result?.error ?? "Could not load document details.");
        setChunks([]);
        setIsLoadingChunks(false);
        if (response.status === 404) {
          setSelectedDocumentId(null);
        }
        return;
      }

      const result = (await response.json()) as { document: BrainDocumentDetail; chunks: DocumentChunk[] };
      setDocuments((current) => current.map((document) => (document.id === result.document.id ? { ...document, ...result.document } : document)));
      setChunks(result.chunks);
      setIsLoadingChunks(false);
    },
    [router],
  );

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    if (!selectedDocumentId) {
      setChunks([]);
      return;
    }

    void loadDocumentDetail(selectedDocumentId);
  }, [loadDocumentDetail, selectedDocumentId]);

  function chooseFile(file: File | null | undefined) {
    if (!file) {
      return;
    }

    if (isBrainSetupRequired) {
      setUploadState("error");
      setMessageTone("error");
      setStatusMessage(brainSchemaMissingMessage);
      return;
    }

    const error = validateClientFile(file);

    if (error) {
      setSelectedFile(null);
      setUploadState("error");
      setMessageTone("error");
      setStatusMessage(error);
      return;
    }

    setSelectedFile(file);
    setUploadState("selected");
    setMessageTone("neutral");
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

  function updateDocument(updatedDocument: BrainDocument) {
    setDocuments((current) => current.map((document) => (document.id === updatedDocument.id ? updatedDocument : document)));
  }

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setUploadState("error");
      setMessageTone("error");
      setStatusMessage("Choose a document before uploading.");
      return;
    }

    if (isBrainSetupRequired) {
      setUploadState("error");
      setMessageTone("error");
      setStatusMessage(brainSchemaMissingMessage);
      return;
    }

    setUploadState("uploading");
    setMessageTone("neutral");
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
      const result = (await response.json().catch(() => null)) as { error?: string; detail?: string; setupRequired?: boolean } | null;
      setIsBrainSetupRequired(Boolean(result?.setupRequired));
      setUploadState("error");
      setMessageTone("error");
      setStatusMessage(result?.setupRequired ? brainSchemaMissingMessage : result?.detail ?? result?.error ?? "Upload failed.");
      return;
    }

    const result = (await response.json()) as { document: BrainDocument };
    setDocuments((current) => [result.document, ...current]);
    setSelectedFile(null);
    setUploadState("success");
    setMessageTone("success");
    setStatusMessage("Document uploaded.");
  }

  async function processDocument(document: BrainDocument, event?: MouseEvent<HTMLButtonElement>) {
    event?.stopPropagation();

    if (isBrainSetupRequired) {
      setMessageTone("error");
      setStatusMessage(brainSchemaMissingMessage);
      return;
    }

    setProcessingId(document.id);
    setMessageTone("neutral");
    setIsBrainSetupRequired(false);
    setStatusMessage(`${document.title} is processing...`);
    updateDocument({ ...document, status: "processing", errorMessage: null });

    const response = await fetch("/api/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documentId: document.id }),
    });

    setProcessingId(null);

    if (response.status === 401) {
      router.replace("/login?next=/brain");
      return;
    }

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string; detail?: string; setupRequired?: boolean } | null;
      const errorMessage = result?.setupRequired ? brainSchemaMissingMessage : result?.error ?? result?.detail ?? "Could not process document.";
      setIsBrainSetupRequired(Boolean(result?.setupRequired));
      updateDocument({ ...document, status: "error", chunkCount: 0, errorMessage });
      setMessageTone("error");
      setStatusMessage(errorMessage);
      await loadDocuments({ preserveStatus: true });
      return;
    }

    const result = (await response.json()) as { document: BrainDocument };
    updateDocument(result.document);
    setMessageTone("success");
    setStatusMessage(`Processed ${result.document.chunkCount} chunks.`);
    await loadDocuments({ preserveStatus: true });

    if (selectedDocumentId === document.id) {
      await loadDocumentDetail(document.id);
    }
  }

  async function deleteDocument(document: BrainDocument, event?: MouseEvent<HTMLButtonElement>) {
    event?.stopPropagation();

    if (isBrainSetupRequired) {
      setMessageTone("error");
      setStatusMessage(brainSchemaMissingMessage);
      return;
    }


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

    const result = (await response.json().catch(() => null)) as { error?: string; detail?: string; setupRequired?: boolean; warning?: string | null } | null;

    if (!response.ok) {
      setIsBrainSetupRequired(Boolean(result?.setupRequired));
      setMessageTone("error");
      setStatusMessage(result?.setupRequired ? brainSchemaMissingMessage : result?.detail ?? result?.error ?? "Could not delete document.");
      return;
    }

    setDocuments((current) => current.filter((currentDocument) => currentDocument.id !== document.id));
    setSelectedDocumentId((current) => (current === document.id ? null : current));
    setChunks((current) => (selectedDocumentId === document.id ? [] : current));
    setMessageTone(result?.warning ? "error" : "success");
    setStatusMessage(result?.warning ?? "Document deleted.");
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0F1117] font-sans text-[#E2E8F0]">
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
                messageTone === "error"
                  ? "border-[#EF4444]/60 bg-[#1A1D27] text-[#FCA5A5]"
                  : "border-[#2A2D3E] bg-[#1A1D27] text-[#FBBF24]"
              }`}
              role="status"
            >
              {messageTone === "error" ? <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
              <span>{statusMessage}</span>
            </div>
          ) : null}

          {isBrainSetupRequired ? (
            <section className="rounded-[6px] border border-[#EF4444]/60 bg-[#1A1D27] p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-[#FCA5A5]" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold text-[#FCA5A5]">Brain database setup required</h2>
                  <p className="mt-2 text-sm leading-6 text-[#E2E8F0]">
                    Brain database tables are missing. Run <span className="font-mono text-[#FBBF24]">supabase/brain_schema.sql</span> in Supabase SQL Editor, then refresh.
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-[6px] border border-[#2A2D3E] bg-[#1A1D27] p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[#E2E8F0]">Upload document</h2>
              <p className="mt-1 text-sm text-[#64748B]">TXT only for MVP. PDF and Markdown support will be added later. Maximum size is 10MB.</p>
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
                className={`grid min-h-[160px] place-items-center rounded-[6px] border border-dashed p-6 text-center transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-amber-400 ${
                  isBrainSetupRequired
                    ? "cursor-not-allowed border-[#2A2D3E] bg-[#0F1117] opacity-70"
                    : isDragging
                      ? "cursor-pointer border-[#F59E0B] bg-[#21243A]"
                      : "cursor-pointer border-[#2A2D3E] bg-[#0F1117] hover:bg-[#21243A]"
                }`}
                aria-label="Choose or drop a document"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,text/plain"
                  onChange={handleFileInputChange}
                  className="sr-only"
                  disabled={isBrainSetupRequired}
                />
                <div className="grid max-w-[520px] gap-3">
                  <span className="mx-auto flex size-12 items-center justify-center rounded-[6px] border border-[#2A2D3E] text-amber-400">
                    <UploadCloud className="size-6" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="break-words text-sm font-semibold text-[#E2E8F0]">{selectedFile ? selectedFile.name : "Drop a document here or click to choose"}</p>
                    <p className="mt-1 text-xs text-[#64748B]">
                      {selectedFile ? `${formatBytes(selectedFile.size)} selected` : "Files are uploaded privately to the documents storage bucket."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
                <button
                  type="submit"
                  disabled={!selectedFile || uploadState === "uploading" || isBrainSetupRequired}
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
              <div className="min-w-[980px]">
                <div className="grid grid-cols-[minmax(220px,1.8fr)_90px_110px_120px_90px_130px_240px] gap-3 border-b border-[#2A2D3E] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  <span>Title</span>
                  <span>Type</span>
                  <span>Size</span>
                  <span>Status</span>
                  <span>Chunks</span>
                  <span>Created</span>
                  <span className="text-right">Actions</span>
                </div>

                {isLoading ? (
                  <div className="flex min-h-[220px] items-center justify-center gap-2 px-5 py-10 text-sm text-[#64748B]">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Loading documents...
                  </div>
                ) : documents.length > 0 ? (
                  documents.map((document) => {
                    const isProcessing = processingId === document.id || document.status === "processing";
                    const processLabel = document.chunkCount > 0 ? "Reprocess" : "Process";

                    return (
                      <button
                        key={document.id}
                        type="button"
                        onClick={() => setSelectedDocumentId(document.id)}
                        className={`grid w-full grid-cols-[minmax(220px,1.8fr)_90px_110px_120px_90px_130px_240px] gap-3 border-b border-[#2A2D3E] px-5 py-4 text-left text-sm transition-colors duration-150 last:border-b-0 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400 ${
                          selectedDocumentId === document.id ? "bg-[#21243A]" : ""
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-[4px] border border-[#2A2D3E] bg-[#0F1117] text-amber-400">
                            <FileText className="size-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-[#E2E8F0]">{document.title}</span>
                            <span className="mt-1 block truncate font-mono text-xs text-[#64748B]">{document.fileName}</span>
                            <DocumentTags tags={document.tags} />
                          </span>
                        </span>
                        <span className="self-center font-mono text-xs uppercase text-[#E2E8F0]">{document.fileType}</span>
                        <span className="self-center font-mono text-xs text-[#64748B]">{formatBytes(document.fileSize)}</span>
                        <span className="self-center">
                          <span className={`inline-flex rounded-[4px] border px-2 py-1 text-xs font-medium ${statusClassName(document.status)}`}>
                            {document.status}
                          </span>
                        </span>
                        <span className="self-center font-mono text-xs text-[#E2E8F0]">{document.chunkCount}</span>
                        <span className="self-center text-xs text-[#64748B]">{formatDate(document.createdAt)}</span>
                        <span className="flex items-center justify-end gap-2">
                          <span className="inline-flex items-center justify-center gap-2 rounded-[4px] border border-[#2A2D3E] px-3 py-2 text-sm font-medium text-[#E2E8F0] transition-colors duration-150 hover:bg-[#21243A]">
                            <Eye className="size-4" aria-hidden="true" />
                            Preview
                          </span>
                          <button
                            type="button"
                            onClick={(event) => void processDocument(document, event)}
                            disabled={isProcessing || isBrainSetupRequired}
                            className="inline-flex items-center justify-center gap-2 rounded-[4px] border border-[#2A2D3E] px-3 py-2 text-sm font-medium text-[#E2E8F0] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isProcessing ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : document.chunkCount > 0 ? <RotateCcw className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
                            {isProcessing ? "Processing" : processLabel}
                          </button>
                          <button
                            type="button"
                            onClick={(event) => void deleteDocument(document, event)}
                            disabled={deletingId === document.id}
                            className="inline-flex items-center justify-center rounded-[4px] border border-[#EF4444]/60 px-2 py-2 text-[#FCA5A5] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label={`Delete ${document.title}`}
                          >
                            {deletingId === document.id ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}
                          </button>
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="flex min-h-[220px] flex-col items-center justify-center px-5 py-10 text-center text-sm text-[#64748B]">
                    <FileText className="mb-3 size-8 text-[#374151]" aria-hidden="true" />
                    <p className="font-medium text-[#E2E8F0]">No documents yet.</p>
                    <p className="mt-1">Upload a TXT file to start building your Brain library.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>

      {selectedDocument ? (
        <ChunkPreviewPanel
          chunks={chunks}
          document={selectedDocument}
          isLoading={isLoadingChunks}
          isProcessing={processingId === selectedDocument.id || selectedDocument.status === "processing"}
          onClose={() => setSelectedDocumentId(null)}
          onDelete={(event) => void deleteDocument(selectedDocument, event)}
          onProcess={(event) => void processDocument(selectedDocument, event)}
        />
      ) : null}
    </div>
  );
}

function ChunkPreviewPanel({
  chunks,
  document,
  isLoading,
  isProcessing,
  onClose,
  onDelete,
  onProcess,
}: {
  chunks: DocumentChunk[];
  document: BrainDocument;
  isLoading: boolean;
  isProcessing: boolean;
  onClose: () => void;
  onDelete: (event: MouseEvent<HTMLButtonElement>) => void;
  onProcess: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const processLabel = document.chunkCount > 0 ? "Reprocess" : "Process";
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedChunkIds, setExpandedChunkIds] = useState<Set<string>>(new Set());
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredChunks = useMemo(() => {
    if (!normalizedSearchQuery) {
      return chunks;
    }

    return chunks.filter((chunk) => chunk.content.toLowerCase().includes(normalizedSearchQuery));
  }, [chunks, normalizedSearchQuery]);

  function toggleChunk(chunkId: string) {
    setExpandedChunkIds((current) => {
      const next = new Set(current);

      if (next.has(chunkId)) {
        next.delete(chunkId);
      } else {
        next.add(chunkId);
      }

      return next;
    });
  }

  return (
    <aside className="fixed inset-0 z-40 flex bg-[#0F1117]/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="ml-auto flex h-full w-full max-w-[520px] flex-col border-l border-[#2A2D3E] bg-[#1A1D27]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="border-b border-[#2A2D3E] p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <span className={`inline-flex rounded-[4px] border px-2 py-1 text-xs font-medium ${statusClassName(document.status)}`}>
              {document.status}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-9 items-center justify-center rounded-[4px] border border-[#2A2D3E] text-[#64748B] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
              aria-label="Close chunk preview"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <h2 className="break-words text-xl font-semibold leading-7 text-[#E2E8F0]">{document.title}</h2>
          <DocumentTags tags={document.tags} />
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-[#64748B]">
            <div className="col-span-2">
              <dt>File</dt>
              <dd className="mt-1 break-words font-mono text-[#E2E8F0]">{document.fileName}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd className="mt-1 font-mono uppercase text-[#E2E8F0]">{document.fileType}</dd>
            </div>
            <div>
              <dt>Chunks</dt>
              <dd className="mt-1 font-mono text-[#E2E8F0]">{document.chunkCount}</dd>
            </div>
            <div className="col-span-2">
              <dt>Created</dt>
              <dd className="mt-1 text-[#E2E8F0]">{formatDate(document.createdAt)}</dd>
            </div>
          </dl>
          {document.status === "error" ? (
            <div className="mt-4 rounded-[6px] border border-[#EF4444]/60 bg-[#0F1117] p-3 text-sm text-[#FCA5A5]">
              {document.errorMessage ?? "This document could not be processed. Try reprocessing after confirming the file contains readable text."}
            </div>
          ) : null}
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <label className="mb-4 block">
            <span className="sr-only">Search inside this document</span>
            <span className="flex items-center gap-2 rounded-[6px] border border-[#2A2D3E] bg-[#0F1117] px-3 py-2 text-sm text-[#E2E8F0] focus-within:ring-1 focus-within:ring-amber-400">
              <Search className="size-4 shrink-0 text-[#64748B]" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search inside this document..."
                className="min-w-0 flex-1 bg-transparent text-sm text-[#E2E8F0] placeholder:text-[#64748B] focus:outline-none"
              />
            </span>
          </label>

          {isProcessing ? (
            <div className="flex min-h-[160px] items-center justify-center gap-2 rounded-[6px] border border-[#2A2D3E] bg-[#0F1117] text-sm text-[#64748B]">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Processing chunks...
            </div>
          ) : isLoading ? (
            <div className="flex min-h-[160px] items-center justify-center gap-2 rounded-[6px] border border-[#2A2D3E] bg-[#0F1117] text-sm text-[#64748B]">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading chunks...
            </div>
          ) : chunks.length > 0 && filteredChunks.length > 0 ? (
            <div className="grid gap-3">
              {filteredChunks.map((chunk) => {
                const isExpanded = expandedChunkIds.has(chunk.id);

                return (
                <article key={chunk.id} className="rounded-[6px] border border-[#2A2D3E] bg-[#0F1117] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleChunk(chunk.id)}
                      className="inline-flex min-w-0 items-center gap-2 rounded-[4px] text-left text-xs font-semibold text-[#E2E8F0] transition-colors duration-150 hover:text-[#FBBF24] focus:outline-none focus:ring-1 focus:ring-amber-400"
                    >
                      {isExpanded ? <ChevronDown className="size-4 shrink-0" aria-hidden="true" /> : <ChevronRight className="size-4 shrink-0" aria-hidden="true" />}
                      <span>Chunk {chunk.chunkIndex + 1}</span>
                    </button>
                    <span className="shrink-0 font-mono text-xs text-[#64748B]">{chunk.tokenCount} words</span>
                  </div>
                  <p className={`${isExpanded ? "" : "line-clamp-5"} whitespace-pre-wrap font-mono text-xs leading-5 text-[#CBD5E1]`}>
                    {chunk.content}
                  </p>
                </article>
                );
              })}
            </div>
          ) : chunks.length > 0 ? (
            <div className="rounded-[6px] border border-[#2A2D3E] bg-[#0F1117] p-6 text-center text-sm text-[#64748B]">
              No chunks match that search.
            </div>
          ) : document.status === "uploading" ? (
            <div className="rounded-[6px] border border-[#2A2D3E] bg-[#0F1117] p-6 text-center text-sm text-[#64748B]">No chunks yet.</div>
          ) : (
            <div className="rounded-[6px] border border-[#2A2D3E] bg-[#0F1117] p-6 text-center text-sm text-[#64748B]">No chunk rows were found. Reprocess this document.</div>
          )}
        </div>

        <footer className="border-t border-[#2A2D3E] p-5">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <button
              type="button"
              onClick={onProcess}
              disabled={isProcessing}
              className="inline-flex items-center justify-center gap-2 rounded-[4px] bg-amber-400 px-3 py-2 text-sm font-semibold text-[#0F1117] transition-colors duration-150 hover:bg-[#FBBF24] focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isProcessing ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : document.chunkCount > 0 ? <RotateCcw className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
              {isProcessing ? "Processing" : processLabel}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center justify-center rounded-[4px] border border-[#EF4444]/60 px-3 py-2 text-[#FCA5A5] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400"
              aria-label={`Delete ${document.title}`}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        </footer>
      </div>
    </aside>
  );
}
