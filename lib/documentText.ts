import "server-only";
import { PDFParse } from "pdf-parse";
import type { DocumentFileType } from "@/types";

function normalizeExtractedText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

async function extractPdfText(arrayBuffer: ArrayBuffer) {
  const parser = new PDFParse({ data: Buffer.from(arrayBuffer) });

  try {
    const result = await parser.getText();
    return result.text;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown PDF parser error.";
    throw new Error(`PDF text extraction failed: ${message}`);
  } finally {
    await parser.destroy();
  }
}

export async function extractTextFromDocument(fileType: DocumentFileType, blob: Blob) {
  const rawText = fileType === "pdf" ? await extractPdfText(await blob.arrayBuffer()) : await blob.text();
  const text = normalizeExtractedText(rawText);

  if (!text) {
    throw new Error("No readable text found in this document.");
  }

  return text;
}
