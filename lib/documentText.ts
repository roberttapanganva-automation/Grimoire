import "server-only";
import type { DocumentFileType } from "@/types";
import { extractDocumentText, scannedPdfMessage } from "@/lib/server/extractDocumentText";

export { scannedPdfMessage };

export async function extractTextFromDocument(fileType: DocumentFileType, blob: Blob) {
  return extractDocumentText({ data: blob, fileType });
}
