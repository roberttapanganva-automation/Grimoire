import type { Document, DocumentFileType, DocumentStatus } from "@/types";

export const allowedDocumentFileTypes: DocumentFileType[] = ["pdf", "txt", "md"];
export const maxDocumentFileSize = 10 * 1024 * 1024;
export const brainSchemaMissingMessage =
  "Brain database tables are missing. Run supabase/brain_schema.sql in Supabase SQL Editor, then refresh.";
export const storageRlsMessage =
  "Storage upload blocked by RLS. Expected file path format is userId/documentId/fileName.";

export interface DbDocumentRow {
  id: string;
  user_id: string;
  title: string;
  file_name: string;
  file_path: string;
  file_type: DocumentFileType;
  file_size: number | null;
  source_url: string | null;
  status: DocumentStatus | null;
  error_message: string | null;
  chunk_count: number | null;
  category_id: string | null;
  tags: string[] | null;
  created_at: string;
}

export interface DbDocumentChunkRow {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  token_count: number | null;
  created_at: string;
}

export function isDocumentFileType(value: unknown): value is DocumentFileType {
  return typeof value === "string" && allowedDocumentFileTypes.includes(value.toLowerCase() as DocumentFileType);
}

export function mapDbDocumentToDocument(row: DbDocumentRow): Document {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    fileName: row.file_name,
    filePath: row.file_path,
    fileType: row.file_type,
    fileSize: row.file_size ?? 0,
    sourceUrl: row.source_url,
    status: row.status ?? "ready",
    errorMessage: row.error_message ?? null,
    chunkCount: row.chunk_count ?? 0,
    categoryId: row.category_id,
    tags: row.tags ?? [],
    createdAt: row.created_at,
  };
}

export function mapDbDocumentChunkToChunk(row: DbDocumentChunkRow) {
  return {
    id: row.id,
    documentId: row.document_id,
    content: row.content,
    chunkIndex: row.chunk_index,
    tokenCount: row.token_count ?? 0,
    createdAt: row.created_at,
  };
}

export function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.trim().toLowerCase() ?? "";
  return extension;
}

export function getTitleFromFileName(fileName: string) {
  const trimmed = fileName.trim();
  const extension = getFileExtension(trimmed);

  if (!extension) {
    return trimmed || "Untitled document";
  }

  return trimmed.slice(0, Math.max(0, trimmed.length - extension.length - 1)) || "Untitled document";
}

export function getSafeFileName(fileName: string) {
  const safeName = fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return safeName || "document";
}

export function validateDocumentFile(file: File): { fileType: DocumentFileType } | { error: string } {
  const extension = getFileExtension(file.name);

  if (!isDocumentFileType(extension)) {
    return { error: "Unsupported file type. Upload a PDF, TXT, or MD file." };
  }

  if (file.size > maxDocumentFileSize) {
    return { error: "File is too large. Upload a file that is 10MB or smaller." };
  }

  if (file.size <= 0) {
    return { error: "File is empty." };
  }

  return { fileType: extension };
}

export function isMissingBrainSchemaError(error: { code?: string; message?: string; details?: string } | null | undefined) {
  const text = `${error?.code ?? ""} ${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();
  return text.includes("could not find the table") || text.includes("schema cache") || text.includes("relation") && text.includes("does not exist");
}

export function isStorageRlsError(error: { code?: string; message?: string; details?: string } | null | undefined) {
  const text = `${error?.code ?? ""} ${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();
  return text.includes("row-level security") || text.includes("violates row-level security policy") || text.includes("rls");
}
